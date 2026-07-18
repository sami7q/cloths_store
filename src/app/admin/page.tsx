import Link from "next/link";
import { requireAdminModule } from "@/lib/auth-guards";
import { ADMIN_MODULES, can } from "@/lib/permissions";
import { messages } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: messages.admin.dashboard };

export default async function AdminDashboardPage() {
  const session = await requireAdminModule("dashboard");
  const role = session.user.role;
  const t = messages.admin;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-heading text-3xl font-bold uppercase tracking-[1px]">{t.dashboard}</h1>
        <p className="mt-1 text-sm text-gray-6">
          {t.yourRole}: <span className="font-bold text-ink">{role}</span> — {t.placeholderNote}
        </p>
      </header>
      <section className="rounded-2xl border border-line bg-white p-6">
        <h2 className="mb-4 font-heading text-lg font-bold uppercase tracking-[1px]">{t.moduleAccess}</h2>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ADMIN_MODULES.map((mod) => {
            const view = can(role, mod, "view");
            const edit = can(role, mod, "edit");
            return (
              <li
                key={mod}
                className="flex items-center justify-between rounded-xl border border-line px-4 py-3"
              >
                {view ? (
                  <Link href={`/admin/${mod === "dashboard" ? "" : mod}`} className="font-bold uppercase text-sm tracking-[0.5px] text-navy hover:underline">
                    {mod}
                  </Link>
                ) : (
                  <span className="font-bold uppercase text-sm tracking-[0.5px] text-gray-4">{mod}</span>
                )}
                <span className="flex gap-1.5">
                  {view ? <Badge tone="save">{t.moduleView}</Badge> : <Badge tone="neutral">{t.noAccess}</Badge>}
                  {edit ? <Badge tone="navy">{t.moduleEdit}</Badge> : null}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
