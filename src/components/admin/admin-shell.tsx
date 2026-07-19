"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AdminIcons, type AdminIconName } from "./icons";
import { SignOutButton } from "@/components/store/signout-button";
import { adminGlobalSearch, markAllNotificationsRead, type AdminSearchResult } from "@/server/admin/shell";
import { messages } from "@/lib/i18n";

export type AdminNavItem = { module: AdminIconName; href: string; label: string };
export type AdminNotification = {
  id: string;
  title: string;
  body: string;
  link: string | null;
  createdAt: string;
};

type Props = {
  storeName: string;
  logoUrl: string | null;
  role: string;
  userName: string;
  navItems: AdminNavItem[];
  notifications: AdminNotification[];
  unreadCount: number;
  canEditNotifications: boolean;
  children: React.ReactNode;
};

const t = messages.admin;

export function AdminShell({
  storeName,
  logoUrl,
  role,
  userName,
  navItems,
  notifications,
  unreadCount,
  canEditNotifications,
  children,
}: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [openPanel, setOpenPanel] = useState<"bell" | "profile" | null>(null);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem("admin-sidebar") === "collapsed");
  }, []);
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      window.localStorage.setItem("admin-sidebar", c ? "open" : "collapsed");
      return !c;
    });
  };

  return (
    <div className="flex min-h-screen bg-card">
      <aside
        className={cn(
          "sticky top-0 z-30 flex h-screen shrink-0 flex-col border-e border-line bg-white transition-[width] duration-200 print:hidden",
          collapsed ? "w-[64px]" : "w-[236px]",
        )}
      >
        <Link href="/admin" className="flex h-16 items-center gap-3 border-b border-line px-4">
          {logoUrl ? (
            <Image src={logoUrl} alt={storeName} width={32} height={32} className="h-8 w-8 rounded-lg object-contain" />
          ) : (
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-navy font-heading text-sm font-bold text-white">
              {storeName.slice(0, 1)}
            </span>
          )}
          {!collapsed && (
            <span className="truncate font-heading text-[15px] font-bold uppercase tracking-[0.5px] text-navy">
              {storeName}
            </span>
          )}
        </Link>

        <nav className="flex-1 overflow-y-auto py-3">
          <ul className="flex flex-col gap-0.5 px-2.5">
            {navItems.map((item) => {
              const Icon = AdminIcons[item.module];
              const active =
                item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              return (
                <li key={item.module}>
                  <Link
                    href={item.href}
                    title={item.label}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors",
                      active ? "bg-navy text-white" : "text-gray-6 hover:bg-[#F3F4F6] hover:text-navy",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    <Icon className="shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex h-12 items-center justify-center gap-2 border-t border-line text-sm font-bold text-gray-6 hover:text-navy"
          aria-label={collapsed ? t.nav.expand : t.nav.collapse}
        >
          {collapsed ? <AdminIcons.chevronRight /> : <AdminIcons.chevronLeft />}
          {!collapsed && <span>{t.nav.collapse}</span>}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-line bg-white px-5 print:hidden">
          <GlobalSearch />
          <div className="ms-auto flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-gray-6 hover:bg-[#F3F4F6] hover:text-navy"
            >
              <AdminIcons.external width={17} height={17} />
              <span className="hidden lg:inline">{t.storefront}</span>
            </Link>

            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenPanel(openPanel === "bell" ? null : "bell")}
                className="relative grid h-10 w-10 place-items-center rounded-full text-gray-6 hover:bg-[#F3F4F6] hover:text-navy"
                aria-label={t.shell.notifications}
              >
                <AdminIcons.bell />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -end-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-deal-red px-1 text-[11px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
              {openPanel === "bell" && (
                <Panel onClose={() => setOpenPanel(null)}>
                  <BellPanel
                    notifications={notifications}
                    canEdit={canEditNotifications}
                    onClose={() => setOpenPanel(null)}
                  />
                </Panel>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenPanel(openPanel === "profile" ? null : "profile")}
                className="flex items-center gap-2 rounded-full px-2 py-1.5 hover:bg-[#F3F4F6]"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-navy text-sm font-bold text-white">
                  {userName.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden text-start md:block">
                  <span className="block max-w-[140px] truncate text-sm font-bold leading-4 text-ink">{userName}</span>
                  <span className="block text-[11px] font-bold uppercase text-gray-4">{role}</span>
                </span>
              </button>
              {openPanel === "profile" && (
                <Panel onClose={() => setOpenPanel(null)}>
                  <div className="flex flex-col p-2">
                    <div className="border-b border-line px-3 pb-2 pt-1 md:hidden">
                      <p className="text-sm font-bold text-ink">{userName}</p>
                      <Badge tone="navy" className="mt-1 px-2.5 py-0.5 text-[11px]">{role}</Badge>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2">
                      <SignOutButton label={messages.auth.signOut} />
                      <AdminIcons.logout className="text-gray-4" />
                    </div>
                  </div>
                </Panel>
              )}
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-5 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function Panel({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <button type="button" aria-hidden className="fixed inset-0 z-30 cursor-default" onClick={onClose} tabIndex={-1} />
      <div className="absolute end-0 top-12 z-40 w-[320px] rounded-2xl border border-line bg-white shadow-[0_12px_40px_rgba(15,23,42,0.14)]">
        {children}
      </div>
    </>
  );
}

function BellPanel({
  notifications,
  canEdit,
  onClose,
}: {
  notifications: AdminNotification[];
  canEdit: boolean;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="font-heading text-sm font-bold uppercase tracking-[0.5px]">{t.shell.notifications}</span>
        {canEdit && notifications.length > 0 && (
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => markAllNotificationsRead())}
            className="text-xs font-bold text-navy hover:underline disabled:opacity-50"
          >
            {t.shell.markAllRead}
          </button>
        )}
      </div>
      <ul className="max-h-[320px] overflow-y-auto">
        {notifications.length === 0 && <li className="px-4 py-6 text-center text-sm text-gray-4">{t.table.empty}</li>}
        {notifications.map((n) => (
          <li key={n.id} className="border-b border-line last:border-0">
            <Link href={n.link ?? "/admin/notifications"} onClick={onClose} className="block px-4 py-3 hover:bg-card">
              <p className="text-sm font-bold text-ink">{n.title}</p>
              <p className="mt-0.5 line-clamp-2 text-[13px] text-gray-6">{n.body}</p>
              <p className="mt-1 text-[11px] font-bold uppercase text-gray-4">{n.createdAt}</p>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/admin/notifications"
        onClick={onClose}
        className="block border-t border-line px-4 py-3 text-center text-sm font-bold text-navy hover:underline"
      >
        {t.shell.viewAll}
      </Link>
    </div>
  );
}

function GlobalSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<AdminSearchResult | null>(null);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
    setQ("");
    setResults(null);
  }, [pathname]);

  const onChange = (value: string) => {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    if (value.trim().length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      const res = await adminGlobalSearch(value);
      setResults(res);
      setOpen(true);
    }, 250);
  };

  const hasAny = results && (results.products.length || results.orders.length || results.customers.length);

  return (
    <div className="relative w-full max-w-[420px]">
      <AdminIcons.search className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-4" width={17} height={17} />
      <input
        value={q}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => results && setOpen(true)}
        placeholder={t.shell.searchPlaceholder}
        className="h-10 w-full rounded-full border border-line bg-card ps-10 pe-4 text-sm text-ink outline-none placeholder:text-gray-4 focus:border-navy focus:bg-white"
      />
      {open && results && (
        <>
          <button type="button" aria-hidden className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} tabIndex={-1} />
          <div className="absolute start-0 top-12 z-40 w-full min-w-[320px] rounded-2xl border border-line bg-white py-2 shadow-[0_12px_40px_rgba(15,23,42,0.14)]">
            {!hasAny && <p className="px-4 py-3 text-sm text-gray-4">{t.shell.noResults}</p>}
            {results.products.length > 0 && (
              <SearchGroup label={t.shell.groupProducts}>
                {results.products.map((r) => (
                  <SearchRow key={r.id} href={r.href} main={r.name} sub={r.sku} onPick={() => setOpen(false)} />
                ))}
              </SearchGroup>
            )}
            {results.orders.length > 0 && (
              <SearchGroup label={t.shell.groupOrders}>
                {results.orders.map((r) => (
                  <SearchRow key={r.id} href={r.href} main={r.orderNumber} sub={r.who} onPick={() => setOpen(false)} />
                ))}
              </SearchGroup>
            )}
            {results.customers.length > 0 && (
              <SearchGroup label={t.shell.groupCustomers}>
                {results.customers.map((r) => (
                  <SearchRow key={r.id} href={r.href} main={r.name} sub={r.email} onPick={() => setOpen(false)} />
                ))}
              </SearchGroup>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SearchGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-1">
      <p className="px-4 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.5px] text-gray-4">{label}</p>
      {children}
    </div>
  );
}

function SearchRow({ href, main, sub, onPick }: { href: string; main: string; sub: string; onPick: () => void }) {
  return (
    <Link href={href} onClick={onPick} className="flex items-baseline justify-between gap-3 px-4 py-2 hover:bg-card">
      <span className="truncate text-sm font-bold text-ink">{main}</span>
      <span className="shrink-0 text-xs text-gray-4">{sub}</span>
    </Link>
  );
}
