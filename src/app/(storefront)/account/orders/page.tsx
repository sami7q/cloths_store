import Link from "next/link";
import { requireUser } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { messages } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import { getStoreSettings } from "@/server/storefront";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: messages.account.orders };

export default async function AccountOrdersPage() {
  const session = await requireUser();
  const t = messages.account;
  const [settings, orders] = await Promise.all([
    getStoreSettings(),
    db.order.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { items: true } } },
    }),
  ]);
  const currency = settings?.currency ?? "EGP";

  return (
    <div className="rounded-[10px] border border-line bg-white p-5">
      <h2 className="mb-4 font-heading text-lg font-bold uppercase tracking-[1px]">{t.orders}</h2>
      {orders.length === 0 ? (
        <p className="text-gray-6">{t.noOrders}</p>
      ) : (
        <table className="w-full text-start text-[15px]">
          <thead>
            <tr className="border-b border-line text-start text-sm uppercase tracking-[0.5px] text-gray-6">
              <th className="py-2 text-start font-bold">{t.order}</th>
              <th className="py-2 text-start font-bold max-md:hidden">{t.date}</th>
              <th className="py-2 text-start font-bold">{t.status}</th>
              <th className="py-2 text-end font-bold">{t.total}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-line last:border-0">
                <td className="py-3">
                  <Link href={`/account/orders/${o.orderNumber}`} className="font-extrabold text-navy hover:underline">
                    {o.orderNumber}
                  </Link>
                  <span className="ms-2 text-sm text-gray-6">
                    {o._count.items} {t.items}
                  </span>
                </td>
                <td className="py-3 text-sm text-gray-6 max-md:hidden">
                  {o.createdAt.toLocaleDateString("en-GB")}
                </td>
                <td className="py-3">
                  <Badge tone={o.status === "DELIVERED" ? "save" : o.status === "CANCELLED" ? "deal" : "navy"}>
                    {o.status}
                  </Badge>
                </td>
                <td className="py-3 text-end font-bold">{formatPrice(o.grandTotal, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
