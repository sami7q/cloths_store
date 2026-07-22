"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth-guards";
import { audit } from "@/lib/admin/audit";
import { ORDER_STATUSES } from "@/lib/enums";
import { messages } from "@/lib/i18n";
import { sendOrderStatusUpdate } from "@/lib/mail";
import { quoteCart } from "@/server/cart";

/** Mutating actions for the admin Orders module (§6.2). */

export type ActionState = { error?: string; success?: string };

function orderEmail(order: { guestEmail: string | null; user: { email: string } | null }): string | null {
  return order.user?.email ?? order.guestEmail ?? null;
}

function orderName(order: { shippingAddress: unknown; user: { name: string } | null }): string {
  const addr = order.shippingAddress as { name?: string } | null;
  return order.user?.name ?? addr?.name ?? "";
}

const statusSchema = z.object({
  orderId: z.string().min(1),
  toStatus: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(500).optional(),
  notify: z.boolean().optional(),
});

export async function updateOrderStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = messages.admin;
  try {
    const { userId } = await requireAdminAction("orders");
    const parsed = statusSchema.safeParse({
      orderId: formData.get("orderId"),
      toStatus: formData.get("toStatus"),
      note: String(formData.get("note") ?? "") || undefined,
      notify: formData.get("notify") === "on",
    });
    if (!parsed.success) return { error: t.common.error };
    const { orderId, toStatus, note, notify } = parsed.data;

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { user: { select: { name: true, email: true } } },
    });
    if (!order || order.status === toStatus) return { error: t.common.error };

    // COD collects on delivery — mark payment as PAID with the DELIVERED step.
    const paymentPatch =
      toStatus === "DELIVERED" && order.paymentMethod === "COD" && order.paymentStatus === "PENDING"
        ? { paymentStatus: "PAID" as const }
        : {};

    await db.$transaction([
      db.order.update({ where: { id: orderId }, data: { status: toStatus, ...paymentPatch } }),
      db.orderStatusLog.create({
        data: { orderId, fromStatus: order.status, toStatus, byUserId: userId, note: note ?? null },
      }),
    ]);
    await audit(userId, "order.status", "Order", orderId, { from: order.status, to: toStatus, note });

    let emailNote = "";
    if (notify) {
      const to = orderEmail(order);
      if (to) {
        await sendOrderStatusUpdate({
          to,
          orderNumber: order.orderNumber,
          name: orderName(order),
          statusLabel: (t.statuses as Record<string, string>)[toStatus] ?? toStatus,
          trackingNumber: order.trackingNumber,
          note: note ?? null,
        });
        emailNote = ` ${t.orders.emailNoteSent}`;
      } else {
        emailNote = ` ${t.orders.guestNoEmail}`;
      }
    }

    revalidatePath(`/admin/orders/${order.orderNumber}`);
    revalidatePath("/admin/orders");
    return { success: `${t.orders.statusUpdated}${emailNote}` };
  } catch {
    return { error: t.common.forbidden };
  }
}

export async function saveTracking(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = messages.admin;
  try {
    const { userId } = await requireAdminAction("orders");
    const orderId = String(formData.get("orderId") ?? "");
    const trackingNumber = String(formData.get("trackingNumber") ?? "").trim().slice(0, 80);
    if (!orderId) return { error: t.common.error };
    const order = await db.order.update({
      where: { id: orderId },
      data: { trackingNumber: trackingNumber || null },
    });
    await audit(userId, "order.tracking", "Order", orderId, { trackingNumber });
    revalidatePath(`/admin/orders/${order.orderNumber}`);
    return { success: t.orders.trackingSaved };
  } catch {
    return { error: t.common.forbidden };
  }
}

export async function saveOrderNotes(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = messages.admin;
  try {
    const { userId } = await requireAdminAction("orders");
    const orderId = String(formData.get("orderId") ?? "");
    const notes = String(formData.get("notes") ?? "").trim().slice(0, 2000);
    if (!orderId) return { error: t.common.error };
    const order = await db.order.update({ where: { id: orderId }, data: { notes: notes || null } });
    await audit(userId, "order.notes", "Order", orderId);
    revalidatePath(`/admin/orders/${order.orderNumber}`);
    return { success: t.orders.notesSaved };
  } catch {
    return { error: t.common.forbidden };
  }
}

export async function toggleRefund(formData: FormData): Promise<void> {
  const { userId } = await requireAdminAction("orders");
  const orderId = String(formData.get("orderId") ?? "");
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return;
  const next = order.paymentStatus === "REFUNDED" ? (order.paymentMethod === "CARD" ? "PAID" : "PENDING") : "REFUNDED";
  await db.order.update({ where: { id: orderId }, data: { paymentStatus: next } });
  await audit(userId, "order.refund", "Order", orderId, { from: order.paymentStatus, to: next });
  revalidatePath(`/admin/orders/${order.orderNumber}`);
  revalidatePath("/admin/orders");
}

// -- manual order creation ---------------------------------------------------

const manualOrderSchema = z.object({
  customerId: z.string().optional(),
  guest: z
    .object({ email: z.string().email(), phone: z.string().min(6).max(25) })
    .optional(),
  contactName: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(60),
  street: z.string().trim().min(3).max(160),
  phone: z.string().trim().min(6).max(25),
  paymentMethod: z.enum(["CARD", "COD"]),
  items: z.array(z.object({ variantId: z.string().min(1), quantity: z.number().int().min(1).max(99) })).min(1).max(50),
  couponCode: z.string().trim().max(40).optional(),
});

export type ManualOrderResult = { ok: true; orderNumber: string } | { ok: false; error: string };

export async function createManualOrder(raw: unknown): Promise<ManualOrderResult> {
  const t = messages.admin;
  let actor: { userId: string };
  try {
    actor = await requireAdminAction("orders");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }

  const parsed = manualOrderSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: t.common.error };
  const input = parsed.data;

  const customer = input.customerId
    ? await db.user.findUnique({ where: { id: input.customerId }, select: { id: true, name: true, email: true, phone: true } })
    : null;
  if (input.customerId && !customer) return { ok: false, error: t.common.error };
  if (!customer && !input.guest) return { ok: false, error: t.common.error };

  const quote = await quoteCart({
    items: input.items,
    couponCode: input.couponCode,
    paymentMethod: input.paymentMethod,
    city: input.city,
    includeShipping: true,
  });
  if (!quote.lines.length || quote.adjusted.length) return { ok: false, error: t.orders.stockConflict };
  if (input.couponCode && quote.couponError) return { ok: false, error: t.common.error };

  const email = customer?.email ?? input.guest?.email ?? "";
  // Country comes from the matched shipping zone — never hardcoded.
  const zones = await db.shippingZone.findMany({ where: { isActive: true } });
  const zone =
    zones.find((z) => ((z.cities as string[]) ?? []).some((c) => c.toLowerCase() === input.city.toLowerCase())) ??
    zones.find((z) => ((z.cities as string[]) ?? []).length === 0) ??
    zones[0];
  const country = ((zone?.countries as string[]) ?? [])[0] ?? "";
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
      return tx.order.create({
        data: {
          orderNumber: `ORD-${1001 + count}`,
          userId: customer?.id ?? null,
          guestEmail: customer ? null : input.guest?.email,
          guestPhone: customer ? null : input.guest?.phone,
          subtotal: quote.subtotal,
          discountTotal: quote.discountTotal,
          shippingTotal: quote.shippingTotal ?? 0,
          codFee: input.paymentMethod === "COD" ? quote.codFee : null,
          grandTotal: quote.grandTotal,
          paymentMethod: input.paymentMethod,
          paymentStatus: "PENDING",
          status: "CONFIRMED", // staff-entered orders skip the PENDING gate
          couponCode: input.couponCode?.toUpperCase() ?? null,
          promoBreakdown: quote.discounts,
          shippingAddress: {
            name: input.contactName,
            email,
            phone: input.phone,
            country,
            city: input.city,
            area: null,
            street: input.street,
            building: null,
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
          statusHistory: { create: { fromStatus: null, toStatus: "CONFIRMED", byUserId: actor.userId } },
        },
      });
    });

    await audit(actor.userId, "order.create", "Order", order.id, { manual: true, grandTotal: quote.grandTotal });
    revalidatePath("/admin/orders");
    return { ok: true, orderNumber: order.orderNumber };
  } catch (e) {
    if (e instanceof Error && e.message === "stock_conflict") return { ok: false, error: t.orders.stockConflict };
    throw e;
  }
}
