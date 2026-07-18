import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { messages } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import { getStoreSettings } from "@/server/storefront";

export const metadata = { title: messages.checkout.successTitle };

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderNumber } = await searchParams;
  if (!orderNumber) notFound();
  const [order, settings] = await Promise.all([
    db.order.findUnique({ where: { orderNumber }, select: { orderNumber: true, grandTotal: true, paymentMethod: true, status: true } }),
    getStoreSettings(),
  ]);
  if (!order) notFound();
  const t = messages.checkout;

  return (
    <div className="container-store py-20">
      <div className="mx-auto max-w-[520px] rounded-3xl border border-line bg-white p-10 text-center">
        <span aria-hidden className="mx-auto flex size-16 items-center justify-center rounded-full bg-save-green text-3xl text-white">
          ✓
        </span>
        <h1 className="mt-5 font-heading text-4xl font-bold uppercase tracking-[1px]">{t.successTitle}</h1>
        <p className="mt-2 text-gray-6">{t.successBody}</p>
        <p className="mt-5 text-sm text-gray-6">{t.orderNumber}</p>
        <p className="text-2xl font-extrabold text-navy">{order.orderNumber}</p>
        <p className="mt-2 text-lg font-bold">{formatPrice(order.grandTotal, settings?.currency ?? "EGP")}</p>
        <p className="mt-4 text-sm text-gray-6">{t.successNote}</p>
        <Link href="/" className="mt-6 inline-block rounded-full bg-navy px-8 py-3 font-extrabold uppercase tracking-[0.5px] text-white hover:bg-navy-deep">
          {t.backHome}
        </Link>
      </div>
    </div>
  );
}
