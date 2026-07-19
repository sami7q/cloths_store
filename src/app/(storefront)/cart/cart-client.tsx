"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useCartStore } from "@/lib/cart-store";
import { quoteCart, type CartQuote } from "@/server/cart";
import { Button } from "@/components/ui/button";
import { CartLayoutSkeleton } from "@/components/store/skeletons";
import { SmartImage } from "@/components/ui/smart-image";

type Strings = typeof import("../../../../messages/en.json")["cart"];

const money = (n: number, c: string) => `${n.toLocaleString("en-US")} ${c}`;

export function CartClient({ t, currency }: { t: Strings; currency: string }) {
  const { items, setQuantity, remove } = useCartStore();
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const itemsKey = items.map((i) => `${i.variantId}:${i.quantity}`).join(",");
  const latest = useRef("");
  const refresh = useCallback(
    (coupon: string | null) => {
      const key = `${itemsKey}|${coupon ?? ""}`;
      latest.current = key;
      if (!items.length) {
        setQuote(null);
        return;
      }
      startTransition(async () => {
        const q = await quoteCart({
          items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
          couponCode: coupon,
          paymentMethod: "COD",
          includeShipping: false,
        });
        if (latest.current === key) setQuote(q);
      });
    },
    [items, itemsKey],
  );

  useEffect(() => {
    if (hydrated) refresh(appliedCoupon);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, itemsKey, appliedCoupon]);

  if (!hydrated) return <CartLayoutSkeleton />;

  if (!items.length) {
    return (
      <div className="rounded-[10px] border border-line bg-white p-14 text-center">
        <p className="text-lg text-gray-6">{t.empty}</p>
        <Link href="/" className="mt-4 inline-block font-bold text-navy hover:underline">
          {t.continueShopping} →
        </Link>
      </div>
    );
  }

  const couponErrorLabel =
    quote?.couponError === "expired"
      ? t.couponExpired
      : quote?.couponError === "min_subtotal"
        ? t.couponMin
        : quote?.couponError === "exhausted"
          ? t.couponExhausted
          : quote?.couponError
            ? t.couponInvalid
            : null;

  return (
    <div className="grid grid-cols-[1fr_360px] items-start gap-8 max-lg:grid-cols-1">
      {/* Lines */}
      <ul className="flex flex-col gap-4">
        {items.map((item) => (
          <li key={item.variantId} className="flex gap-5 rounded-[10px] border border-line bg-white p-4">
            <Link href={`/product/${item.slug}`} className="flex size-24 shrink-0 items-center justify-center rounded-lg bg-card">
              {item.imageUrl ? (
                <SmartImage src={item.imageUrl} alt={item.name} width={96} height={96} sizes="80px" className="h-4/5 w-4/5 object-contain" />
              ) : null}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={`/product/${item.slug}`} className="font-extrabold hover:text-navy">
                    {item.name}
                  </Link>
                  <p className="mt-0.5 text-sm text-gray-6">
                    {item.colorName} / {item.size}
                  </p>
                </div>
                <span className="font-extrabold">{money(item.unitPrice * item.quantity, currency)}</span>
              </div>
              <div className="mt-auto flex items-center justify-between pt-3">
                <div className="flex items-center rounded-full border border-line">
                  <button
                    type="button"
                    aria-label={t.decreaseQty}
                    onClick={() => setQuantity(item.variantId, item.quantity - 1)}
                    className="flex size-9 items-center justify-center text-lg font-bold text-gray-6 hover:text-ink"
                  >
                    −
                  </button>
                  <span className="min-w-7 text-center text-[15px] font-extrabold">{item.quantity}</span>
                  <button
                    type="button"
                    aria-label={t.increaseQty}
                    onClick={() => setQuantity(item.variantId, Math.min(item.quantity + 1, item.maxStock))}
                    className="flex size-9 items-center justify-center text-lg font-bold text-gray-6 hover:text-ink"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => remove(item.variantId)}
                  className="text-sm font-bold text-gray-6 hover:text-deal-red"
                >
                  {t.remove} ✕
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Sticky summary */}
      <aside className="sticky top-24 rounded-[10px] border border-line bg-white p-6">
        <h2 className="font-heading text-xl font-bold uppercase tracking-[1px]">{t.summary}</h2>

        {quote?.adjusted.length ? (
          <p className="mt-3 rounded-lg bg-deal-bg px-3 py-2 text-sm font-semibold text-deal-red">
            {t.stockAdjusted}
          </p>
        ) : null}

        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setAppliedCoupon(couponCode.trim() || null);
          }}
        >
          <input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder={t.couponPlaceholder}
            aria-label={t.couponPlaceholder}
            className="h-11 min-w-0 flex-1 rounded-full border border-line px-4 text-sm outline-none focus:border-navy"
          />
          <Button type="submit" size="sm" variant="outline" className="h-11">
            {t.apply}
          </Button>
        </form>
        {couponErrorLabel ? (
          <p className="mt-2 text-sm font-semibold text-deal-red">{couponErrorLabel}</p>
        ) : null}

        <dl className={`mt-5 flex flex-col gap-2.5 border-t border-line pt-5 text-[15px] ${pending ? "opacity-60" : ""}`}>
          <div className="flex justify-between">
            <dt className="text-gray-6">{t.subtotal}</dt>
            <dd className="font-bold">{quote ? money(quote.subtotal, currency) : "…"}</dd>
          </div>
          {quote?.discounts.map((d, i) => (
            <div key={i} className="flex justify-between text-save-green">
              <dt className="max-w-[220px]">{d.label}</dt>
              <dd className="font-bold">−{money(d.amount, currency)}</dd>
            </div>
          ))}
          <div className="flex justify-between">
            <dt className="text-gray-6">{t.shipping}</dt>
            <dd className="font-semibold text-gray-6">
              {quote?.freeShipping ? t.freeShipping : t.shippingAtCheckout}
            </dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-lg">
            <dt className="font-extrabold">{t.total}</dt>
            <dd className="font-extrabold text-navy">{quote ? money(quote.grandTotal, currency) : "…"}</dd>
          </div>
        </dl>

        <Link href="/checkout" className="mt-5 block">
          <Button size="lg" className="w-full" disabled={pending || !quote}>
            {t.checkout}
          </Button>
        </Link>
      </aside>
    </div>
  );
}
