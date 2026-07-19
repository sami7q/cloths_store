import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { messages } from "@/lib/i18n";
import { ADMIN_MODULES, can, isAdminAreaRole } from "@/lib/permissions";
import { AdminShell, type AdminNavItem } from "@/components/admin/admin-shell";

export const metadata = { title: messages.admin.title };

/** Full §6 admin shell: permission-filtered sidebar, search topbar, bell. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=${encodeURIComponent("/admin")}`);
  const role = session.user.role;
  if (!isAdminAreaRole(role)) redirect("/");

  const [settings, notifications, unreadCount] = await Promise.all([
    db.storeSettings.findUnique({ where: { id: 1 } }),
    db.notification.findMany({ where: { isRead: false }, orderBy: { createdAt: "desc" }, take: 8 }),
    db.notification.count({ where: { isRead: false } }),
  ]);

  const t = messages.admin.nav;
  const navItems: AdminNavItem[] = ADMIN_MODULES.filter((m) => can(role, m, "view")).map((m) => ({
    module: m,
    href: m === "dashboard" ? "/admin" : `/admin/${m}`,
    label: t[m],
  }));

  return (
    <AdminShell
      storeName={settings?.name ?? messages.admin.title}
      logoUrl={settings?.logoUrl ?? null}
      role={role}
      userName={session.user.name ?? session.user.email ?? role}
      navItems={navItems}
      notifications={notifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        link: n.link,
        createdAt: n.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }),
      }))}
      unreadCount={unreadCount}
      canEditNotifications={can(role, "notifications", "edit")}
    >
      {children}
    </AdminShell>
  );
}
