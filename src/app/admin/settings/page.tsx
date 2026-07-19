import { requireAdminModule } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { messages } from "@/lib/i18n";
import { smtpConfigured } from "@/lib/mail";
import { first, parseListParams, type RawSearchParams } from "@/lib/admin/params";
import { FilterBar, PageHeader, Pagination } from "@/components/admin/list-controls";
import {
  IdentityForm,
  LocaleForm,
  MaintenanceForm,
  SeoForm,
  SmtpTestForm,
  type SettingsValues,
} from "./settings-client";
import type { Prisma } from "@prisma/client";

const t = messages.admin;
const ts = t.settings;
export const metadata = { title: `${t.nav.settings} — ${t.title}` };

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await requireAdminModule("settings");
  const raw = await searchParams;
  const params = parseListParams(raw, { perPage: 15 });

  const auditWhere: Prisma.AuditLogWhereInput = {};
  const q = first(raw.q).trim();
  if (q) {
    auditWhere.OR = [{ action: { contains: q } }, { entity: { contains: q } }, { entityId: { contains: q } }];
  }

  const [settings, auditTotal, auditRows] = await Promise.all([
    db.storeSettings.findUnique({ where: { id: 1 } }),
    db.auditLog.count({ where: auditWhere }),
    db.auditLog.findMany({
      where: auditWhere,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.perPage,
      take: params.perPage,
      include: { user: { select: { name: true } } },
    }),
  ]);

  const socials = (settings?.socialLinks ?? {}) as Record<string, string>;
  const seo = (settings?.seoDefaults ?? {}) as { title?: string; description?: string };
  const values: SettingsValues = {
    name: settings?.name ?? "",
    logoUrl: settings?.logoUrl ?? null,
    faviconUrl: settings?.faviconUrl ?? null,
    hotline: settings?.hotline ?? "",
    facebook: socials.facebook ?? "",
    instagram: socials.instagram ?? "",
    tiktok: socials.tiktok ?? "",
    currency: settings?.currency ?? "EGP",
    defaultLocale: settings?.defaultLocale ?? "en",
    seoTitle: seo.title ?? "",
    seoDescription: seo.description ?? "",
    maintenanceMode: settings?.maintenanceMode ?? false,
    smtpConfigured: smtpConfigured(),
  };

  return (
    <div>
      <PageHeader title={ts.title} />
      <div className="grid max-w-[1100px] grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title={ts.identityTitle} wide>
          <IdentityForm values={values} />
        </Card>
        <Card title={ts.localeTitle}>
          <LocaleForm values={values} />
        </Card>
        <Card title={ts.seoTitle}>
          <SeoForm values={values} />
        </Card>
        <Card title={ts.smtpTitle}>
          <SmtpTestForm values={values} />
        </Card>
        <Card title={ts.maintenanceTitle}>
          <MaintenanceForm values={values} />
        </Card>
      </div>

      <section className="mt-6 rounded-2xl border border-line bg-white p-5">
        <h2 className="mb-4 font-heading text-[15px] font-bold uppercase tracking-[0.5px]">{ts.auditTitle}</h2>
        <FilterBar action="/admin/settings" raw={raw} searchPlaceholder={ts.auditSearchPlaceholder} searchDefault={q} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-[11.5px] uppercase tracking-[0.5px] text-gray-4">
                <th className="px-3 py-2 text-start font-bold">{ts.auditWhen}</th>
                <th className="px-3 py-2 text-start font-bold">{ts.auditActor}</th>
                <th className="px-3 py-2 text-start font-bold">{ts.auditAction}</th>
                <th className="px-3 py-2 text-start font-bold">{ts.auditEntity}</th>
                <th className="px-3 py-2 text-start font-bold">{ts.auditDetails}</th>
              </tr>
            </thead>
            <tbody>
              {auditRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-gray-4">
                    {t.table.empty}
                  </td>
                </tr>
              )}
              {auditRows.map((row) => (
                <tr key={row.id} className="border-b border-line align-top last:border-0">
                  <td className="whitespace-nowrap px-3 py-2.5 text-gray-6">
                    {row.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-bold text-ink">
                    {row.user?.name ?? ts.system}
                  </td>
                  <td className="px-3 py-2.5">
                    <code className="rounded bg-card px-1.5 py-0.5 text-[12px] font-bold text-navy">{row.action}</code>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-gray-6">
                    {row.entity} <span className="text-gray-4">{row.entityId.slice(0, 10)}</span>
                  </td>
                  <td className="max-w-[280px] px-3 py-2.5">
                    {row.diff != null && (
                      <code className="block truncate text-[12px] text-gray-6" title={JSON.stringify(row.diff)}>
                        {JSON.stringify(row.diff)}
                      </code>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination raw={raw} basePath="/admin/settings" page={params.page} perPage={params.perPage} total={auditTotal} />
      </section>
    </div>
  );
}

function Card({ title, wide, children }: { title: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <section className={`rounded-2xl border border-line bg-white p-5 ${wide ? "xl:col-span-2" : ""}`}>
      <h2 className="mb-4 font-heading text-[15px] font-bold uppercase tracking-[0.5px]">{title}</h2>
      {children}
    </section>
  );
}
