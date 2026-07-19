import "server-only";
import { db } from "./db";

/**
 * Notification producer (§6.14) — consults StoreSettings.notificationPrefs
 * before writing. A missing key means the event is ON; only an explicit
 * `false` silences it. Never throws — a muted or failed notification must
 * not break the action that raised it.
 */

export type NotificationType = "NEW_ORDER" | "LOW_STOCK" | "PENDING_REVIEW";

export async function notify(
  type: NotificationType,
  title: string,
  body: string,
  link: string,
): Promise<void> {
  try {
    const settings = await db.storeSettings.findUnique({ where: { id: 1 } });
    const prefs = (settings?.notificationPrefs ?? {}) as Record<string, boolean>;
    if (prefs[type] === false) return;
    await db.notification.create({ data: { type, title, body, link } });
  } catch (e) {
    console.error("[notify] failed:", type, e);
  }
}
