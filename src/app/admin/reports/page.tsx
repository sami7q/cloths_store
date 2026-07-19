import { requireAdminModule } from "@/lib/auth-guards";
import { messages } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import { buildQuery, type RawSearchParams } from "@/lib/admin/params";
import { getReportsData, parseRange } from "@/server/admin/reports-data";
import { ExportCsvLink, FilterBar, PageHeader } from "@/components/admin/list-controls";

const t = messages.admin;
const tr = t.reports;
export const metadata = { title: `${t.nav.reports} — ${t.title}` };

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await requireAdminModule("reports");
  const raw = await searchParams;
  const range = parseRange(raw);
  const data = await getReportsData(range);
  const money = (n: number) => formatPrice(n, data.currency);
  const statuses = t.statuses as Record<string, string>;
  const exportHref = (report: string) =>
    `/admin/reports/export${buildQuery(raw, { report, from: range.fromStr, to: range.toStr })}`;

  return (
    <div>
      <PageHeader title={tr.title} />

      <FilterBar action="/admin/reports" raw={raw}>
        <label className="flex items-center gap-1.5 text-sm text-gray-6">
          {t.table.from}
          <input type="date" name="from" defaultValue={range.fromStr} className="h-10 rounded-full border border-line bg-white px-3 text-sm outline-none focus:border-navy" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-gray-6">
          {t.table.to}
          <input type="date" name="to" defaultValue={range.toStr} className="h-10 rounded-full border border-line bg-white px-3 text-sm outline-none focus:border-navy" />
        </label>
      </FilterBar>

      <section className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi label={tr.orders} value={String(data.totals.orders)} />
        <Kpi label={tr.revenue} value={money(data.totals.revenue)} />
        <Kpi label={tr.units} value={String(data.totals.units)} />
      </section>

      {data.totals.orders === 0 ? (
        <p className="rounded-2xl border border-dashed border-line py-12 text-center text-sm text-gray-4">{tr.noData}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ReportCard title={tr.salesByDay} exportHref={exportHref("day")}>
            <Table
              head={[tr.day, tr.orders, tr.revenue]}
              rows={data.byDay.map((r) => [r.day, String(r.orders), money(r.revenue)])}
            />
          </ReportCard>

          <ReportCard title={tr.salesByCategory} exportHref={exportHref("category")}>
            <Table
              head={[t.products.category, tr.units, tr.revenue, tr.share]}
              rows={data.byCategory.map((r) => [r.name, String(r.units), money(r.revenue), `${r.share}%`])}
            />
          </ReportCard>

          <ReportCard title={tr.salesByProduct} exportHref={exportHref("product")}>
            <Table
              head={[t.products.productCol, t.products.skuCol, tr.units, tr.revenue]}
              rows={data.byProduct.map((r) => [r.name, r.sku, String(r.units), money(r.revenue)])}
            />
          </ReportCard>

          <div className="flex flex-col gap-4">
            <ReportCard title={tr.paymentSplit} exportHref={exportHref("payment")}>
              <Table
                head={[t.orders.paymentMethod, tr.orders, tr.revenue, tr.share]}
                rows={data.paymentSplit.map((r) => [
                  statuses[r.method] ?? r.method,
                  String(r.orders),
                  money(r.revenue),
                  `${r.share}%`,
                ])}
              />
            </ReportCard>

            <ReportCard title={tr.couponPerformance} exportHref={exportHref("coupon")}>
              {data.coupons.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-4">{t.table.empty}</p>
              ) : (
                <Table
                  head={[tr.coupon, tr.orders, tr.discountGiven, tr.revenue, tr.avgOrder]}
                  rows={data.coupons.map((r) => [
                    r.code,
                    String(r.orders),
                    money(r.discount),
                    money(r.revenue),
                    money(r.avgOrder),
                  ])}
                />
              )}
            </ReportCard>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.5px] text-gray-4">{label}</p>
      <p className="mt-1 truncate font-heading text-xl font-bold text-ink">{value}</p>
    </div>
  );
}

function ReportCard({ title, exportHref, children }: { title: string; exportHref: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-heading text-[15px] font-bold uppercase tracking-[0.5px]">{title}</h2>
        <ExportCsvLink href={exportHref} />
      </div>
      <div className="max-h-[360px] overflow-y-auto">{children}</div>
    </section>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <table className="w-full text-sm">
      <thead className="sticky top-0 bg-white">
        <tr className="border-b border-line text-[11.5px] uppercase tracking-[0.5px] text-gray-4">
          {head.map((h) => (
            <th key={h} className="pb-2 pe-3 text-start font-bold">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((cells, i) => (
          <tr key={i} className="border-b border-line last:border-0">
            {cells.map((cell, j) => (
              <td key={j} className={j === 0 ? "py-2 pe-3 font-bold text-ink" : "py-2 pe-3"}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
