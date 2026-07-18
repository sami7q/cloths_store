import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { messages } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import { getStoreSettings } from "@/server/storefront";
import { Badge } from "@/components/ui/badge";

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const session = await requireUser();
  const { orderNumber } = await params;
  const t = messages.account;
  const tc = messages.cart;

  const [settings, order] = await Promise.all([
    getStoreSettings(),
    db.order.findUnique({
      where: { orderNumber },
      include: { items: true, statusHistory: { orderBy: { createdAt: "asc" } } },
    }),
  ]);
  // Ownership check — admins get their own order views in Phase 6.
  if (!order || order.userId !== session.user.id) notFound();
  const currency = settings?.currency ?? "EGP";
  const address = order.shippingAddress as Record<string, string | null>;
  const promos = (order.promoBreakdown ?? []) as { label: string; amount: number }[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-2xl font-bold uppercase tracking-[1px]">
          {t.order} {order.orderNumber}
        </h2>
        <Badge tone={order.status === "DELIVERED" ? "save" : order.status === "CANCELLED" ? "deal" : "navy"}>
          {order.status}
        </Badge>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-6 max-lg:grid-cols-1">
        <div className="flex flex-col gap-6">
          {/* Items */}
          <section className="rounded-[10px] border border-line bg-white p-5">
            <ul className="flex flex-col divide-y divide-line">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 py-3">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-card">
                    {item.imageSnapshot ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageSnapshot} alt="" className="h-4/5 w-4/5 object-contain" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1 font-semibold">{item.nameSnapshot}</span>
                  <span className="text-sm text-gray-6">×{item.quantity}</span>
                  <span className="font-bold">{formatPrice(item.total, currency)}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Timeline */}
          <section className="rounded-[10px] border border-line bg-white p-5">
            <h3 className="mb-4 font-heading text-lg font-bold uppercase tracking-[1px]">{t.statusTimeline}</h3>
            <ol className="relative flex flex-col gap-4 border-s-2 border-line ps-5">
              {order.statusHistory.map((log) => (
                <li key={log.id} className="relative">
                  <span aria-hidden className="absolute -start-[27px] top-1 size-3 rounded-full bg-navy" />
                  <p className="font-bold">{log.toStatus}</p>
                  <p className="text-sm text-gray-6">
                    {log.createdAt.toLocaleString("en-GB")}
                    {log.note ? ` — ${log.note}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="flex h-fit flex-col gap-5 rounded-[10px] border border-line bg-white p-5">
          <div>
            <h3 className="mb-2 text-sm font-extrabold uppercase tracking-[0.5px] text-gray-6">{tc.summary}</h3>
            <dl className="flex flex-col gap-1.5 text-[15px]">
              <div className="flex justify-between"><dt className="text-gray-6">{tc.subtotal}</dt><dd className="font-bold">{formatPrice(order.subtotal, currency)}</dd></div>
              {promos.map((p, i) => (
                <div key={i} className="flex justify-between text-save-green"><dt>{p.label}</dt><dd>−{formatPrice(p.amount, currency)}</dd></div>
              ))}
              <div className="flex justify-between"><dt className="text-gray-6">{tc.shipping}</dt><dd className="font-semibold">{formatPrice(order.shippingTotal, currency)}</dd></div>
              {order.codFee ? (
                <div className="flex justify-between"><dt className="text-gray-6">{messages.checkout.codFeeNote}</dt><dd className="font-semibold">{formatPrice(order.codFee, currency)}</dd></div>
              ) : null}
              <div className="flex justify-between border-t border-line pt-2 text-base"><dt className="font-extrabold">{tc.total}</dt><dd className="font-extrabold text-navy">{formatPrice(order.grandTotal, currency)}</dd></div>
            </dl>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-extrabold uppercase tracking-[0.5px] text-gray-6">{t.paymentLabel}</h3>
            <p className="text-[15px] font-semibold">{order.paymentMethod} · {order.paymentStatus}</p>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-extrabold uppercase tracking-[0.5px] text-gray-6">{t.shippingTo}</h3>
            <p className="text-[15px] leading-relaxed">
              {address.name}<br />
              {address.street}{address.building ? `, ${address.building}` : ""}<br />
              {address.area ? `${address.area}, ` : ""}{address.city}, {address.country}<br />
              {address.phone}
            </p>
          </div>
          <Link href="/account/orders" className="text-sm font-bold text-navy hover:underline">
            ← {t.orders}
          </Link>
        </aside>
      </div>
    </div>
  );
}
