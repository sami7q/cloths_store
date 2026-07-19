import { requireAdminModule } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { messages } from "@/lib/i18n";
import { ADMIN_MODULES, can } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/list-controls";
import { StaffClient, type StaffRow } from "./staff-client";
import { cn } from "@/lib/utils";

const t = messages.admin;
export const metadata = { title: `${t.nav.staff} — ${t.title}` };

const ROLES = ["STAFF", "MANAGER", "ADMIN"] as const;

export default async function AdminStaffPage() {
  const session = await requireAdminModule("staff");
  const staff = await db.user.findMany({
    where: { role: { in: [...ROLES] } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  const rows: StaffRow[] = staff.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    joined: u.createdAt.toLocaleDateString("en-GB", { dateStyle: "medium" }),
    isSelf: u.id === session.user.id,
  }));

  return (
    <div>
      <PageHeader title={t.staff.title} />
      <StaffClient rows={rows} />

      <section className="mt-6 rounded-2xl border border-line bg-white p-5">
        <h2 className="font-heading text-[15px] font-bold uppercase tracking-[0.5px]">{t.staff.matrixTitle}</h2>
        <p className="mb-4 mt-1 text-xs text-gray-4">{t.staff.matrixNote}</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line text-[11.5px] uppercase tracking-[0.5px] text-gray-6">
                <th className="px-3 py-2 text-start font-bold">{t.staff.module}</th>
                {ROLES.map((role) => (
                  <th key={role} className="px-3 py-2 text-center font-bold">
                    {role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ADMIN_MODULES.map((module) => (
                <tr key={module} className="border-b border-line last:border-0">
                  <td className="px-3 py-2 font-bold text-ink">{t.nav[module]}</td>
                  {ROLES.map((role) => {
                    const view = can(role, module, "view");
                    const edit = can(role, module, "edit");
                    return (
                      <td key={role} className="px-3 py-2 text-center">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                            edit
                              ? "bg-[#DCFCE7] text-[#166534]"
                              : view
                                ? "bg-[#DBEAFE] text-[#1E40AF]"
                                : "bg-[#F3F4F6] text-[#9CA3AF]",
                          )}
                        >
                          {edit ? t.moduleEdit : view ? t.moduleView : t.noAccess}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
