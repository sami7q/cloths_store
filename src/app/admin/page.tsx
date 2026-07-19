import Link from "next/link";
import { requireAdminModule } from "@/lib/auth-guards";
import { messages } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import { first, type RawSearchParams } from "@/lib/admin/params";
import { getDashboardData } from "@/server/admin/dashboard";
import { RevenueAreaChart, StatusDonutChart } from "@/components/admin/charts";
import { PageHeader, StatusPill } from "@/components/admin/list-controls";
import { cn } from "@/lib/utils";

export const metadata = { title: `${messages.admin.nav.dashboard} — ${messages.admin.title}` };

const t = messages.admin;
const STATUS_COLORS: Record<string, string> = {
  PENDING: "#F59E0B",
  CONFIRMED: "#3B82F6",
  PROCESSING: "#6366F1",
  SHIPPED: "#06B6D4",
  DELIVERED: "#22C55E",
  CANCELLED: "#EF4444",
  RETURNED: "#F43F5E",
};
const RANGES = [7, 30, 90];

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  await requireAdminModule("dashboard");
  const raw = await searchParams;
  const range = RANGES.includes(Number(first(raw.range))) ? Number(first(raw.range)) : 30;
  const data = await getDashboardData(range);
  const money = (n: number) => formatPrice(Math.round(n * 100) / 100, data.currency);

  const kpiCards = [
    { label: t.home.revenue, format: money },
    { label: t.home.orders, format: (n: number) => String(n) },
    { label: t.home.aov, format: money },
    { label: t.home.newCustomers, format: (n: number) => String(n) },
    { label: t.home.conversion, format: (n: number) => n.toFixed(2) },
  ] as const;
  const kpiValue = (index: number, w: typeof data.kpis.today) =>
    [w.revenue, w.orders, w.aov, w.newCustomers, w.ordersPerCustomer][index];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.nav.dashboard}>
        <div className="flex items-center gap-1 rounded-full border border-line bg-white p-1">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={r === 30 ? "/admin" : `/admin?range=${r}`}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-bold",
                r === range ? "bg-navy text-white" : "text-gray-6 hover:text-navy",
              )}
            >
              {r} {t.home.days}
            </Link>
          ))}
        </div>
      </PageHeader>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpiCards.map((card, i) => (
          <div key={card.label} className="rounded-2xl border border-line bg-white p-5">
            <p className="text-[12px] font-bold uppercase tracking-[0.5px] text-gray-4">{card.label}</p>
            <p className="mt-2 truncate font-heading text-[22px] font-bold text-ink">
              {card.format(kpiValue(i, data.kpis.today))}
            </p>
            <p className="text-[11px] font-bold uppercase text-gray-4">{t.home.today}</p>
            <dl className="mt-3 flex flex-col gap-1 border-t border-line pt-3 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-gray-4">{t.home.last7}</dt>
                <dd className="font-bold text-gray-6">{card.format(kpiValue(i, data.kpis.d7))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-4">{t.home.last30}</dt>
                <dd className="font-bold text-gray-6">{card.format(kpiValue(i, data.kpis.d30))}</dd>
              </div>
            </dl>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card title={`${t.home.revenueChart} — ${range} ${t.home.days}`}>
          <RevenueAreaChart data={data.chart} currency={data.currency} />
        </Card>
        <Card title={t.home.ordersByStatus}>
          <StatusDonutChart
            data={data.statusCounts.map((s) => ({
              label: (t.statuses as Record<string, string>)[s.status] ?? s.status,
              value: s.count,
              color: STATUS_COLORS[s.status] ?? "#8A8F98",
            }))}
          />
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title={t.home.topProducts}>
          <SimpleTable
            head={[t.products.productCol, t.home.unitsSold, t.home.revenue]}
            rows={data.topProducts.map((p) => [
              p.productId ? (
                <Link key="l" href={`/admin/products/${p.productId}`} className="font-bold text-navy hover:underline">
                  {p.name}
                </Link>
              ) : (
                p.name
              ),
              String(p.units),
              money(p.revenue),
            ])}
          />
        </Card>
        <Card title={t.home.lowStock} href="/admin/inventory">
          {data.lowStock.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-4">{t.home.noAlerts}</p>
          ) : (
            <SimpleTable
              head={[t.products.productCol, t.orders.variant, t.products.stockCol]}
              rows={data.lowStock.map((v) => [
                <Link key="l" href={`/admin/products/${v.productId}`} className="font-bold text-navy hover:underline">
                  {v.productName}
                </Link>,
                `${v.colorName} / ${v.size}`,
                <span key="s" className="font-bold text-deal-red">
                  {v.stock} {t.home.stockLeft}
                </span>,
              ])}
            />
          )}
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title={t.home.latestOrders} href="/admin/orders">
          <SimpleTable
            head={[t.orders.orderCol, t.common.customer, t.common.total, t.common.status]}
            rows={data.latestOrders.map((o) => [
              <Link key="l" href={`/admin/orders/${o.orderNumber}`} className="font-bold text-navy hover:underline">
                {o.orderNumber}
              </Link>,
              o.who,
              money(o.total),
              <StatusPill key="p" status={o.status} />,
            ])}
          />
        </Card>
        <Card title={t.home.pendingReviews} href="/admin/reviews">
          {data.pendingReviews.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-4">{t.home.noPendingReviews}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {data.pendingReviews.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <span className="shrink-0 text-sm font-bold text-[#F59E0B]">
                    {"★".repeat(r.rating)}
                    <span className="text-line">{"★".repeat(5 - r.rating)}</span>
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">{r.title ?? r.productName}</p>
                    <p className="truncate text-xs text-gray-4">
                      {r.userName} — {r.productName}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}

function Card({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-[15px] font-bold uppercase tracking-[0.5px]">{title}</h2>
        {href && (
          <Link href={href} className="text-sm font-bold text-navy hover:underline">
            {t.shell.viewAll}
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function SimpleTable({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-gray-4">{t.table.empty}</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-line">
          {head.map((h) => (
            <th key={h} className="pb-2 pe-3 text-start text-[11.5px] font-bold uppercase tracking-[0.5px] text-gray-4">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((cells, i) => (
          <tr key={i} className="border-b border-line last:border-0">
            {cells.map((cell, j) => (
              <td key={j} className="py-2.5 pe-3 align-middle">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
