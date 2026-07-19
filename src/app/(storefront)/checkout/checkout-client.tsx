"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useCartStore } from "@/lib/cart-store";
import { placeOrder, quoteCart, type CartQuote, type getCheckoutContext } from "@/server/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CartLayoutSkeleton } from "@/components/store/skeletons";
import { cn } from "@/lib/utils";

type Ctx = Awaited<ReturnType<typeof getCheckoutContext>>;
type Strings = typeof import("../../../../messages/en.json")["checkout"];
type CartStrings = typeof import("../../../../messages/en.json")["cart"];

const money = (n: number, c: string) => `${n.toLocaleString("en-US")} ${c}`;

const STEPS = ["contact", "address", "shipping", "payment", "review"] as const;
type Step = (typeof STEPS)[number];

export function CheckoutClient({ t, tc, ctx }: { t: Strings; tc: CartStrings; ctx: Ctx }) {
  const { items, clear } = useCartStore();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const [step, setStep] = useState<Step>("contact");
  const [contact, setContact] = useState({ name: ctx.user?.name ?? "", email: ctx.user?.email ?? "", phone: "" });
  const [address, setAddress] = useState({ country: "Egypt", city: "", area: "", street: "", building: "" });
  const [saveAddress, setSaveAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "COD">(ctx.codEnabled ? "COD" : "CARD");
  const [couponCode, setCouponCode] = useState("");
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [placing, setPlacing] = useState(false);

  const itemsKey = items.map((i) => `${i.variantId}:${i.quantity}`).join(",");
  const latest = useRef("");

  const refresh = useCallback(() => {
    if (!items.length) {
      setQuote(null);
      return;
    }
    const key = `${itemsKey}|${couponCode}|${paymentMethod}|${address.city}`;
    latest.current = key;
    startTransition(async () => {
      const q = await quoteCart({
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        couponCode: couponCode || null,
        paymentMethod,
        city: address.city || null,
        includeShipping: true,
      });
      if (latest.current === key) setQuote(q);
    });
  }, [items, itemsKey, couponCode, paymentMethod, address.city]);

  useEffect(() => {
    if (hydrated) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, itemsKey, couponCode, paymentMethod, address.city]);

  if (!hydrated) return <CartLayoutSkeleton />;

  if (!items.length && !placing) {
    return (
      <div className="rounded-[10px] border border-line bg-white p-14 text-center">
        <p className="text-lg text-gray-6">{tc.empty}</p>
        <Link href="/" className="mt-4 inline-block font-bold text-navy hover:underline">
          {tc.continueShopping} →
        </Link>
      </div>
    );
  }

  const zone = matchZoneClient(ctx.zones, address.city);
  const stepIndex = STEPS.indexOf(step);
  const contactValid = contact.name.trim().length >= 2 && /\S+@\S+\.\S+/.test(contact.email) && contact.phone.trim().length >= 6;
  const addressValid = address.city.trim().length >= 2 && address.street.trim().length >= 3 && address.country.trim().length >= 2;

  const submit = () => {
    setError(null);
    setPlacing(true);
    startTransition(async () => {
      const result = await placeOrder({
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        couponCode: couponCode || undefined,
        paymentMethod,
        contact,
        address: {
          country: address.country,
          city: address.city,
          area: address.area || undefined,
          street: address.street,
          building: address.building || undefined,
        },
        saveAddress,
      });
      if (!result.ok) {
        setPlacing(false);
        setError(t.errors[result.error as keyof typeof t.errors] ?? t.errors.invalid_input);
        return;
      }
      clear();
      window.location.assign(result.redirectUrl ?? `/checkout/success?order=${result.orderNumber}`);
    });
  };

  const field = (label: string, node: React.ReactNode) => (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-bold">{label}</span>
      {node}
    </label>
  );

  return (
    <div className="grid grid-cols-[1fr_360px] items-start gap-8 max-lg:grid-cols-1">
      <div className="rounded-[10px] border border-line bg-white p-6">
        {/* Stepper */}
        <ol className="mb-7 flex flex-wrap gap-2">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                disabled={i > stepIndex}
                onClick={() => setStep(s)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm font-bold uppercase tracking-[0.5px]",
                  s === step
                    ? "border-navy bg-navy text-white"
                    : i < stepIndex
                      ? "border-save-green text-save-green"
                      : "border-line text-gray-6",
                )}
              >
                {i + 1}. {t[s === "shipping" ? "shippingStep" : s]}
              </button>
            </li>
          ))}
        </ol>

        {step === "contact" ? (
          <div className="flex max-w-[480px] flex-col gap-4">
            {field(t.name, <Input value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} autoComplete="name" />)}
            {field(t.email, <Input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} autoComplete="email" />)}
            {field(t.phone, <Input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} autoComplete="tel" />)}
            <Button size="lg" disabled={!contactValid} onClick={() => setStep("address")}>
              {t.next}
            </Button>
          </div>
        ) : null}

        {step === "address" ? (
          <div className="flex max-w-[480px] flex-col gap-4">
            {ctx.addresses.length ? (
              <div>
                <p className="mb-2 text-sm font-bold">{t.savedAddresses}</p>
                <div className="flex flex-col gap-2">
                  {ctx.addresses.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() =>
                        setAddress({
                          country: a.country,
                          city: a.city,
                          area: a.area ?? "",
                          street: a.street,
                          building: a.building ?? "",
                        })
                      }
                      className="rounded-lg border border-line px-4 py-2.5 text-start text-sm hover:border-navy"
                    >
                      <b>{a.label}</b> — {a.city}, {a.street}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-sm font-bold text-gray-6">{t.newAddress}:</p>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-4">
              {field(t.country, <Input value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })} />)}
              {field(t.city, <Input value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} autoComplete="address-level2" />)}
            </div>
            {field(t.area, <Input value={address.area} onChange={(e) => setAddress({ ...address, area: e.target.value })} />)}
            {field(t.street, <Input value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} autoComplete="street-address" />)}
            {field(t.building, <Input value={address.building} onChange={(e) => setAddress({ ...address, building: e.target.value })} />)}
            {ctx.user ? (
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
                {t.saveAddress}
              </label>
            ) : null}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("contact")}>{t.back}</Button>
              <Button size="lg" disabled={!addressValid} onClick={() => setStep("shipping")}>{t.next}</Button>
            </div>
          </div>
        ) : null}

        {step === "shipping" ? (
          <div className="flex max-w-[480px] flex-col gap-4">
            {zone ? (
              <div className="rounded-lg border border-navy bg-card px-5 py-4">
                <p className="font-extrabold">{t.zoneMatched}: {zone.name}</p>
                <p className="mt-1 text-sm text-gray-6">
                  {money(zone.rate, ctx.currency)}
                  {zone.freeOver ? ` · ${tc.freeShipping} ≥ ${money(zone.freeOver, ctx.currency)}` : ""}
                </p>
                <p className="mt-1 text-sm text-gray-6">{t.eta}: {zone.etaText}</p>
              </div>
            ) : null}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("address")}>{t.back}</Button>
              <Button size="lg" onClick={() => setStep("payment")}>{t.next}</Button>
            </div>
          </div>
        ) : null}

        {step === "payment" ? (
          <div className="flex max-w-[480px] flex-col gap-3">
            {ctx.codEnabled ? (
              <label className={cn("flex cursor-pointer items-center justify-between rounded-lg border px-5 py-4", paymentMethod === "COD" ? "border-navy bg-card" : "border-line")}>
                <span className="flex items-center gap-3 font-bold">
                  <input type="radio" name="pay" checked={paymentMethod === "COD"} onChange={() => setPaymentMethod("COD")} />
                  {t.codLabel}
                </span>
                {ctx.codFee > 0 ? (
                  <span className="text-sm text-gray-6">
                    {t.codFeeNote}: {money(ctx.codFee, ctx.currency)}
                  </span>
                ) : null}
              </label>
            ) : null}
            <label
              className={cn(
                "flex items-center justify-between rounded-lg border px-5 py-4",
                !ctx.cardEnabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                paymentMethod === "CARD" ? "border-navy bg-card" : "border-line",
              )}
            >
              <span className="flex items-center gap-3 font-bold">
                <input type="radio" name="pay" disabled={!ctx.cardEnabled} checked={paymentMethod === "CARD"} onChange={() => setPaymentMethod("CARD")} />
                {t.cardLabel}
              </span>
              {!ctx.cardEnabled ? <span className="text-sm text-gray-6">{t.cardUnavailable}</span> : null}
            </label>
            <div className="mt-2 flex gap-3">
              <Button variant="outline" onClick={() => setStep("shipping")}>{t.back}</Button>
              <Button size="lg" onClick={() => setStep("review")}>{t.next}</Button>
            </div>
          </div>
        ) : null}

        {step === "review" ? (
          <div className="flex max-w-[560px] flex-col gap-4">
            <div className="rounded-lg border border-line px-5 py-4 text-sm leading-relaxed">
              <p><b>{t.contact}:</b> {contact.name} · {contact.email} · {contact.phone}</p>
              <p className="mt-1"><b>{t.address}:</b> {address.street}{address.building ? `, ${address.building}` : ""}, {address.area ? `${address.area}, ` : ""}{address.city}, {address.country}</p>
              <p className="mt-1"><b>{t.payment}:</b> {paymentMethod === "COD" ? t.codLabel : t.cardLabel}</p>
            </div>
            {error ? (
              <p className="rounded-lg bg-deal-bg px-4 py-3 text-sm font-semibold text-deal-red">{error}</p>
            ) : null}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("payment")} disabled={pending}>{t.back}</Button>
              <Button size="lg" onClick={submit} disabled={pending || !quote}>
                {pending ? t.processing : t.placeOrder}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Summary */}
      <aside className="sticky top-24 rounded-[10px] border border-line bg-white p-6">
        <h2 className="font-heading text-xl font-bold uppercase tracking-[1px]">{tc.summary}</h2>
        <ul className="mt-4 flex flex-col gap-2 border-b border-line pb-4 text-sm">
          {items.map((i) => (
            <li key={i.variantId} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">
                {i.quantity} × {i.name} <span className="text-gray-6">({i.colorName}/{i.size})</span>
              </span>
              <span className="font-bold">{money(i.unitPrice * i.quantity, ctx.currency)}</span>
            </li>
          ))}
        </ul>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder={tc.couponPlaceholder}
            aria-label={tc.couponPlaceholder}
            className="h-11 min-w-0 flex-1 rounded-full border border-line px-4 text-sm outline-none focus:border-navy"
          />
        </form>
        <dl className={cn("mt-4 flex flex-col gap-2.5 text-[15px]", pending && "opacity-60")}>
          <div className="flex justify-between">
            <dt className="text-gray-6">{tc.subtotal}</dt>
            <dd className="font-bold">{quote ? money(quote.subtotal, ctx.currency) : "…"}</dd>
          </div>
          {quote?.discounts.map((d, i) => (
            <div key={i} className="flex justify-between text-save-green">
              <dt className="max-w-[200px]">{d.label}</dt>
              <dd className="font-bold">−{money(d.amount, ctx.currency)}</dd>
            </div>
          ))}
          <div className="flex justify-between">
            <dt className="text-gray-6">{tc.shipping}</dt>
            <dd className="font-semibold">
              {quote == null ? "…" : quote.freeShipping ? tc.freeShipping : money(quote.shippingTotal ?? 0, ctx.currency)}
            </dd>
          </div>
          {quote && quote.codFee > 0 ? (
            <div className="flex justify-between">
              <dt className="text-gray-6">{t.codFeeNote}</dt>
              <dd className="font-semibold">{money(quote.codFee, ctx.currency)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-line pt-3 text-lg">
            <dt className="font-extrabold">{tc.total}</dt>
            <dd className="font-extrabold text-navy">{quote ? money(quote.grandTotal, ctx.currency) : "…"}</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}

function matchZoneClient(zones: Ctx["zones"], city: string) {
  if (!zones.length) return null;
  const c = city.trim().toLowerCase();
  if (c) {
    const exact = zones.find((z) => z.cities.some((zc) => zc.toLowerCase() === c));
    if (exact) return exact;
  }
  return zones.find((z) => z.cities.length === 0) ?? zones[0];
}
