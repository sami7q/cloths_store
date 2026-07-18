import Link from "next/link";
import { requireUser } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { messages } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import { getStoreSettings } from "@/server/storefront";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: messages.account.title };

export default async function AccountOverviewPage() {
  const session = await requireUser();
  const t = messages.account;
  const [settings, ordersCount, wishlistCount, defaultAddress, recent] = await Promise.all([
    getStoreSettings(),
    db.order.count({ where: { userId: session.user.id } }),
    db.wishlistItem.count({ where: { userId: session.user.id } }),
    db.address.findFirst({ where: { userId: session.user.id, isDefault: true } }),
    db.order.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { _count: { select: { items: true } } },
    }),
  ]);
  const currency = settings?.currency ?? "EGP";

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
        <div className="rounded-[10px] border border-line bg-white p-5">
          <p className="text-sm text-gray-6">{t.orders}</p>
          <p className="mt-1 text-3xl font-extrabold">{ordersCount}</p>
        </div>
        <div className="rounded-[10px] border border-line bg-white p-5">
          <p className="text-sm text-gray-6">{t.wishlistTitle}</p>
          <p className="mt-1 text-3xl font-extrabold">{wishlistCount}</p>
        </div>
        <div className="rounded-[10px] border border-line bg-white p-5">
          <p className="text-sm text-gray-6">{t.defaultAddress}</p>
          <p className="mt-1 text-sm font-semibold leading-relaxed">
            {defaultAddress ? `${defaultAddress.city}, ${defaultAddress.street}` : t.noAddress}
          </p>
        </div>
      </div>

      <section className="rounded-[10px] border border-line bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold uppercase tracking-[1px]">{t.recentOrders}</h2>
          <Link href="/account/orders" className="text-sm font-bold text-navy hover:underline">
            {t.viewAll} →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-gray-6">{t.noOrders}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {recent.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                <Link href={`/account/orders/${o.orderNumber}`} className="font-extrabold text-navy hover:underline">
                  {o.orderNumber}
                </Link>
                <span className="text-sm text-gray-6">
                  {o.createdAt.toLocaleDateString("en-GB")} · {o._count.items} {t.items}
                </span>
                <Badge tone={o.status === "DELIVERED" ? "save" : o.status === "CANCELLED" ? "deal" : "navy"}>
                  {o.status}
                </Badge>
                <span className="font-bold">{formatPrice(o.grandTotal, currency)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
