"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth-guards";
import { audit } from "@/lib/admin/audit";
import { messages } from "@/lib/i18n";

/** Admin Notifications module (§6.14) mutations. */

const t = messages.admin;

export async function toggleNotificationRead(formData: FormData): Promise<void> {
  await requireAdminAction("notifications");
  const id = String(formData.get("id") ?? "");
  const notification = await db.notification.findUnique({ where: { id } });
  if (!notification) return;
  await db.notification.update({ where: { id }, data: { isRead: !notification.isRead } });
  revalidatePath("/admin/notifications");
  revalidatePath("/admin", "layout");
}

const prefsSchema = z.object({
  NEW_ORDER: z.boolean(),
  LOW_STOCK: z.boolean(),
  PENDING_REVIEW: z.boolean(),
});

export type PrefsResult = { ok: true; message: string } | { ok: false; error: string };

export async function saveNotificationPrefs(raw: unknown): Promise<PrefsResult> {
  let actor;
  try {
    actor = await requireAdminAction("notifications");
  } catch {
    return { ok: false, error: t.common.forbidden };
  }
  const parsed = prefsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: t.common.error };
  await db.storeSettings.update({ where: { id: 1 }, data: { notificationPrefs: parsed.data } });
  await audit(actor.userId, "settings.notificationPrefs", "StoreSettings", "1", parsed.data);
  revalidatePath("/admin/notifications");
  return { ok: true, message: t.notificationsAdmin.prefsSaved };
}
