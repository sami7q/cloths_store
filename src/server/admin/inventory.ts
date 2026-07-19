"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth-guards";
import { audit } from "@/lib/admin/audit";
import { messages } from "@/lib/i18n";

/** Admin Inventory module (§6.6): stock adjustments with a mandatory, logged reason. */

const t = messages.admin;

const adjustSchema = z.object({
  variantId: z.string().min(1),
  newStock: z.number().int().min(0).max(1_000_000),
  reason: z.string().trim().min(3).max(300),
});

export type AdjustResult = { ok: true; message: string; stock: number } | { ok: false; error: string };

export async function adjustStock(raw: unknown): Promise<AdjustResult> {
  let actor;
  try {
    actor = await requireAdminAction("inventory");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const parsed = adjustSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: t.inventory.reasonRequired };
  const { variantId, newStock, reason } = parsed.data;

  const variant = await db.variant.findUnique({
    where: { id: variantId },
    include: { product: { select: { slug: true } } },
  });
  if (!variant) return { ok: false, error: t.common.error };

  await db.variant.update({ where: { id: variantId }, data: { stock: newStock } });
  // The adjustment trail lives in AuditLog (schema has no dedicated model).
  await audit(actor.userId, "inventory.adjust", "Variant", variantId, {
    sku: variant.sku,
    from: variant.stock,
    to: newStock,
    reason,
  });

  // Low-stock notification when the adjustment crosses the threshold downward.
  if (newStock <= variant.lowStockAt && variant.stock > variant.lowStockAt) {
    await db.notification.create({
      data: {
        type: "LOW_STOCK",
        title: "Low stock",
        body: `${variant.sku} is at ${newStock}`,
        link: "/admin/inventory?low=1",
      },
    });
  }

  revalidatePath("/admin/inventory");
  revalidatePath(`/product/${variant.product.slug}`);
  return { ok: true, message: t.inventory.stockAdjusted, stock: newStock };
}
