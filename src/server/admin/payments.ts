"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth-guards";
import { audit } from "@/lib/admin/audit";
import { messages } from "@/lib/i18n";

/** Admin Payments module (§6.12): card-discount % feeding the promo engine. */

const t = messages.admin;

const percentSchema = z.object({ percentOff: z.number().min(0).max(90) });

export type PaymentsResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * Upsert the CARD_EXTRA_PERCENT rule. 0 deactivates it (card prices vanish
 * from cards/PDP and the engine skips the discount); >0 activates/updates.
 */
export async function saveCardPercent(raw: unknown): Promise<PaymentsResult> {
  let actor;
  try {
    actor = await requireAdminAction("payments");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const parsed = percentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: t.common.error };
  const { percentOff } = parsed.data;

  const existing = await db.promoRule.findFirst({ where: { type: "CARD_EXTRA_PERCENT" } });
  if (existing) {
    await db.promoRule.update({
      where: { id: existing.id },
      data: {
        isActive: percentOff > 0,
        config: percentOff > 0 ? { percentOff } : (existing.config as object),
      },
    });
    await audit(actor.userId, "payments.cardPercent", "PromoRule", existing.id, { percentOff });
  } else if (percentOff > 0) {
    const created = await db.promoRule.create({
      data: {
        name: `Card extra ${percentOff}%`,
        type: "CARD_EXTRA_PERCENT",
        config: { percentOff },
        isActive: true,
        priority: 30,
      },
    });
    await audit(actor.userId, "payments.cardPercent", "PromoRule", created.id, { percentOff });
  }

  revalidatePath("/admin/payments");
  revalidatePath("/admin/discounts");
  revalidatePath("/", "layout");
  return { ok: true, message: t.paymentsAdmin.cardPercentSaved };
}
