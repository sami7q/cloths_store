"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth-guards";
import { audit } from "@/lib/admin/audit";
import { messages } from "@/lib/i18n";
import { COUPON_TYPES, COUPON_SCOPES, PROMO_TYPES } from "@/lib/enums";

/** Admin Discounts module (§6.7): coupons CRUD + promotions builder. */

const t = messages.admin;

function revalidateDiscounts() {
  revalidatePath("/admin/discounts");
  revalidatePath("/"); // card prices / promo labels on the storefront
}

// -- coupons -----------------------------------------------------------------

const couponSchema = z
  .object({
    originalCode: z.string().optional(),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(3)
      .max(40)
      .regex(/^[A-Z0-9_-]+$/),
    type: z.enum(COUPON_TYPES),
    value: z.number().min(0).max(1_000_000),
    minSubtotal: z.number().min(0).max(10_000_000).nullable(),
    maxUses: z.number().int().min(1).max(1_000_000).nullable(),
    perUserLimit: z.number().int().min(1).max(1000).nullable(),
    startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    isActive: z.boolean(),
    appliesTo: z.enum(COUPON_SCOPES),
    targetIds: z.array(z.string().min(1)).max(200),
  })
  .refine((c) => c.type !== "PERCENT" || c.value <= 100, { message: "percent>100" })
  .refine((c) => c.startsAt <= c.endsAt, { message: "window" });

export type DiscountResult = { ok: true; message: string } | { ok: false; error: string };

export async function saveCoupon(raw: unknown): Promise<DiscountResult> {
  let actor;
  try {
    actor = await requireAdminAction("discounts");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const parsed = couponSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: t.common.error };
  const input = parsed.data;

  const data = {
    code: input.code,
    type: input.type,
    value: input.value,
    minSubtotal: input.minSubtotal,
    maxUses: input.maxUses,
    perUserLimit: input.perUserLimit,
    startsAt: new Date(`${input.startsAt}T00:00:00`),
    endsAt: new Date(`${input.endsAt}T23:59:59`),
    isActive: input.isActive,
    appliesTo: input.appliesTo,
    targetIds: input.appliesTo === "ALL" ? [] : input.targetIds,
  };

  const existing = await db.coupon.findUnique({ where: { code: input.code } });
  if (input.originalCode) {
    if (existing && existing.code !== input.originalCode) return { ok: false, error: t.discounts.codeTaken };
    await db.coupon.update({ where: { code: input.originalCode }, data });
    await audit(actor.userId, "coupon.update", "Coupon", input.code);
  } else {
    if (existing) return { ok: false, error: t.discounts.codeTaken };
    await db.coupon.create({ data });
    await audit(actor.userId, "coupon.create", "Coupon", input.code);
  }
  revalidateDiscounts();
  return { ok: true, message: t.discounts.couponSaved };
}

export async function deleteCoupon(formData: FormData): Promise<void> {
  const { userId } = await requireAdminAction("discounts");
  const code = String(formData.get("code") ?? "");
  await db.coupon.delete({ where: { code } });
  await audit(userId, "coupon.delete", "Coupon", code);
  revalidateDiscounts();
}

// -- promo rules -------------------------------------------------------------

const tierSchema = z.object({
  nth: z.number().int().min(2).max(10),
  percentOff: z.number().min(1).max(100),
});

const promoSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(120),
  type: z.enum(PROMO_TYPES),
  priority: z.number().int().min(0).max(1000),
  isActive: z.boolean(),
  config: z.unknown(),
});

function validateConfig(type: string, config: unknown): Record<string, unknown> | null {
  const c = (config ?? {}) as Record<string, unknown>;
  switch (type) {
    case "BUY_X_GET_DISCOUNT": {
      const tiers = z.array(tierSchema).min(1).max(8).safeParse(c.tiers);
      if (!tiers.success) return null;
      const nths = new Set(tiers.data.map((x) => x.nth));
      if (nths.size !== tiers.data.length) return null;
      return { tiers: [...tiers.data].sort((a, b) => a.nth - b.nth) };
    }
    case "BUNDLE_PRICE": {
      const parsed = z
        .object({
          collectionSlug: z.string().min(1),
          quantity: z.number().int().min(2).max(20),
          bundlePrice: z.number().min(1).max(10_000_000),
        })
        .safeParse(c);
      return parsed.success ? parsed.data : null;
    }
    case "CARD_EXTRA_PERCENT": {
      const parsed = z.object({ percentOff: z.number().min(1).max(90) }).safeParse(c);
      return parsed.success ? parsed.data : null;
    }
    case "FREE_SHIPPING_OVER": {
      const parsed = z.object({ threshold: z.number().min(1).max(10_000_000) }).safeParse(c);
      return parsed.success ? parsed.data : null;
    }
    default:
      return null;
  }
}

export async function savePromoRule(raw: unknown): Promise<DiscountResult> {
  let actor;
  try {
    actor = await requireAdminAction("discounts");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const parsed = promoSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: t.common.error };
  const input = parsed.data;

  const config = validateConfig(input.type, input.config);
  if (!config) return { ok: false, error: t.common.error };

  if (config.collectionSlug) {
    const collection = await db.collection.findUnique({ where: { slug: config.collectionSlug as string } });
    if (!collection) return { ok: false, error: t.common.error };
  }

  const data = {
    name: input.name,
    type: input.type,
    priority: input.priority,
    isActive: input.isActive,
    config: JSON.parse(JSON.stringify(config)) as object,
  };
  if (input.id) {
    await db.promoRule.update({ where: { id: input.id }, data });
    await audit(actor.userId, "promo.update", "PromoRule", input.id, { type: input.type });
  } else {
    const created = await db.promoRule.create({ data });
    await audit(actor.userId, "promo.create", "PromoRule", created.id, { type: input.type });
  }
  revalidateDiscounts();
  return { ok: true, message: t.discounts.promoSaved };
}

export async function deletePromoRule(formData: FormData): Promise<void> {
  const { userId } = await requireAdminAction("discounts");
  const id = String(formData.get("id") ?? "");
  await db.promoRule.delete({ where: { id } });
  await audit(userId, "promo.delete", "PromoRule", id);
  revalidateDiscounts();
}

export async function togglePromoRule(formData: FormData): Promise<void> {
  const { userId } = await requireAdminAction("discounts");
  const id = String(formData.get("id") ?? "");
  const rule = await db.promoRule.findUnique({ where: { id } });
  if (!rule) return;
  await db.promoRule.update({ where: { id }, data: { isActive: !rule.isActive } });
  await audit(userId, "promo.toggle", "PromoRule", id, { isActive: !rule.isActive });
  revalidateDiscounts();
}

/** Swap priority with the neighbor above/below (list is priority-ordered). */
export async function movePromoRule(formData: FormData): Promise<void> {
  const { userId } = await requireAdminAction("discounts");
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  const rules = await db.promoRule.findMany({ orderBy: { priority: "asc" } });
  const index = rules.findIndex((r) => r.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= rules.length) return;

  // Normalize to index-based priorities, then swap — repairs any duplicates.
  const ordered = rules.map((r, i) => ({ id: r.id, priority: i }));
  [ordered[index].priority, ordered[swapWith].priority] = [ordered[swapWith].priority, ordered[index].priority];
  await db.$transaction(
    ordered.map((r) => db.promoRule.update({ where: { id: r.id }, data: { priority: r.priority } })),
  );
  await audit(userId, "promo.reorder", "PromoRule", id, { direction });
  revalidateDiscounts();
}
