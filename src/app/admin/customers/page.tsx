import { requireAdminModule } from "@/lib/auth-guards";
import { messages } from "@/lib/i18n";
import { buildQuery, first, type RawSearchParams } from "@/lib/admin/params";
import { listCustomers } from "@/server/admin/customers-data";
import { ExportCsvLink, FilterBar, PageHeader, Pagination } from "@/components/admin/list-controls";
import { CustomersTable } from "./customers-table";

const t = messages.admin;
export const metadata = { title: `${t.nav.customers} — ${t.title}` };

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await requireAdminModule("customers");
  const raw = await searchParams;
  const { params, total, rows } = await listCustomers(raw);

  return (
    <div>
      <PageHeader title={t.customers.title}>
        <ExportCsvLink href={`/admin/customers/export${buildQuery(raw, { page: null })}`} />
      </PageHeader>
      <FilterBar
        action="/admin/customers"
        raw={raw}
        searchPlaceholder={t.customers.searchPlaceholder}
        searchDefault={first(raw.q)}
      />
      <CustomersTable rows={rows} sort={params.sort} dir={params.dir} />
      <Pagination raw={raw} basePath="/admin/customers" page={params.page} perPage={params.perPage} total={total} />
    </div>
  );
}
