import Link from "next/link";
import { requireAdminModule } from "@/lib/auth-guards";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { messages } from "@/lib/i18n";
import { buildQuery, first, type RawSearchParams } from "@/lib/admin/params";
import { listInventory } from "@/server/admin/inventory-data";
import { ExportCsvLink, FilterBar, PageHeader, Pagination } from "@/components/admin/list-controls";
import { InventoryTable } from "./inventory-table";
import { cn } from "@/lib/utils";

const t = messages.admin;
export const metadata = { title: `${t.nav.inventory} — ${t.title}` };

export default async function AdminInventoryPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const session = await requireAdminModule("inventory");
  const raw = await searchParams;
  const [{ params, total, rows, lowOnly }, settings] = await Promise.all([
    listInventory(raw),
    db.storeSettings.findUnique({ where: { id: 1 } }),
  ]);

  return (
    <div>
      <PageHeader title={t.inventory.title}>
        <Link
          href={`/admin/inventory${buildQuery(raw, { low: lowOnly ? null : "1", page: null })}`}
          className={cn(
            "inline-flex h-10 items-center rounded-full border px-5 text-sm font-bold uppercase tracking-[0.5px]",
            lowOnly ? "border-navy bg-navy text-white" : "border-line bg-white hover:border-navy",
          )}
        >
          {t.inventory.lowStockOnly}
        </Link>
        <ExportCsvLink href={`/admin/inventory/export${buildQuery(raw, { page: null })}`} />
      </PageHeader>

      <FilterBar
        action="/admin/inventory"
        raw={raw}
        keep={["low"]}
        searchPlaceholder={t.inventory.searchPlaceholder}
        searchDefault={first(raw.q)}
      />

      <InventoryTable
        rows={rows}
        sort={params.sort}
        dir={params.dir}
        currency={settings?.currency ?? "EGP"}
        canEdit={can(session.user.role, "inventory", "edit")}
      />
      <Pagination raw={raw} basePath="/admin/inventory" page={params.page} perPage={params.perPage} total={total} />
    </div>
  );
}
