import Link from "next/link";
import { requireAdminModule } from "@/lib/auth-guards";
import { can } from "@/lib/permissions";
import { messages } from "@/lib/i18n";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/enums";
import { buildQuery, first, type RawSearchParams } from "@/lib/admin/params";
import { listOrders } from "@/server/admin/orders-data";
import {
  AdminSelect,
  ExportCsvLink,
  FilterBar,
  PageHeader,
  Pagination,
} from "@/components/admin/list-controls";
import { OrdersTable } from "./orders-table";
import { cn } from "@/lib/utils";

const t = messages.admin;
export const metadata = { title: `${t.nav.orders} — ${t.title}` };

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const session = await requireAdminModule("orders");
  const raw = await searchParams;
  const { params, total, rows, tabCounts, allCount } = await listOrders(raw);
  const activeTab = first(raw.tab);
  const statuses = t.statuses as Record<string, string>;

  return (
    <div>
      <PageHeader title={t.orders.title}>
        <ExportCsvLink href={`/admin/orders/export${buildQuery(raw, { page: null })}`} />
        {can(session.user.role, "orders", "edit") && (
          <Link
            href="/admin/orders/new"
            className="inline-flex h-10 items-center rounded-full bg-navy px-5 text-sm font-bold uppercase tracking-[0.5px] text-white hover:bg-navy-deep"
          >
            {t.orders.newOrder}
          </Link>
        )}
      </PageHeader>

      <nav className="mb-4 flex flex-wrap gap-1 rounded-full border border-line bg-white p-1" aria-label="status tabs">
        <TabLink href={`/admin/orders${buildQuery(raw, { tab: null, page: null })}`} active={!activeTab}>
          {t.table.all} <TabCount n={allCount} />
        </TabLink>
        {ORDER_STATUSES.map((status) => (
          <TabLink
            key={status}
            href={`/admin/orders${buildQuery(raw, { tab: status, page: null })}`}
            active={activeTab === status}
          >
            {statuses[status]} <TabCount n={tabCounts[status] ?? 0} />
          </TabLink>
        ))}
      </nav>

      <FilterBar action="/admin/orders" raw={raw} keep={["tab"]} searchPlaceholder={t.orders.searchPlaceholder} searchDefault={params.q}>
        <AdminSelect name="pm" defaultValue={first(raw.pm)} aria-label={t.orders.paymentMethod}>
          <option value="">{t.orders.paymentMethod}: {t.table.all}</option>
          <option value="CARD">{statuses.CARD}</option>
          <option value="COD">{statuses.COD}</option>
        </AdminSelect>
        <AdminSelect name="ps" defaultValue={first(raw.ps)} aria-label={t.orders.paymentStatus}>
          <option value="">{t.orders.paymentStatus}: {t.table.all}</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statuses[s]}
            </option>
          ))}
        </AdminSelect>
        <label className="flex items-center gap-1.5 text-sm text-gray-6">
          {t.table.from}
          <input type="date" name="from" defaultValue={first(raw.from)} className="h-10 rounded-full border border-line bg-white px-3 text-sm outline-none focus:border-navy" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-gray-6">
          {t.table.to}
          <input type="date" name="to" defaultValue={first(raw.to)} className="h-10 rounded-full border border-line bg-white px-3 text-sm outline-none focus:border-navy" />
        </label>
      </FilterBar>

      <OrdersTable rows={rows} sort={params.sort} dir={params.dir} />
      <Pagination raw={raw} basePath="/admin/orders" page={params.page} perPage={params.perPage} total={total} />
    </div>
  );
}

function TabLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-bold",
        active ? "bg-navy text-white" : "text-gray-6 hover:text-navy",
      )}
    >
      {children}
    </Link>
  );
}

function TabCount({ n }: { n: number }) {
  return <span className="rounded-full bg-black/10 px-1.5 text-[11px]">{n}</span>;
}
