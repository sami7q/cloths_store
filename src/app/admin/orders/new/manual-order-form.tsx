"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { messages } from "@/lib/i18n";
import { createManualOrder } from "@/server/admin/orders";
import { AdminSelect } from "@/components/admin/list-controls";
import { AdminIcons } from "@/components/admin/icons";

const t = messages.admin;

type Customer = { id: string; name: string; email: string; phone: string | null };
type CatalogProduct = {
  id: string;
  name: string;
  variants: { id: string; label: string; stock: number; price: number }[];
};
type ItemRow = { key: number; productId: string; variantId: string; quantity: number };

export function ManualOrderForm({
  customers,
  products,
  cities,
  codEnabled,
  currency,
}: {
  customers: Customer[];
  products: CatalogProduct[];
  cities: string[];
  codEnabled: boolean;
  currency: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"customer" | "guest">("customer");
  const [customerId, setCustomerId] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState(cities[0] ?? "");
  const [street, setStreet] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "CARD">(codEnabled ? "COD" : "CARD");
  const [couponCode, setCouponCode] = useState("");
  const [items, setItems] = useState<ItemRow[]>([{ key: 1, productId: "", variantId: "", quantity: 1 }]);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const selectCustomer = (id: string) => {
    setCustomerId(id);
    const c = customers.find((x) => x.id === id);
    if (c) {
      setContactName(c.name);
      if (c.phone) setPhone(c.phone);
    }
  };

  const setItem = (key: number, patch: Partial<ItemRow>) =>
    setItems((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const estimate = items.reduce((sum, row) => {
    const v = productById.get(row.productId)?.variants.find((x) => x.id === row.variantId);
    return sum + (v ? v.price * row.quantity : 0);
  }, 0);

  const submit = () => {
    setError(null);
    const validItems = items
      .filter((r) => r.variantId && r.quantity > 0)
      .map((r) => ({ variantId: r.variantId, quantity: r.quantity }));
    if (!validItems.length) {
      setError(t.orders.noItems);
      return;
    }
    startTransition(async () => {
      const result = await createManualOrder({
        customerId: mode === "customer" ? customerId || undefined : undefined,
        guest: mode === "guest" ? { email: guestEmail, phone: guestPhone } : undefined,
        contactName,
        city,
        street,
        phone,
        paymentMethod,
        items: validItems,
        couponCode: couponCode.trim() || undefined,
      });
      if (result.ok) router.push(`/admin/orders/${result.orderNumber}`);
      else setError(result.error);
    });
  };

  const input =
    "h-10 w-full rounded-full border border-line bg-white px-4 text-sm outline-none placeholder:text-gray-4 focus:border-navy";

  return (
    <div className="grid max-w-[960px] grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="flex flex-col gap-4">
        <section className="rounded-2xl border border-line bg-white p-5">
          <div className="mb-4 flex gap-1 rounded-full border border-line bg-card p-1">
            {(["customer", "guest"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-full px-4 py-1.5 text-sm font-bold ${mode === m ? "bg-navy text-white" : "text-gray-6"}`}
              >
                {m === "customer" ? t.orders.existingCustomer : t.orders.guestOrder}
              </button>
            ))}
          </div>
          {mode === "customer" ? (
            <AdminSelect value={customerId} onChange={(e) => selectCustomer(e.target.value)} className="w-full" aria-label={t.orders.existingCustomer}>
              <option value="">{t.orders.existingCustomer}…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.email}
                </option>
              ))}
            </AdminSelect>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder={t.orders.guestEmail} type="email" className={input} />
              <input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder={t.orders.guestPhone} className={input} />
            </div>
          )}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder={t.orders.fullName} className={input} />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.orders.phone} className={input} />
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder={t.orders.city} list="mo-cities" className={input} />
            <datalist id="mo-cities">
              {cities.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <input value={street} onChange={(e) => setStreet(e.target.value)} placeholder={t.orders.street} className={input} />
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="mb-3 font-heading text-[15px] font-bold uppercase tracking-[0.5px]">{t.orders.items}</h2>
          <div className="flex flex-col gap-3">
            {items.map((row) => {
              const product = productById.get(row.productId);
              return (
                <div key={row.key} className="flex flex-wrap items-center gap-2">
                  <AdminSelect
                    value={row.productId}
                    onChange={(e) => setItem(row.key, { productId: e.target.value, variantId: "" })}
                    className="min-w-[200px] flex-1"
                    aria-label={t.orders.product}
                  >
                    <option value="">{t.orders.product}…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </AdminSelect>
                  <AdminSelect
                    value={row.variantId}
                    onChange={(e) => setItem(row.key, { variantId: e.target.value })}
                    disabled={!product}
                    className="min-w-[170px]"
                    aria-label={t.orders.variant}
                  >
                    <option value="">{t.orders.variant}…</option>
                    {product?.variants.map((v) => (
                      <option key={v.id} value={v.id} disabled={v.stock <= 0}>
                        {v.label} — {v.price} {currency}
                        {v.stock <= 0 ? ` (${t.orders.outOfStock})` : ` (${v.stock})`}
                      </option>
                    ))}
                  </AdminSelect>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={row.quantity}
                    onChange={(e) => setItem(row.key, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                    aria-label={t.orders.quantity}
                    className="h-10 w-[76px] rounded-full border border-line bg-white px-3 text-center text-sm outline-none focus:border-navy"
                  />
                  <button
                    type="button"
                    onClick={() => setItems((rows) => (rows.length > 1 ? rows.filter((r) => r.key !== row.key) : rows))}
                    aria-label={t.common.remove}
                    className="grid h-10 w-10 place-items-center rounded-full text-gray-4 hover:bg-card hover:text-deal-red"
                  >
                    <AdminIcons.trash width={17} height={17} />
                  </button>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setItems((rows) => [...rows, { key: Math.max(...rows.map((r) => r.key)) + 1, productId: "", variantId: "", quantity: 1 }])}
            className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-navy hover:underline"
          >
            <AdminIcons.plus width={15} height={15} /> {t.orders.addItem}
          </button>
        </section>
      </div>

      <div className="flex flex-col gap-4">
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="mb-3 font-heading text-[15px] font-bold uppercase tracking-[0.5px]">{t.orders.payment}</h2>
          <AdminSelect
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as "COD" | "CARD")}
            className="w-full"
            aria-label={t.orders.paymentMethod}
          >
            {codEnabled && <option value="COD">{(t.statuses as Record<string, string>).COD}</option>}
            <option value="CARD">{(t.statuses as Record<string, string>).CARD}</option>
          </AdminSelect>
          <input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder={t.orders.coupon}
            className={`${input} mt-3`}
          />
          <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-sm">
            <span className="text-gray-6">{t.orders.subtotal} (~)</span>
            <span className="font-heading text-lg font-bold text-navy">
              {estimate.toLocaleString("en-US")} {currency}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-4">{t.orders.manualTotalsNote}</p>
          {error && <p className="mt-3 text-sm font-bold text-deal-red">{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="mt-4 h-11 w-full rounded-full bg-navy text-sm font-extrabold uppercase tracking-[0.5px] text-white hover:bg-navy-deep disabled:opacity-50"
          >
            {pending ? t.common.saving : t.orders.createOrder}
          </button>
        </section>
      </div>
    </div>
  );
}
