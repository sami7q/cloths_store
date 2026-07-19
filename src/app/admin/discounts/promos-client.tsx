"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { messages } from "@/lib/i18n";
import { PROMO_TYPES } from "@/lib/enums";
import { deletePromoRule, movePromoRule, savePromoRule, togglePromoRule } from "@/server/admin/discounts";
import { AdminIcons } from "@/components/admin/icons";
import { AdminSelect } from "@/components/admin/list-controls";
import { Modal } from "@/components/ui/modal";
import type { PromoRow } from "@/server/admin/discounts-data";
import { cn } from "@/lib/utils";

const t = messages.admin;
const td = t.discounts;

const input =
  "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none placeholder:text-gray-4 focus:border-navy";

type Tier = { nth: number; percentOff: number };
type Collection = { slug: string; name: string };

/** Plain-language preview sentence for a rule config (§6.7). */
export function promoPreview(
  type: string,
  config: Record<string, unknown>,
  collections: Collection[],
  currency: string,
): string {
  switch (type) {
    case "BUY_X_GET_DISCOUNT": {
      const tiers = ((config.tiers as Tier[]) ?? [])
        .map((tier) => td.previewTier.replace("{nth}", String(tier.nth)).replace("{pct}", String(tier.percentOff)))
        .join(" · ");
      return td.previewMultiBuy.replace("{tiers}", tiers || "—");
    }
    case "BUNDLE_PRICE": {
      const name = collections.find((c) => c.slug === config.collectionSlug)?.name ?? String(config.collectionSlug ?? "?");
      return td.previewBundle
        .replace("{qty}", String(config.quantity ?? "?"))
        .replace("{collection}", name)
        .replace("{price}", `${Number(config.bundlePrice ?? 0).toLocaleString("en-US")} ${currency}`);
    }
    case "CARD_EXTRA_PERCENT":
      return td.previewCard.replace("{pct}", String(config.percentOff ?? "?"));
    case "FREE_SHIPPING_OVER":
      return td.previewShipping.replace(
        "{threshold}",
        `${Number(config.threshold ?? 0).toLocaleString("en-US")} ${currency}`,
      );
    default:
      return "";
  }
}

export function PromosClient({
  promos,
  collections,
  currency,
}: {
  promos: PromoRow[];
  collections: Collection[];
  currency: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<PromoRow | "new" | null>(null);
  const typeLabel = (value: string) => (td as Record<string, string>)[`type${value}`] ?? value;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-navy px-5 text-sm font-bold uppercase tracking-[0.5px] text-white hover:bg-navy-deep"
        >
          <AdminIcons.plus width={15} height={15} /> {td.addPromo}
        </button>
        <p className="text-xs text-gray-4">{td.priorityHint}</p>
      </div>

      <ul className="flex flex-col gap-3">
        {promos.map((promo, index) => (
          <li key={promo.id} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4">
            <div className="flex flex-col gap-1">
              <form action={movePromoRule}>
                <input type="hidden" name="id" value={promo.id} />
                <input type="hidden" name="direction" value="up" />
                <button
                  type="submit"
                  disabled={index === 0}
                  aria-label={td.moveUp}
                  className="grid h-7 w-7 place-items-center rounded-lg text-gray-4 hover:bg-card hover:text-navy disabled:opacity-30"
                >
                  ▲
                </button>
              </form>
              <form action={movePromoRule}>
                <input type="hidden" name="id" value={promo.id} />
                <input type="hidden" name="direction" value="down" />
                <button
                  type="submit"
                  disabled={index === promos.length - 1}
                  aria-label={td.moveDown}
                  className="grid h-7 w-7 place-items-center rounded-lg text-gray-4 hover:bg-card hover:text-navy disabled:opacity-30"
                >
                  ▼
                </button>
              </form>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-heading text-[15px] font-bold uppercase tracking-[0.5px] text-ink">
                  {promo.name}
                </span>
                <span className="rounded-full bg-card px-2.5 py-0.5 text-[11px] font-bold uppercase text-gray-6">
                  {typeLabel(promo.type)}
                </span>
                <span className="text-[11px] font-bold uppercase text-gray-4">
                  {td.priority}: {promo.priority}
                </span>
              </div>
              <p className="mt-1 truncate text-sm text-navy">
                “{promoPreview(promo.type, (promo.config ?? {}) as Record<string, unknown>, collections, currency)}”
              </p>
            </div>
            <form action={togglePromoRule}>
              <input type="hidden" name="id" value={promo.id} />
              <button
                type="submit"
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-bold uppercase",
                  promo.isActive ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#F3F4F6] text-[#6B7280]",
                )}
              >
                {promo.isActive ? t.common.active : t.common.inactive}
              </button>
            </form>
            <button type="button" onClick={() => setEditing(promo)} className="text-sm font-bold text-navy hover:underline">
              {t.common.edit}
            </button>
            <form action={deletePromoRule}>
              <input type="hidden" name="id" value={promo.id} />
              <button
                type="submit"
                aria-label={t.common.delete}
                className="grid h-8 w-8 place-items-center rounded-lg text-gray-4 hover:bg-card hover:text-deal-red"
              >
                <AdminIcons.trash width={15} height={15} />
              </button>
            </form>
          </li>
        ))}
        {promos.length === 0 && (
          <li className="rounded-2xl border border-dashed border-line py-10 text-center text-sm text-gray-4">
            {t.table.empty}
          </li>
        )}
      </ul>

      <PromoModal
        key={editing === null ? "closed" : editing === "new" ? "new" : editing.id}
        editing={editing}
        collections={collections}
        currency={currency}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function PromoModal({
  editing,
  collections,
  currency,
  onClose,
  onSaved,
}: {
  editing: PromoRow | "new" | null;
  collections: Collection[];
  currency: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const row = editing === "new" ? null : editing;
  const initialConfig = (row?.config ?? {}) as Record<string, unknown>;

  const [name, setName] = useState(row?.name ?? "");
  const [type, setType] = useState(row?.type ?? "BUY_X_GET_DISCOUNT");
  const [priority, setPriority] = useState(String(row?.priority ?? 10));
  const [isActive, setIsActive] = useState(row?.isActive ?? true);
  const [tiers, setTiers] = useState<Tier[]>((initialConfig.tiers as Tier[]) ?? [{ nth: 2, percentOff: 15 }]);
  const [collectionSlug, setCollectionSlug] = useState(String(initialConfig.collectionSlug ?? collections[0]?.slug ?? ""));
  const [quantity, setQuantity] = useState(String(initialConfig.quantity ?? 3));
  const [bundlePrice, setBundlePrice] = useState(String(initialConfig.bundlePrice ?? ""));
  const [percentOff, setPercentOff] = useState(String(initialConfig.percentOff ?? 15));
  const [threshold, setThreshold] = useState(String(initialConfig.threshold ?? ""));

  if (editing === null) return null;
  const typeLabel = (value: string) => (td as Record<string, string>)[`type${value}`] ?? value;

  const config: Record<string, unknown> =
    type === "BUY_X_GET_DISCOUNT"
      ? { tiers }
      : type === "BUNDLE_PRICE"
        ? { collectionSlug, quantity: Number(quantity), bundlePrice: Number(bundlePrice) }
        : type === "CARD_EXTRA_PERCENT"
          ? { percentOff: Number(percentOff) }
          : { threshold: Number(threshold) };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await savePromoRule({
        id: row?.id,
        name,
        type,
        priority: Number(priority) || 0,
        isActive,
        config,
      });
      if (result.ok) onSaved();
      else setError(result.error);
    });
  };

  return (
    <Modal open onClose={onClose} title={row ? td.editPromo : td.addPromo} className="max-w-xl">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={td.promoName}>
            <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
          </Field>
          <Field label={td.promoType}>
            <AdminSelect value={type} onChange={(e) => setType(e.target.value)} className="h-10 w-full rounded-lg px-3" disabled={Boolean(row)}>
              {PROMO_TYPES.map((value) => (
                <option key={value} value={value}>
                  {typeLabel(value)}
                </option>
              ))}
            </AdminSelect>
          </Field>
        </div>

        {type === "BUY_X_GET_DISCOUNT" && (
          <div className="rounded-xl border border-line bg-card/50 p-4">
            <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.5px] text-gray-6">{td.tiers}</p>
            <div className="flex flex-col gap-2">
              {tiers.map((tier, i) => (
                <div key={i} className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-sm text-gray-6">
                    {td.nthItem}
                    <input
                      type="number"
                      min={2}
                      max={10}
                      value={tier.nth}
                      onChange={(e) =>
                        setTiers((ts) => ts.map((x, j) => (j === i ? { ...x, nth: Number(e.target.value) || 2 } : x)))
                      }
                      className="h-9 w-16 rounded-lg border border-line bg-white px-2 text-sm outline-none focus:border-navy"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 text-sm text-gray-6">
                    {td.percentOff}
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={tier.percentOff}
                      onChange={(e) =>
                        setTiers((ts) => ts.map((x, j) => (j === i ? { ...x, percentOff: Number(e.target.value) || 1 } : x)))
                      }
                      className="h-9 w-20 rounded-lg border border-line bg-white px-2 text-sm outline-none focus:border-navy"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setTiers((ts) => (ts.length > 1 ? ts.filter((_, j) => j !== i) : ts))}
                    aria-label={t.common.remove}
                    className="grid h-8 w-8 place-items-center rounded-lg text-gray-4 hover:bg-white hover:text-deal-red"
                  >
                    <AdminIcons.trash width={14} height={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setTiers((ts) => [...ts, { nth: Math.min(10, (ts[ts.length - 1]?.nth ?? 1) + 1), percentOff: 30 }])}
                className="inline-flex items-center gap-1.5 self-start text-sm font-bold text-navy hover:underline"
              >
                <AdminIcons.plus width={13} height={13} /> {td.addTier}
              </button>
            </div>
          </div>
        )}

        {type === "BUNDLE_PRICE" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label={td.collection}>
              <AdminSelect value={collectionSlug} onChange={(e) => setCollectionSlug(e.target.value)} className="h-10 w-full rounded-lg px-3">
                {collections.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </AdminSelect>
            </Field>
            <Field label={td.quantity}>
              <input type="number" min={2} max={20} value={quantity} onChange={(e) => setQuantity(e.target.value)} className={input} />
            </Field>
            <Field label={`${td.bundlePrice} (${currency})`}>
              <input type="number" min={1} value={bundlePrice} onChange={(e) => setBundlePrice(e.target.value)} className={input} />
            </Field>
          </div>
        )}

        {type === "CARD_EXTRA_PERCENT" && (
          <Field label={`${td.percentOff}`}>
            <input type="number" min={1} max={90} value={percentOff} onChange={(e) => setPercentOff(e.target.value)} className={`${input} w-32`} />
          </Field>
        )}

        {type === "FREE_SHIPPING_OVER" && (
          <Field label={`${td.thresholdField} (${currency})`}>
            <input type="number" min={1} value={threshold} onChange={(e) => setThreshold(e.target.value)} className={`${input} w-40`} />
          </Field>
        )}

        <div className="rounded-xl bg-navy/5 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.5px] text-gray-4">{td.preview}</p>
          <p className="mt-0.5 text-sm font-bold text-navy">
            “{promoPreview(type, config, collections, currency)}”
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Field label={td.priority}>
            <input type="number" min={0} value={priority} onChange={(e) => setPriority(e.target.value)} className={`${input} w-24`} />
          </Field>
          <label className="mt-5 flex items-center gap-2 text-sm font-bold text-ink">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 accent-navy" />
            {t.common.active}
          </label>
        </div>

        {error && <p className="text-sm font-bold text-deal-red">{error}</p>}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={pending || name.trim().length < 2}
            className="h-11 rounded-full bg-navy px-7 text-sm font-extrabold uppercase tracking-[0.5px] text-white hover:bg-navy-deep disabled:opacity-50"
          >
            {pending ? t.common.saving : t.common.save}
          </button>
          <button type="button" onClick={onClose} className="text-sm font-bold text-gray-6 hover:text-navy">
            {t.common.cancel}
          </button>
        </div>
      </div>
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
