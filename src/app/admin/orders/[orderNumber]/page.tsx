import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { requireAdminModule } from "@/lib/auth-guards";
import { can } from "@/lib/permissions";
import { messages } from "@/lib/i18n";
import { formatPrice, toNumber } from "@/lib/format";
import { getOrderDetail } from "@/server/admin/orders-data";
import { toggleRefund } from "@/server/admin/orders";
import { PageHeader, StatusPill } from "@/components/admin/list-controls";
import { NotesForm, StatusForm, TrackingForm } from "./order-actions";

const t = messages.admin;

type ShippingAddress = {
  name?: string;
  email?: string;
  phone?: string;
  country?: string;
  city?: string;
  area?: string | null;
  street?: string;
  building?: string | null;
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const session = await requireAdminModule("orders");
  const canEdit = can(session.user.role, "orders", "edit");
  const { orderNumber } = await params;
  const detail = await getOrderDetail(orderNumber);
  if (!detail) notFound();
  const { order, currency } = detail;
  const addr = (order.shippingAddress ?? {}) as ShippingAddress;
  const promos = (order.promoBreakdown ?? []) as { label: string; amount: number }[];
  const statuses = t.statuses as Record<string, string>;
  const money = (v: unknown) => formatPrice(v as never, currency);

  return (
    <div>
      <PageHeader title={`${t.orders.detailTitle} ${order.orderNumber}`}>
        <StatusPill status={order.status} />
        <Link
          href={`/admin/orders/${order.orderNumber}/invoice`}
          className="inline-flex h-10 items-center rounded-full border border-line bg-white px-5 text-sm font-bold uppercase tracking-[0.5px] hover:border-navy"
        >
          {t.orders.printInvoice}
        </Link>
        <Link
          href={`/admin/orders/${order.orderNumber}/packing`}
          className="inline-flex h-10 items-center rounded-full border border-line bg-white px-5 text-sm font-bold uppercase tracking-[0.5px] hover:border-navy"
        >
          {t.orders.printPacking}
        </Link>
      </PageHeader>
      <p className="-mt-4 mb-6 text-sm text-gray-4">
        {t.orders.placedOn} {order.createdAt.toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })}
      </p>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
        <div className="flex flex-col gap-4">
          <Card title={t.orders.items}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-[11.5px] uppercase tracking-[0.5px] text-gray-4">
                  <th className="pb-2 text-start font-bold">{t.orders.product}</th>
                  <th className="pb-2 text-start font-bold">{t.orders.qty}</th>
                  <th className="pb-2 text-start font-bold">{t.orders.unitPrice}</th>
                  <th className="pb-2 text-end font-bold">{t.orders.lineTotal}</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-b border-line last:border-0">
                    <td className="py-3 pe-3">
                      <div className="flex items-center gap-3">
                        {item.imageSnapshot ? (
                          <Image
                            src={item.imageSnapshot}
                            alt=""
                            width={44}
                            height={44}
                            className="h-11 w-11 rounded-lg border border-line object-cover"
                          />
                        ) : (
                          <span className="h-11 w-11 rounded-lg border border-line bg-card" />
                        )}
                        {item.productId ? (
                          <Link href={`/admin/products/${item.productId}`} className="font-bold text-navy hover:underline">
                            {item.nameSnapshot}
                          </Link>
                        ) : (
                          <span className="font-bold text-ink">{item.nameSnapshot}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pe-3">{item.quantity}</td>
                    <td className="py-3 pe-3">{money(item.price)}</td>
                    <td className="py-3 text-end font-bold">{money(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card title={t.orders.totals}>
            <dl className="flex flex-col gap-2 text-sm">
              <Row label={t.orders.subtotal} value={money(order.subtotal)} />
              {promos.map((p, i) => (
                <Row key={i} label={p.label} value={`−${formatPrice(p.amount, currency)}`} accent="text-save-green" />
              ))}
              {order.couponCode && (
                <Row label={`${t.orders.coupon}: ${order.couponCode}`} value="" accent="text-gray-4" />
              )}
              <Row
                label={t.orders.shipping}
                value={toNumber(order.shippingTotal) === 0 ? t.orders.freeShipping : money(order.shippingTotal)}
              />
              {order.codFee != null && toNumber(order.codFee) > 0 && (
                <Row label={t.orders.codFee} value={money(order.codFee)} />
              )}
              <div className="mt-1 flex items-center justify-between border-t border-line pt-3">
                <dt className="font-heading text-base font-bold uppercase">{t.orders.grandTotal}</dt>
                <dd className="font-heading text-xl font-bold text-navy">{money(order.grandTotal)}</dd>
              </div>
            </dl>
          </Card>

          <Card title={t.orders.statusHistory}>
            <ol className="relative ms-2 flex flex-col gap-4 border-s-2 border-line ps-5">
              {order.statusHistory.map((log) => (
                <li key={log.id} className="relative">
                  <span className="absolute -start-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-navy" />
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={log.toStatus} />
                    <span className="text-xs text-gray-4">
                      {log.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                      {" — "}
                      {log.byUser ? `${t.orders.byStaff} ${log.byUser.name}` : t.orders.systemChange}
                    </span>
                  </div>
                  {log.note && <p className="mt-1 text-sm text-gray-6">{log.note}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          {canEdit && (
            <Card title={t.orders.changeStatus}>
              <StatusForm orderId={order.id} current={order.status} />
            </Card>
          )}

          <Card title={t.orders.customer}>
            {order.user ? (
              <div className="text-sm">
                <Link href={`/admin/customers/${order.user.id}`} className="font-bold text-navy hover:underline">
                  {order.user.name}
                </Link>
                <p className="text-gray-6">{order.user.email}</p>
                {order.user.phone && <p className="text-gray-6">{order.user.phone}</p>}
              </div>
            ) : (
              <div className="text-sm">
                <p className="font-bold text-ink">
                  {addr.name ?? "—"} <span className="font-normal text-gray-4">({t.common.guest})</span>
                </p>
                <p className="text-gray-6">{order.guestEmail}</p>
                <p className="text-gray-6">{order.guestPhone}</p>
              </div>
            )}
          </Card>

          <Card title={t.orders.shippingAddress}>
            <p className="text-sm text-gray-6">
              {addr.name}
              <br />
              {[addr.street, addr.building].filter(Boolean).join(", ")}
              <br />
              {[addr.area, addr.city, addr.country].filter(Boolean).join(", ")}
              <br />
              {addr.phone}
            </p>
          </Card>

          <Card title={t.orders.payment}>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-6">{t.orders.paymentMethod}</span>
                <span className="font-bold">{statuses[order.paymentMethod] ?? order.paymentMethod}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-6">{t.orders.paymentStatus}</span>
                <StatusPill status={order.paymentStatus} />
              </div>
              {canEdit && (
                <form action={toggleRefund} className="mt-2">
                  <input type="hidden" name="orderId" value={order.id} />
                  <button
                    type="submit"
                    className="w-full rounded-full border border-line px-4 py-2 text-sm font-bold text-deal-red hover:border-deal-red"
                  >
                    {order.paymentStatus === "REFUNDED" ? t.orders.unmarkRefunded : t.orders.markRefunded}
                  </button>
                </form>
              )}
            </div>
          </Card>

          {canEdit && (
            <Card title={t.orders.tracking}>
              <TrackingForm orderId={order.id} trackingNumber={order.trackingNumber} />
            </Card>
          )}

          {canEdit && (
            <Card title={t.orders.internalNotes}>
              <NotesForm orderId={order.id} notes={order.notes} />
            </Card>
          )}
        </div>
      </div>
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

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-gray-6">{label}</dt>
      <dd className={`font-bold ${accent ?? "text-ink"}`}>{value}</dd>
    </div>
  );
}
