"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth-guards";
import { audit } from "@/lib/admin/audit";
import { storage } from "@/lib/storage";
import { messages } from "@/lib/i18n";
import { sendTestEmail } from "@/lib/mail";

/** Admin Settings module (§6.16) — ADMIN only via the permissions matrix. */

const t = messages.admin;

function revalidateAll() {
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
}

export type SettingsResult = { ok: true; message: string } | { ok: false; error: string };

const identitySchema = z.object({
  name: z.string().trim().min(2).max(80),
  hotline: z.string().trim().max(40),
  facebook: z.string().trim().max(300),
  instagram: z.string().trim().max(300),
  tiktok: z.string().trim().max(300),
});

export async function saveIdentity(formData: FormData): Promise<SettingsResult> {
  let actor;
  try {
    actor = await requireAdminAction("settings");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const parsed = identitySchema.safeParse({
    name: formData.get("name"),
    hotline: formData.get("hotline") ?? "",
    facebook: formData.get("facebook") ?? "",
    instagram: formData.get("instagram") ?? "",
    tiktok: formData.get("tiktok") ?? "",
  });
  if (!parsed.success) return { ok: false, error: t.common.error };
  const input = parsed.data;

  let logoUrl: string | undefined;
  let faviconUrl: string | undefined;
  const logoFile = formData.get("logo");
  const faviconFile = formData.get("favicon");
  try {
    if (logoFile instanceof File && logoFile.size > 0) logoUrl = await storage.putFile(logoFile, "branding");
    if (faviconFile instanceof File && faviconFile.size > 0)
      faviconUrl = await storage.putFile(faviconFile, "branding");
  } catch {
    return { ok: false, error: t.common.error };
  }

  const socialLinks: Record<string, string> = {};
  if (input.facebook) socialLinks.facebook = input.facebook;
  if (input.instagram) socialLinks.instagram = input.instagram;
  if (input.tiktok) socialLinks.tiktok = input.tiktok;

  await db.storeSettings.update({
    where: { id: 1 },
    data: {
      name: input.name,
      hotline: input.hotline || null,
      socialLinks,
      ...(logoUrl ? { logoUrl } : {}),
      ...(faviconUrl ? { faviconUrl } : {}),
    },
  });
  await audit(actor.userId, "settings.identity", "StoreSettings", "1");
  revalidateAll();
  return { ok: true, message: t.settings.settingsSaved };
}

const localeSchema = z.object({
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3,5}$/),
  defaultLocale: z.enum(["en", "ar"]),
});

export async function saveLocale(raw: unknown): Promise<SettingsResult> {
  let actor;
  try {
    actor = await requireAdminAction("settings");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const parsed = localeSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: t.common.error };
  await db.storeSettings.update({ where: { id: 1 }, data: parsed.data });
  await audit(actor.userId, "settings.locale", "StoreSettings", "1", parsed.data);
  revalidateAll();
  return { ok: true, message: t.settings.settingsSaved };
}

const seoSchema = z.object({
  title: z.string().trim().max(160),
  description: z.string().trim().max(320),
});

export async function saveSeoDefaults(raw: unknown): Promise<SettingsResult> {
  let actor;
  try {
    actor = await requireAdminAction("settings");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const parsed = seoSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: t.common.error };
  await db.storeSettings.update({ where: { id: 1 }, data: { seoDefaults: parsed.data } });
  await audit(actor.userId, "settings.seo", "StoreSettings", "1");
  revalidateAll();
  return { ok: true, message: t.settings.settingsSaved };
}

export async function saveMaintenance(raw: unknown): Promise<SettingsResult> {
  let actor;
  try {
    actor = await requireAdminAction("settings");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const parsed = z.object({ maintenanceMode: z.boolean() }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: t.common.error };
  await db.storeSettings.update({ where: { id: 1 }, data: parsed.data });
  await audit(actor.userId, "settings.maintenance", "StoreSettings", "1", parsed.data);
  revalidateAll();
  return { ok: true, message: t.settings.settingsSaved };
}

export async function sendSmtpTest(raw: unknown): Promise<SettingsResult> {
  try {
    await requireAdminAction("settings");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const parsed = z.object({ to: z.string().email() }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: t.common.error };
  const sent = await sendTestEmail(parsed.data.to);
  return sent ? { ok: true, message: t.settings.smtpTestOk } : { ok: false, error: t.settings.smtpTestFail };
}
