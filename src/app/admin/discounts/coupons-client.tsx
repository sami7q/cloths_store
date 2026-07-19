"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { messages } from "@/lib/i18n";
import { COUPON_TYPES, COUPON_SCOPES } from "@/lib/enums";
import { deleteCoupon, saveCoupon } from "@/server/admin/discounts";
import { AdminIcons } from "@/components/admin/icons";
import { AdminSelect } from "@/components/admin/list-controls";
import { Modal } from "@/components/ui/modal";
import type { CouponRow } from "@/server/admin/discounts-data";
import { cn } from "@/lib/utils";

const t = messages.admin;
const td = t.discounts;

const input =
  "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none placeholder:text-gray-4 focus:border-navy";

export function CouponsClient({
  coupons,
  currency,
  categories,
  products,
}: {
  coupons: CouponRow[];
  currency: string;
  categories: { id: string; name: string }[];
  products: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<CouponRow | "new" | null>(null);

  const typeLabel = (type: string) =>
    ((td as Record<string, string>)[`type${type}`] ?? type);

  return (
    <div>
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-navy px-5 text-sm font-bold uppercase tracking-[0.5px] text-white hover:bg-navy-deep"
        >
          <AdminIcons.plus width={15} height={15} /> {td.addCoupon}
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-line bg-card/60 text-[11.5px] uppercase tracking-[0.5px] text-gray-6">
              <th className="px-4 py-3 text-start font-bold">{td.code}</th>
              <th className="px-4 py-3 text-start font-bold">{td.type}</th>
              <th className="px-4 py-3 text-start font-bold">{td.value}</th>
              <th className="px-4 py-3 text-start font-bold">{td.minSubtotal}</th>
              <th className="px-4 py-3 text-start font-bold">{td.usage}</th>
              <th className="px-4 py-3 text-start font-bold">{td.startsAt} → {td.endsAt}</th>
              <th className="px-4 py-3 text-start font-bold">{t.common.status}</th>
              <th className="px-4 py-3 text-start font-bold">{t.table.actions}</th>
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-4">
                  {t.table.empty}
                </td>
              </tr>
            )}
            {coupons.map((coupon) => (
              <tr key={coupon.code} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-mono text-[13px] font-bold text-navy">{coupon.code}</td>
                <td className="px-4 py-3">{typeLabel(coupon.type)}</td>
                <td className="px-4 py-3 font-bold">
                  {coupon.type === "PERCENT"
                    ? `${coupon.value}%`
                    : coupon.type === "FIXED"
                      ? `${coupon.value.toLocaleString("en-US")} ${currency}`
                      : "—"}
                </td>
                <td className="px-4 py-3 text-gray-6">
                  {coupon.minSubtotal ? `${coupon.minSubtotal.toLocaleString("en-US")} ${currency}` : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="font-bold">{coupon.usedCount}</span>
                  <span className="text-gray-4"> / {coupon.maxUses ?? td.unlimited}</span>
                  <span className="ms-2 text-xs text-gray-4">
                    ({coupon.ordersCount} {td.ordersUsed} — {coupon.revenue.toLocaleString("en-US")} {currency})
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-6">
                  {coupon.startsAt} → {coupon.endsAt}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-bold",
                      coupon.isActive ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#F3F4F6] text-[#6B7280]",
                    )}
                  >
                    {coupon.isActive ? t.common.active : t.common.inactive}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setEditing(coupon)} className="text-sm font-bold text-navy hover:underline">
                      {t.common.edit}
                    </button>
                    <form action={deleteCoupon}>
                      <input type="hidden" name="code" value={coupon.code} />
                      <button
                        type="submit"
                        aria-label={t.common.delete}
                        className="grid h-8 w-8 place-items-center rounded-lg text-gray-4 hover:bg-card hover:text-deal-red"
                      >
                        <AdminIcons.trash width={15} height={15} />
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CouponModal
        key={editing === null ? "closed" : editing === "new" ? "new" : editing.code}
        editing={editing}
        categories={categories}
        products={products}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function CouponModal({
  editing,
  categories,
  products,
  onClose,
  onSaved,
}: {
  editing: CouponRow | "new" | null;
  categories: { id: string; name: string }[];
  products: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const row = editing === "new" ? null : editing;
  const [type, setType] = useState(row?.type ?? "PERCENT");
  const [scope, setScope] = useState(row?.appliesTo ?? "ALL");
  const [targetIds, setTargetIds] = useState<string[]>(row?.targetIds ?? []);

  if (editing === null) return null;
  const typeLabel = (value: string) => (td as Record<string, string>)[`type${value}`] ?? value;
  const scopeLabel = (value: string) => (td as Record<string, string>)[`scope${value}`] ?? value;
  const targetOptions = scope === "CATEGORY" ? categories : products;

  const submit = (formData: FormData) => {
    setError(null);
    const num = (key: string) => {
      const v = String(formData.get(key) ?? "").trim();
      return v === "" ? null : Number(v);
    };
    startTransition(async () => {
      const result = await saveCoupon({
        originalCode: row?.code,
        code: String(formData.get("code") ?? ""),
        type,
        value: type === "FREE_SHIPPING" ? 0 : (num("value") ?? 0),
        minSubtotal: num("minSubtotal"),
        maxUses: num("maxUses"),
        perUserLimit: num("perUserLimit"),
        startsAt: String(formData.get("startsAt") ?? ""),
        endsAt: String(formData.get("endsAt") ?? ""),
        isActive: formData.get("isActive") === "on",
        appliesTo: scope,
        targetIds,
      });
      if (result.ok) onSaved();
      else setError(result.error);
    });
  };

  return (
    <Modal open onClose={onClose} title={row ? td.editCoupon : td.addCoupon} className="max-w-xl">
      <form action={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={td.code}>
            <input name="code" required defaultValue={row?.code ?? ""} placeholder="SUMMER20" className={`${input} font-mono uppercase`} />
          </Field>
          <Field label={td.type}>
            <AdminSelect value={type} onChange={(e) => setType(e.target.value)} className="h-10 w-full rounded-lg px-3">
              {COUPON_TYPES.map((value) => (
                <option key={value} value={value}>
                  {typeLabel(value)}
                </option>
              ))}
            </AdminSelect>
          </Field>
          {type !== "FREE_SHIPPING" && (
            <Field label={type === "PERCENT" ? `${td.value} (%)` : td.value}>
              <input name="value" type="number" min={0} step="0.01" required defaultValue={row?.value ?? ""} className={input} />
            </Field>
          )}
          <Field label={td.minSubtotal}>
            <input name="minSubtotal" type="number" min={0} step="0.01" defaultValue={row?.minSubtotal ?? ""} className={input} />
          </Field>
          <Field label={td.maxUses}>
            <input name="maxUses" type="number" min={1} defaultValue={row?.maxUses ?? ""} className={input} />
          </Field>
          <Field label={td.perUserLimit}>
            <input name="perUserLimit" type="number" min={1} defaultValue={row?.perUserLimit ?? ""} className={input} />
          </Field>
          <Field label={td.startsAt}>
            <input name="startsAt" type="date" required defaultValue={row?.startsAt ?? ""} className={input} />
          </Field>
          <Field label={td.endsAt}>
            <input name="endsAt" type="date" required defaultValue={row?.endsAt ?? ""} className={input} />
          </Field>
        </div>
        <Field label={td.appliesTo}>
          <AdminSelect
            value={scope}
            onChange={(e) => {
              setScope(e.target.value);
              setTargetIds([]);
            }}
            className="h-10 w-full rounded-lg px-3"
          >
            {COUPON_SCOPES.map((value) => (
              <option key={value} value={value}>
                {scopeLabel(value)}
              </option>
            ))}
          </AdminSelect>
        </Field>
        {scope !== "ALL" && (
          <Field label={td.targets}>
            <select
              multiple
              value={targetIds}
              onChange={(e) => setTargetIds([...e.target.selectedOptions].map((o) => o.value))}
              className="min-h-[120px] w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-navy"
            >
              {targetOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <label className="flex items-center gap-2 text-sm font-bold text-ink">
          <input type="checkbox" name="isActive" defaultChecked={row?.isActive ?? true} className="h-4 w-4 accent-navy" />
          {t.common.active}
        </label>
        {error && <p className="text-sm font-bold text-deal-red">{error}</p>}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="h-11 rounded-full bg-navy px-7 text-sm font-extrabold uppercase tracking-[0.5px] text-white hover:bg-navy-deep disabled:opacity-50"
          >
            {pending ? t.common.saving : t.common.save}
          </button>
          <button type="button" onClick={onClose} className="text-sm font-bold text-gray-6 hover:text-navy">
            {t.common.cancel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-bold uppercase tracking-[0.5px] text-gray-6">{label}</span>
      {children}
    </label>
  );
}
