import Link from "next/link";
import { requireAdminModule } from "@/lib/auth-guards";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { messages } from "@/lib/i18n";
import { buildQuery, first, parseListParams, type RawSearchParams } from "@/lib/admin/params";
import { markAllNotificationsRead } from "@/server/admin/shell";
import { toggleNotificationRead } from "@/server/admin/notifications";
import { AdminSelect, FilterBar, PageHeader, Pagination } from "@/components/admin/list-controls";
import { PrefsClient } from "./prefs-client";
import { cn } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

const t = messages.admin;
const tn = t.notificationsAdmin;
export const metadata = { title: `${t.nav.notifications} — ${t.title}` };

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const session = await requireAdminModule("notifications");
  const canEdit = can(session.user.role, "notifications", "edit");
  const raw = await searchParams;
  const params = parseListParams(raw, { perPage: 15 });

  const where: Prisma.NotificationWhereInput = {};
  if (first(raw.unread) === "1") where.isRead = false;
  const type = first(raw.type);
  if (type) where.type = type;

  const [settings, total, notifications, types, unreadCount] = await Promise.all([
    db.storeSettings.findUnique({ where: { id: 1 } }),
    db.notification.count({ where }),
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.perPage,
      take: params.perPage,
    }),
    db.notification.findMany({ select: { type: true }, distinct: ["type"] }),
    db.notification.count({ where: { isRead: false } }),
  ]);

  return (
    <div>
      <PageHeader title={tn.title}>
        <Link
          href={`/admin/notifications${buildQuery(raw, { unread: first(raw.unread) === "1" ? null : "1", page: null })}`}
          className={cn(
            "inline-flex h-10 items-center gap-1.5 rounded-full border px-5 text-sm font-bold uppercase tracking-[0.5px]",
            first(raw.unread) === "1" ? "border-navy bg-navy text-white" : "border-line bg-white hover:border-navy",
          )}
        >
          {tn.unreadOnly}
          <span className="rounded-full bg-black/10 px-1.5 text-[11px]">{unreadCount}</span>
        </Link>
        {canEdit && unreadCount > 0 && (
          <form action={markAllNotificationsRead}>
            <button
              type="submit"
              className="inline-flex h-10 items-center rounded-full border border-line bg-white px-5 text-sm font-bold uppercase tracking-[0.5px] hover:border-navy"
            >
              {t.shell.markAllRead}
            </button>
          </form>
        )}
      </PageHeader>

      <FilterBar action="/admin/notifications" raw={raw} keep={["unread"]}>
        <AdminSelect name="type" defaultValue={type} aria-label={tn.typeFilter}>
          <option value="">
            {tn.typeFilter}: {t.table.all}
          </option>
          {types.map((row) => (
            <option key={row.type} value={row.type}>
              {row.type}
            </option>
          ))}
        </AdminSelect>
      </FilterBar>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.8fr_1fr]">
        <div>
          <ul className="flex flex-col gap-2">
            {notifications.length === 0 && (
              <li className="rounded-2xl border border-dashed border-line py-10 text-center text-sm text-gray-4">
                {t.table.empty}
              </li>
            )}
            {notifications.map((n) => (
              <li
                key={n.id}
                className={cn(
                  "flex items-center gap-4 rounded-2xl border border-line p-4",
                  n.isRead ? "bg-white" : "bg-navy/[0.04] border-navy/20",
                )}
              >
                <span
                  className={cn("h-2.5 w-2.5 shrink-0 rounded-full", n.isRead ? "bg-line" : "bg-deal-red")}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-ink">{n.title}</p>
                    <span className="rounded-full bg-card px-2 py-0.5 text-[10px] font-bold uppercase text-gray-4">
                      {n.type}
                    </span>
                  </div>
                  <p className="truncate text-sm text-gray-6">{n.body}</p>
                  <p className="mt-0.5 text-xs text-gray-4">
                    {n.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                {n.link && (
                  <Link href={n.link} className="shrink-0 text-sm font-bold text-navy hover:underline">
                    →
                  </Link>
                )}
                {canEdit && (
                  <form action={toggleNotificationRead}>
                    <input type="hidden" name="id" value={n.id} />
                    <button
                      type="submit"
                      className="shrink-0 rounded-full border border-line px-3.5 py-1.5 text-xs font-bold uppercase hover:border-navy"
                    >
                      {n.isRead ? tn.markUnread : tn.markRead}
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          <Pagination
            raw={raw}
            basePath="/admin/notifications"
            page={params.page}
            perPage={params.perPage}
            total={total}
          />
        </div>

        <PrefsClient prefs={(settings?.notificationPrefs ?? {}) as Record<string, boolean>} canEdit={canEdit} />
      </div>
    </div>
  );
}
