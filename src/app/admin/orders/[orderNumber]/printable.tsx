import Link from "next/link";
import { db } from "@/lib/db";
import { messages } from "@/lib/i18n";
import { formatPrice, toNumber } from "@/lib/format";
import { getOrderDetail } from "@/server/admin/orders-data";
import { PrintButton } from "./print-button";

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

/** Shared print-CSS document for invoice (§6.2, with prices) and packing slip (without). */
export async function PrintableOrderDoc({
  orderNumber,
  kind,
}: {
  orderNumber: string;
  kind: "invoice" | "packing";
}) {
  const [detail, settings] = await Promise.all([
    getOrderDetail(orderNumber),
    db.storeSettings.findUnique({ where: { id: 1 } }),
  ]);
  if (!detail) return null;
  const { order, currency } = detail;
  const addr = (order.shippingAddress ?? {}) as ShippingAddress;
  const promos = (order.promoBreakdown ?? []) as { label: string; amount: number }[];
  const money = (v: unknown) => formatPrice(v as never, currency);
  const title = kind === "invoice" ? t.orders.invoice : t.orders.packingSlip;

  return (
    <div className="mx-auto max-w-[720px]">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/admin/orders/${order.orderNumber}`} className="text-sm font-bold text-navy hover:underline">
          ← {t.common.back}
        </Link>
        <PrintButton label={t.orders.print} />
      </div>

      <div className="rounded-2xl border border-line bg-white p-8 print:rounded-none print:border-0 print:p-0">
        <header className="mb-8 flex items-start justify-between border-b border-line pb-6">
          <div>
            <p className="font-heading text-2xl font-bold uppercase tracking-[1px] text-navy">
              {settings?.name ?? ""}
            </p>
            {settings?.hotline && <p className="mt-1 text-sm text-gray-6">{settings.hotline}</p>}
          </div>
          <div className="text-end">
            <p className="font-heading text-xl font-bold uppercase tracking-[1px]">{title}</p>
            <p className="mt-1 text-sm font-bold text-ink">{order.orderNumber}</p>
            <p className="text-sm text-gray-6">
              {t.orders.issuedOn} {new Date().toLocaleDateString("en-GB", { dateStyle: "long" })}
            </p>
          </div>
        </header>

        <div className="mb-8 grid grid-cols-2 gap-8">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.5px] text-gray-4">
              {kind === "invoice" ? t.orders.billTo : t.orders.shipTo}
            </p>
            <p className="text-sm font-bold text-ink">{addr.name}</p>
            <p className="text-sm text-gray-6">
              {[addr.street, addr.building].filter(Boolean).join(", ")}
              <br />
              {[addr.area, addr.city, addr.country].filter(Boolean).join(", ")}
              <br />
              {addr.phone}
            </p>
          </div>
          <div className="text-end">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.5px] text-gray-4">{t.orders.payment}</p>
            <p className="text-sm font-bold text-ink">
              {(t.statuses as Record<string, string>)[order.paymentMethod] ?? order.paymentMethod}
            </p>
            <p className="text-sm text-gray-6">
              {t.orders.placedOn} {order.createdAt.toLocaleDateString("en-GB", { dateStyle: "long" })}
            </p>
            {order.trackingNumber && (
              <p className="text-sm text-gray-6">
                {t.orders.tracking}: {order.trackingNumber}
              </p>
            )}
          </div>
        </div>

        <table className="mb-8 w-full text-sm">
          <thead>
            <tr className="border-b-2 border-ink text-[11px] uppercase tracking-[0.5px]">
              <th className="pb-2 text-start font-bold">{t.orders.product}</th>
              <th className="pb-2 text-center font-bold">{t.orders.qty}</th>
              {kind === "invoice" && (
                <>
                  <th className="pb-2 text-end font-bold">{t.orders.unitPrice}</th>
                  <th className="pb-2 text-end font-bold">{t.orders.lineTotal}</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-line">
                <td className="py-2.5 pe-3">{item.nameSnapshot}</td>
                <td className="py-2.5 text-center">{item.quantity}</td>
                {kind === "invoice" && (
                  <>
                    <td className="py-2.5 text-end">{money(item.price)}</td>
                    <td className="py-2.5 text-end font-bold">{money(item.total)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {kind === "invoice" && (
          <div className="ms-auto max-w-[300px]">
            <dl className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-6">{t.orders.subtotal}</dt>
                <dd className="font-bold">{money(order.subtotal)}</dd>
              </div>
              {promos.map((p, i) => (
                <div key={i} className="flex justify-between">
                  <dt className="text-gray-6">{p.label}</dt>
                  <dd className="font-bold">−{formatPrice(p.amount, currency)}</dd>
                </div>
              ))}
              <div className="flex justify-between">
                <dt className="text-gray-6">{t.orders.shipping}</dt>
                <dd className="font-bold">
                  {toNumber(order.shippingTotal) === 0 ? t.orders.freeShipping : money(order.shippingTotal)}
                </dd>
              </div>
              {order.codFee != null && toNumber(order.codFee) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-gray-6">{t.orders.codFee}</dt>
                  <dd className="font-bold">{money(order.codFee)}</dd>
                </div>
              )}
              <div className="mt-2 flex justify-between border-t-2 border-ink pt-2">
                <dt className="font-heading font-bold uppercase">{t.orders.grandTotal}</dt>
                <dd className="font-heading text-lg font-bold">{money(order.grandTotal)}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
