"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth-guards";
import { audit } from "@/lib/admin/audit";
import { messages } from "@/lib/i18n";
import type { AdminModule } from "@/lib/permissions";

/** Admin Shipping module (§6.11): zones CRUD + COD settings. */

const t = messages.admin;

function revalidateShipping() {
  revalidatePath("/admin/shipping");
  revalidatePath("/admin/payments");
  revalidatePath("/checkout");
}

export type ShippingResult = { ok: true; message: string } | { ok: false; error: string };

const zoneSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(80),
  countries: z.string().max(400),
  cities: z.string().max(2000),
  rate: z.number().min(0).max(1_000_000),
  freeOver: z.number().min(0).max(10_000_000).nullable(),
  etaText: z.string().trim().min(2).max(120),
  isActive: z.boolean(),
});

const splitList = (value: string) =>
  value
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

export async function saveZone(raw: unknown): Promise<ShippingResult> {
  let actor;
  try {
    actor = await requireAdminAction("shipping");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const parsed = zoneSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: t.common.error };
  const input = parsed.data;

  const data = {
    name: input.name,
    countries: splitList(input.countries),
    cities: splitList(input.cities),
    rate: input.rate,
    freeOver: input.freeOver,
    etaText: input.etaText,
    isActive: input.isActive,
  };

  if (input.id) {
    await db.shippingZone.update({ where: { id: input.id }, data });
    await audit(actor.userId, "shipping.zone.update", "ShippingZone", input.id);
  } else {
    const created = await db.shippingZone.create({ data });
    await audit(actor.userId, "shipping.zone.create", "ShippingZone", created.id);
  }
  revalidateShipping();
  return { ok: true, message: t.shippingAdmin.zoneSaved };
}

export async function deleteZone(formData: FormData): Promise<void> {
  const { userId } = await requireAdminAction("shipping");
  const id = String(formData.get("id") ?? "");
  await db.shippingZone.delete({ where: { id } });
  await audit(userId, "shipping.zone.delete", "ShippingZone", id);
  revalidateShipping();
}

// COD settings live on StoreSettings and are shared with the Payments module
// (§6.12) — the module argument decides which permission gate applies.
const codSchema = z.object({
  codEnabled: z.boolean(),
  codFee: z.number().min(0).max(100000),
});

export async function saveCodSettings(raw: unknown, via: "shipping" | "payments" = "shipping"): Promise<ShippingResult> {
  let actor;
  try {
    actor = await requireAdminAction(via as AdminModule);
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const parsed = codSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: t.common.error };
  await db.storeSettings.update({
    where: { id: 1 },
    data: { codEnabled: parsed.data.codEnabled, codFee: parsed.data.codFee },
  });
  await audit(actor.userId, "settings.cod", "StoreSettings", "1", parsed.data);
  revalidateShipping();
  return { ok: true, message: t.shippingAdmin.codSaved };
}
