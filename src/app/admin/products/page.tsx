import Link from "next/link";
import { requireAdminModule } from "@/lib/auth-guards";
import { can } from "@/lib/permissions";
import { messages } from "@/lib/i18n";
import { PRODUCT_STATUSES } from "@/lib/enums";
import { buildQuery, first, type RawSearchParams } from "@/lib/admin/params";
import { listProducts } from "@/server/admin/products-data";
import {
  AdminSelect,
  ExportCsvLink,
  FilterBar,
  PageHeader,
  Pagination,
} from "@/components/admin/list-controls";
import { ImportCsvButton, ProductsTable } from "./products-table";

const t = messages.admin;
export const metadata = { title: `${t.nav.products} — ${t.title}` };

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const session = await requireAdminModule("products");
  const canEdit = can(session.user.role, "products", "edit");
  const raw = await searchParams;
  const { params, total, rows, categories } = await listProducts(raw);
  const statuses = t.statuses as Record<string, string>;

  return (
    <div>
      <PageHeader title={t.products.title}>
        <ExportCsvLink href={`/admin/products/export${buildQuery(raw, { page: null })}`} />
        {canEdit && <ImportCsvButton />}
        {canEdit && (
          <Link
            href="/admin/products/new"
            className="inline-flex h-10 items-center rounded-full bg-navy px-5 text-sm font-bold uppercase tracking-[0.5px] text-white hover:bg-navy-deep"
          >
            {t.products.addProduct}
          </Link>
        )}
      </PageHeader>

      <FilterBar action="/admin/products" raw={raw} searchPlaceholder={t.products.searchPlaceholder} searchDefault={params.q}>
        <AdminSelect name="status" defaultValue={first(raw.status)} aria-label={t.common.status}>
          <option value="">
            {t.common.status}: {t.table.all}
          </option>
          {PRODUCT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statuses[s]}
            </option>
          ))}
        </AdminSelect>
        <AdminSelect name="category" defaultValue={first(raw.category)} aria-label={t.products.category}>
          <option value="">
            {t.products.category}: {t.table.all}
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </AdminSelect>
      </FilterBar>

      <ProductsTable rows={rows} sort={params.sort} dir={params.dir} canEdit={canEdit} />
      <Pagination raw={raw} basePath="/admin/products" page={params.page} perPage={params.perPage} total={total} />
    </div>
  );
}
