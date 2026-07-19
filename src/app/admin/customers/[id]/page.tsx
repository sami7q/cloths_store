import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminModule } from "@/lib/auth-guards";
import { can } from "@/lib/permissions";
import { messages } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import { getCustomerDetail } from "@/server/admin/customers-data";
import { toggleCustomerActive } from "@/server/admin/customers";
import { PageHeader, StatusPill } from "@/components/admin/list-controls";
import { NotesForm } from "./customer-actions";
import { cn } from "@/lib/utils";

const t = messages.admin;
const tcu = t.customers;
export const metadata = { title: `${t.nav.customers} — ${t.title}` };

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminModule("customers");
  const canEdit = can(session.user.role, "customers", "edit");
  const { id } = await params;
  const detail = await getCustomerDetail(id);
  if (!detail) notFound();
  const { user, currency, lifetimeValue, ordersCount } = detail;

  return (
    <div>
      <PageHeader title={user.name}>
        <span
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-bold",
            user.isActive ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEE2E2] text-[#991B1B]",
          )}
        >
          {user.isActive ? tcu.accountActive : tcu.accountDisabled}
        </span>
        {canEdit && (
          <form action={toggleCustomerActive}>
            <input type="hidden" name="id" value={user.id} />
            <button
              type="submit"
              title={tcu.disabledNote}
              className={cn(
                "inline-flex h-10 items-center rounded-full border px-5 text-sm font-bold uppercase tracking-[0.5px]",
                user.isActive
                  ? "border-line bg-white text-deal-red hover:border-deal-red"
                  : "border-line bg-white text-save-green hover:border-save-green",
              )}
            >
              {user.isActive ? tcu.disableAccount : tcu.enableAccount}
            </button>
          </form>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
        <div className="flex flex-col gap-4">
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Kpi label={tcu.ordersCount} value={String(ordersCount)} />
            <Kpi label={tcu.lifetimeValue} value={lifetimeValue} />
            <Kpi label={tcu.wishlistCount} value={String(user._count.wishlist)} />
            <Kpi label={tcu.reviewsCount} value={String(user._count.reviews)} />
          </section>

          <Card title={tcu.orderHistory}>
            {user.orders.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-4">{t.table.empty}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-[11.5px] uppercase tracking-[0.5px] text-gray-4">
                    <th className="pb-2 text-start font-bold">{t.orders.orderCol}</th>
                    <th className="pb-2 text-start font-bold">{t.common.date}</th>
                    <th className="pb-2 text-start font-bold">{t.orders.itemsCol}</th>
                    <th className="pb-2 text-start font-bold">{t.common.total}</th>
                    <th className="pb-2 text-start font-bold">{t.common.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {user.orders.map((order) => (
                    <tr key={order.id} className="border-b border-line last:border-0">
                      <td className="py-2.5 pe-3">
                        <Link href={`/admin/orders/${order.orderNumber}`} className="font-bold text-navy hover:underline">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="py-2.5 pe-3 text-gray-6">
                        {order.createdAt.toLocaleDateString("en-GB", { dateStyle: "medium" })}
                      </td>
                      <td className="py-2.5 pe-3">{order._count.items}</td>
                      <td className="py-2.5 pe-3 font-bold">{formatPrice(order.grandTotal, currency)}</td>
                      <td className="py-2.5">
                        <StatusPill status={order.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {canEdit && (
            <Card title={tcu.adminNotes}>
              <NotesForm customerId={user.id} notes={user.adminNotes} />
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Card title={tcu.info}>
            <dl className="flex flex-col gap-2 text-sm">
              <Row label={t.common.name} value={user.name} />
              <Row label="Email" value={user.email} />
              <Row label={t.orders.phone} value={user.phone ?? "—"} />
              <Row
                label={tcu.joined}
                value={user.createdAt.toLocaleDateString("en-GB", { dateStyle: "long" })}
              />
            </dl>
          </Card>

          <Card title={tcu.addresses}>
            {user.addresses.length === 0 ? (
              <p className="text-sm text-gray-4">{tcu.noAddresses}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {user.addresses.map((address) => (
                  <li key={address.id} className="py-2.5 text-sm">
                    <p className="font-bold text-ink">
                      {address.label}
                      {address.isDefault && (
                        <span className="ms-2 rounded-full bg-navy px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                          {tcu.defaultBadge}
                        </span>
                      )}
                    </p>
                    <p className="text-gray-6">
                      {[address.street, address.building].filter(Boolean).join(", ")}
                      <br />
                      {[address.area, address.city, address.country].filter(Boolean).join(", ")}
                      <br />
                      {address.phone}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <h2 className="mb-3 font-heading text-[15px] font-bold uppercase tracking-[0.5px]">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-gray-4">{label}</dt>
      <dd className="truncate font-bold text-ink">{value}</dd>
    </div>
  );
}
