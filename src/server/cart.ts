"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { verifiedUserId } from "@/lib/auth-guards";
import { computeQuote, type CouponInput, type QuoteLine } from "@/lib/promotions";
import { toNumber } from "@/lib/format";
import type { PaymentMethod, PromoType } from "@/lib/enums";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { sendOrderConfirmation } from "@/lib/mail";
import { notify } from "@/lib/notify";
import { createStripeCheckout, stripeEnabled } from "@/lib/payments/stripe";

/**
 * Server-side cart pricing & order placement. Client sends variant ids +
 * quantities ONLY — prices, stock, promos, shipping and totals are always
 * recomputed here from the DB (§6 Security: never trust client prices).
 */

const itemsSchema = z
  .array(z.object({ variantId: z.string().min(1), quantity: z.number().int().min(1).max(99) }))
  .max(50);

export type QuotedLine = {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  colorName: string;
  size: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  maxStock: number;
};

export type CartQuote = {
  lines: QuotedLine[];
  subtotal: number;
  discounts: { label: string; amount: number }[];
  discountTotal: number;
  shippingTotal: number | null; // null = not yet known (no zone chosen)
  freeShipping: boolean;
  codFee: number;
  grandTotal: number;
  couponError: string | null;
  currency: string;
  /** Variant ids that were clamped/removed due to stock changes. */
  adjusted: string[];
};

async function loadPricingContext() {
  const [settings, rules, collections] = await Promise.all([
    db.storeSettings.findUnique({ where: { id: 1 } }),
    db.promoRule.findMany({ where: { isActive: true } }),
    db.collection.findMany({
      where: { isActive: true },
      select: { slug: true, products: { select: { productId: true } } },
    }),
  ]);
  const collectionsByProduct = new Map<string, string[]>();
  for (const c of collections) {
    for (const p of c.products) {
      const list = collectionsByProduct.get(p.productId) ?? [];
      list.push(c.slug);
      collectionsByProduct.set(p.productId, list);
    }
  }
  return {
    settings,
    rules: rules.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type as PromoType,
      config: r.config,
      priority: r.priority,
    })),
    collectionsByProduct,
  };
}

async function resolveLines(items: { variantId: string; quantity: number }[]) {
  const variants = await db.variant.findMany({
    where: { id: { in: items.map((i) => i.variantId) }, isActive: true },
    include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } } },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));
  const lines: QuotedLine[] = [];
  const adjusted: string[] = [];
  for (const item of items) {
    const v = byId.get(item.variantId);
    if (!v || v.product.status !== "ACTIVE" || v.stock <= 0) {
      adjusted.push(item.variantId);
      continue;
    }
    const quantity = Math.min(item.quantity, v.stock);
    if (quantity !== item.quantity) adjusted.push(item.variantId);
    const unitPrice = toNumber(v.price ?? v.product.basePrice);
    lines.push({
      variantId: v.id,
      productId: v.productId,
      slug: v.product.slug,
      name: v.product.name,
      colorName: v.colorName,
      size: v.size,
      imageUrl: v.product.images[0]?.url ?? null,
      unitPrice,
      quantity,
      lineTotal: unitPrice * quantity,
      maxStock: v.stock,
    });
  }
  return { lines, adjusted };
}

async function loadCoupon(code: string | undefined | null): Promise<CouponInput | null> {
  if (!code) return null;
  const coupon = await db.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!coupon) {
    // Represent "unknown code" as an inactive coupon so the quote reports it.
    return {
      code: code.trim().toUpperCase(),
      type: "PERCENT",
      value: 0,
      minSubtotal: null,
      maxUses: null,
      usedCount: 0,
      startsAt: new Date(0),
      endsAt: new Date(0),
      isActive: false,
      appliesTo: "ALL",
      targetIds: [],
    };
  }
  return {
    code: coupon.code,
    type: coupon.type as CouponInput["type"],
    value: toNumber(coupon.value),
    minSubtotal: coupon.minSubtotal ? toNumber(coupon.minSubtotal) : null,
    maxUses: coupon.maxUses,
    usedCount: coupon.usedCount,
    startsAt: coupon.startsAt,
    endsAt: coupon.endsAt,
    isActive: coupon.isActive,
    appliesTo: coupon.appliesTo as CouponInput["appliesTo"],
    targetIds: (coupon.targetIds as string[]) ?? [],
  };
}

async function matchZone(city: string | null) {
  const zones = await db.shippingZone.findMany({ where: { isActive: true } });
  if (!zones.length) return null;
  if (city) {
    const exact = zones.find((z) => (z.cities as string[]).some((c) => c.toLowerCase() === city.toLowerCase()));
    if (exact) return exact;
  }
  // Fallback: the catch-all zone (empty cities list), else the first.
  return zones.find((z) => ((z.cities as string[]) ?? []).length === 0) ?? zones[0];
}

export async function quoteCart(input: {
  items: { variantId: string; quantity: number }[];
  couponCode?: string | null;
  paymentMethod?: PaymentMethod;
  city?: string | null;
  includeShipping?: boolean;
}): Promise<CartQuote> {
  const items = itemsSchema.parse(input.items);
  const paymentMethod: PaymentMethod = input.paymentMethod === "CARD" ? "CARD" : "COD";
  const [{ settings, rules, collectionsByProduct }, { lines, adjusted }, coupon] =
    await Promise.all([loadPricingContext(), resolveLines(items), loadCoupon(input.couponCode)]);

  const zone = input.includeShipping ? await matchZone(input.city ?? null) : null;

  const quoteLines: QuoteLine[] = lines.map((l) => ({
    variantId: l.variantId,
    productId: l.productId,
    categoryId: "", // filled below
    unitPrice: l.unitPrice,
    quantity: l.quantity,
    collectionSlugs: collectionsByProduct.get(l.productId) ?? [],
  }));
  // category ids for scoped coupons
  if (coupon && coupon.appliesTo === "CATEGORY") {
    const products = await db.product.findMany({
      where: { id: { in: lines.map((l) => l.productId) } },
      select: { id: true, categoryId: true },
    });
    const catByProduct = new Map(products.map((p) => [p.id, p.categoryId]));
    for (const ql of quoteLines) ql.categoryId = catByProduct.get(ql.productId) ?? "";
  }

  const quote = computeQuote({
    lines: quoteLines,
    rules,
    coupon,
    paymentMethod,
    shippingRate: zone ? toNumber(zone.rate) : undefined,
    zoneFreeOver: zone?.freeOver ? toNumber(zone.freeOver) : null,
    codFee: settings?.codEnabled && paymentMethod === "COD" ? toNumber(settings.codFee) : 0,
  });

  return {
    lines,
    subtotal: quote.subtotal,
    discounts: quote.discounts.map((d) => ({ label: d.label, amount: d.amount })),
    discountTotal: quote.discountTotal,
    shippingTotal: input.includeShipping ? quote.shippingTotal : null,
    freeShipping: quote.freeShipping,
    codFee: quote.codFee,
    grandTotal: quote.grandTotal,
    couponError: quote.couponError,
    currency: settings?.currency ?? "EGP",
    adjusted,
  };
}

// ---------------------------------------------------------------------------
// Order placement
// ---------------------------------------------------------------------------

const placeOrderSchema = z.object({
  items: itemsSchema.min(1),
  couponCode: z.string().trim().max(40).optional(),
  paymentMethod: z.enum(["CARD", "COD"]),
  contact: z.object({
    email: z.string().email(),
    phone: z.string().min(6).max(25),
    name: z.string().trim().min(2).max(100),
  }),
  address: z.object({
    country: z.string().min(2).max(60),
    city: z.string().min(2).max(60),
    area: z.string().max(80).optional(),
    street: z.string().min(3).max(160),
    building: z.string().max(80).optional(),
  }),
  saveAddress: z.boolean().optional(),
});

export type PlaceOrderResult =
  | { ok: true; orderNumber: string; redirectUrl: string | null }
  | { ok: false; error: string };

export async function placeOrder(raw: unknown): Promise<PlaceOrderResult> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`order:${ip}`, 5, 60_000)) return { ok: false, error: "rate_limited" };

  const parsed = placeOrderSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const input = parsed.data;

  if (input.paymentMethod === "CARD" && !stripeEnabled()) {
    return { ok: false, error: "card_unavailable" };
  }

  // Stale-JWT safe: verified against the DB (see lib/auth-guards).
  const userId = await verifiedUserId();
  const quote = await quoteCart({
    items: input.items,
    couponCode: input.couponCode,
    paymentMethod: input.paymentMethod,
    city: input.address.city,
    includeShipping: true,
  });

  if (!quote.lines.length) return { ok: false, error: "empty_cart" };
  if (quote.adjusted.length) return { ok: false, error: "stock_changed" };
  if (input.couponCode && quote.couponError) return { ok: false, error: `coupon_${quote.couponError}` };

  const settings = await db.storeSettings.findUnique({ where: { id: 1 } });
  if (input.paymentMethod === "COD" && settings && !settings.codEnabled) {
    return { ok: false, error: "cod_unavailable" };
  }

  // Atomic: re-check stock, decrement, create order.
  try {
    const order = await db.$transaction(async (tx) => {
      for (const line of quote.lines) {
        const updated = await tx.variant.updateMany({
          where: { id: line.variantId, stock: { gte: line.quantity } },
          data: { stock: { decrement: line.quantity } },
        });
        if (updated.count === 0) throw new Error("stock_conflict");
      }
      if (input.couponCode && !quote.couponError) {
        await tx.coupon.update({
          where: { code: input.couponCode.toUpperCase() },
          data: { usedCount: { increment: 1 } },
        });
      }
      const count = await tx.order.count();
      const orderNumber = `ORD-${1001 + count}`;
      return tx.order.create({
        data: {
          orderNumber,
          userId,
          guestEmail: userId ? null : input.contact.email,
          guestPhone: userId ? null : input.contact.phone,
          subtotal: quote.subtotal,
          discountTotal: quote.discountTotal,
          shippingTotal: quote.shippingTotal ?? 0,
          codFee: input.paymentMethod === "COD" ? quote.codFee : null,
          grandTotal: quote.grandTotal,
          paymentMethod: input.paymentMethod,
          paymentStatus: "PENDING",
          status: "PENDING",
          couponCode: input.couponCode?.toUpperCase() ?? null,
          promoBreakdown: quote.discounts,
          shippingAddress: {
            name: input.contact.name,
            email: input.contact.email,
            phone: input.contact.phone,
            country: input.address.country,
            city: input.address.city,
            area: input.address.area ?? null,
            street: input.address.street,
            building: input.address.building ?? null,
          },
          items: {
            create: quote.lines.map((l) => ({
              productId: l.productId,
              variantId: l.variantId,
              nameSnapshot: `${l.name} — ${l.colorName} / ${l.size}`,
              imageSnapshot: l.imageUrl,
              price: l.unitPrice,
              quantity: l.quantity,
              total: l.lineTotal,
            })),
          },
          statusHistory: { create: { fromStatus: null, toStatus: "PENDING" } },
        },
      });
    });

    if (userId && input.saveAddress) {
      await db.address.create({
        data: {
          userId,
          label: "Checkout",
          country: input.address.country,
          city: input.address.city,
          area: input.address.area ?? null,
          street: input.address.street,
          building: input.address.building ?? null,
          phone: input.contact.phone,
        },
      });
    }

    await notify(
      "NEW_ORDER",
      "New order received",
      `Order ${order.orderNumber} — ${quote.grandTotal} ${quote.currency}`,
      `/admin/orders/${order.orderNumber}`,
    );

    let redirectUrl: string | null = null;
    if (input.paymentMethod === "CARD") {
      redirectUrl = await createStripeCheckout({
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: quote.grandTotal,
        currency: quote.currency,
        email: input.contact.email,
      });
    } else {
      // COD confirms immediately; card orders confirm via webhook.
      await sendOrderConfirmation({
        to: input.contact.email,
        orderNumber: order.orderNumber,
        name: input.contact.name,
        lines: quote.lines.map((l) => ({
          name: `${l.name} — ${l.colorName} / ${l.size}`,
          quantity: l.quantity,
          total: l.lineTotal,
        })),
        subtotal: quote.subtotal,
        discountTotal: quote.discountTotal,
        shippingTotal: quote.shippingTotal ?? 0,
        codFee: quote.codFee,
        grandTotal: quote.grandTotal,
        currency: quote.currency,
      });
    }

    return { ok: true, orderNumber: order.orderNumber, redirectUrl };
  } catch (e) {
    if (e instanceof Error && e.message === "stock_conflict") {
      return { ok: false, error: "stock_changed" };
    }
    throw e;
  }
}

/** Saved addresses + zones + payment availability for the checkout page. */
export async function getCheckoutContext() {
  const session = await auth();
  const [settings, zones, addresses] = await Promise.all([
    db.storeSettings.findUnique({ where: { id: 1 } }),
    db.shippingZone.findMany({ where: { isActive: true }, orderBy: { rate: "asc" } }),
    session?.user
      ? db.address.findMany({ where: { userId: session.user.id }, orderBy: { isDefault: "desc" } })
      : Promise.resolve([]),
  ]);
  return {
    user: session?.user ? { name: session.user.name ?? "", email: session.user.email ?? "" } : null,
    codEnabled: settings?.codEnabled ?? true,
    codFee: toNumber(settings?.codFee ?? 0),
    currency: settings?.currency ?? "EGP",
    cardEnabled: stripeEnabled(),
    zones: zones.map((z) => ({
      id: z.id,
      name: z.name,
      cities: (z.cities as string[]) ?? [],
      rate: toNumber(z.rate),
      freeOver: z.freeOver ? toNumber(z.freeOver) : null,
      etaText: z.etaText,
    })),
    addresses: addresses.map((a) => ({
      id: a.id,
      label: a.label,
      country: a.country,
      city: a.city,
      area: a.area,
      street: a.street,
      building: a.building,
      phone: a.phone,
      isDefault: a.isDefault,
    })),
  };
}
