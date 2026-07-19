"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { messages } from "@/lib/i18n";
import { PRODUCT_STATUSES } from "@/lib/enums";
import {
  saveProductGeneral,
  saveProductPricing,
  saveProductSeo,
  saveProductVisibility,
  type SaveResult,
} from "@/server/admin/products";
import { AdminSelect } from "@/components/admin/list-controls";
import { VariantsMatrix } from "./variants-matrix";
import { MediaManager } from "./media-manager";
import type { EditorVariant } from "@/server/admin/products-data";
import { cn } from "@/lib/utils";

const t = messages.admin.products;
const tc = messages.admin.common;

export type EditorProduct = {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  description: string;
  descriptionAr: string;
  material: string | null;
  brand: string | null;
  categoryId: string;
  sku: string;
  barcode: string | null;
  weight: number | null;
  tags: string[];
  basePrice: number;
  compareAtPrice: number | null;
  cardPrice: number | null;
  costPrice: number | null;
  status: string;
  isFeatured: boolean;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
};

type Props = {
  product: EditorProduct | null;
  categories: { id: string; name: string; parentId: string | null }[];
  currency: string;
  cardPercent: number | null;
  images: { id: string; url: string; alt: string; variantColorRef: string | null }[];
  variants: EditorVariant[];
};

const TABS = ["general", "pricing", "variants", "media", "seo", "visibility"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  general: t.tabGeneral,
  pricing: t.tabPricing,
  variants: t.tabVariants,
  media: t.tabMedia,
  seo: t.tabSeo,
  visibility: t.tabVisibility,
};

const input =
  "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none placeholder:text-gray-4 focus:border-navy";
const textarea =
  "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none placeholder:text-gray-4 focus:border-navy";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-bold uppercase tracking-[0.5px] text-gray-6">{label}</span>
      {children}
      {hint && <span className="text-xs text-gray-4">{hint}</span>}
    </label>
  );
}

function SaveRow({ pending, feedback, label }: { pending: boolean; feedback: SaveResult | null; label?: string }) {
  return (
    <div className="mt-1 flex items-center gap-3">
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-full bg-navy px-7 text-sm font-extrabold uppercase tracking-[0.5px] text-white hover:bg-navy-deep disabled:opacity-50"
      >
        {pending ? tc.saving : (label ?? tc.save)}
      </button>
      {feedback &&
        (feedback.ok ? (
          <p className="text-sm font-bold text-save-green">{feedback.message}</p>
        ) : (
          <p className="text-sm font-bold text-deal-red">{feedback.error}</p>
        ))}
    </div>
  );
}

export function ProductForm({ product, categories, currency, cardPercent, images, variants }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("general");
  const isNew = product === null;

  return (
    <div className="max-w-[980px]">
      <nav className="mb-5 flex flex-wrap gap-1 rounded-full border border-line bg-white p-1">
        {TABS.map((key) => {
          const locked = isNew && key !== "general" && key !== "pricing";
          return (
            <button
              key={key}
              type="button"
              disabled={locked || (isNew && key === "pricing")}
              onClick={() => setTab(key)}
              title={locked ? t.saveGeneralFirst : undefined}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40",
                tab === key ? "bg-navy text-white" : "text-gray-6 hover:text-navy",
              )}
            >
              {TAB_LABELS[key]}
            </button>
          );
        })}
      </nav>
      {isNew && <p className="mb-4 text-sm text-gray-4">{t.saveGeneralFirst}</p>}

      <div className="rounded-2xl border border-line bg-white p-6">
        {tab === "general" && (
          <GeneralTab
            product={product}
            categories={categories}
            onCreated={(id) => router.push(`/admin/products/${id}`)}
          />
        )}
        {tab === "pricing" && product && <PricingTab product={product} currency={currency} cardPercent={cardPercent} />}
        {tab === "variants" && product && (
          <VariantsMatrix productId={product.id} baseSku={product.sku} initial={variants} />
        )}
        {tab === "media" && product && (
          <MediaManager
            productId={product.id}
            images={images}
            colorNames={[...new Set(variants.map((v) => v.colorName))]}
          />
        )}
        {tab === "seo" && product && <SeoTab product={product} />}
        {tab === "visibility" && product && <VisibilityTab product={product} />}
      </div>
    </div>
  );
}

function GeneralTab({
  product,
  categories,
  onCreated,
}: {
  product: EditorProduct | null;
  categories: Props["categories"];
  onCreated: (id: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<SaveResult | null>(null);
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(product));

  const autoSlug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const submit = (formData: FormData) => {
    setFeedback(null);
    startTransition(async () => {
      const result = await saveProductGeneral({
        id: product?.id,
        name: String(formData.get("name") ?? ""),
        nameAr: String(formData.get("nameAr") ?? ""),
        slug: String(formData.get("slug") ?? ""),
        description: String(formData.get("description") ?? ""),
        descriptionAr: String(formData.get("descriptionAr") ?? ""),
        categoryId: String(formData.get("categoryId") ?? ""),
        material: String(formData.get("material") ?? "") || undefined,
        brand: String(formData.get("brand") ?? "") || undefined,
        sku: String(formData.get("sku") ?? ""),
        barcode: String(formData.get("barcode") ?? "") || undefined,
        weight: formData.get("weight") ? Number(formData.get("weight")) : undefined,
        tags: String(formData.get("tags") ?? ""),
      });
      setFeedback(result);
      if (result.ok) {
        if (!product) onCreated(result.id);
        else router.refresh();
      }
    });
  };

  return (
    <form action={submit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Field label={t.nameEn}>
        <input
          name="name"
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(autoSlug(e.target.value));
          }}
          className={input}
        />
      </Field>
      <Field label={tc.nameAr}>
        <input name="nameAr" required defaultValue={product?.nameAr ?? ""} dir="rtl" className={input} />
      </Field>
      <Field label={tc.slug}>
        <input
          name="slug"
          required
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(autoSlug(e.target.value));
          }}
          className={input}
        />
      </Field>
      <Field label={t.baseSku}>
        <input name="sku" required defaultValue={product?.sku ?? ""} className={input} />
      </Field>
      <div className="md:col-span-2">
        <Field label={t.descriptionEn}>
          <textarea name="description" required rows={4} defaultValue={product?.description ?? ""} className={textarea} />
        </Field>
      </div>
      <div className="md:col-span-2">
        <Field label={t.descriptionAr}>
          <textarea name="descriptionAr" required rows={4} dir="rtl" defaultValue={product?.descriptionAr ?? ""} className={textarea} />
        </Field>
      </div>
      <Field label={t.category}>
        <AdminSelect name="categoryId" required defaultValue={product?.categoryId ?? ""} className="h-10 w-full rounded-lg px-3">
          <option value="" disabled>
            {t.category}…
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.parentId ? `— ${c.name}` : c.name}
            </option>
          ))}
        </AdminSelect>
      </Field>
      <Field label={t.material}>
        <input name="material" defaultValue={product?.material ?? ""} className={input} />
      </Field>
      <Field label={t.brand}>
        <input name="brand" defaultValue={product?.brand ?? ""} className={input} />
      </Field>
      <Field label={t.weight}>
        <input name="weight" type="number" min={0} defaultValue={product?.weight ?? ""} className={input} />
      </Field>
      <div className="md:col-span-2">
        <Field label={t.tags} hint={t.tagsHint}>
          <input name="tags" defaultValue={(product?.tags ?? []).join(", ")} className={input} />
        </Field>
      </div>
      <input type="hidden" name="barcode" value={product?.barcode ?? ""} readOnly />
      <div className="md:col-span-2">
        <SaveRow pending={pending} feedback={feedback} label={product ? tc.save : tc.create} />
      </div>
    </form>
  );
}

function PricingTab({
  product,
  currency,
  cardPercent,
}: {
  product: EditorProduct;
  currency: string;
  cardPercent: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<SaveResult | null>(null);
  const [basePrice, setBasePrice] = useState(String(product.basePrice));
  const [mode, setMode] = useState<"auto" | "manual" | "none">(
    product.cardPrice === null ? (cardPercent ? "auto" : "none") : "manual",
  );

  const autoPreview =
    cardPercent && basePrice !== "" ? Math.round(Number(basePrice) * (1 - cardPercent / 100) * 100) / 100 : null;

  const submit = (formData: FormData) => {
    setFeedback(null);
    startTransition(async () => {
      const num = (key: string) => {
        const v = String(formData.get(key) ?? "");
        return v === "" ? null : Number(v);
      };
      const result = await saveProductPricing({
        id: product.id,
        basePrice: Number(formData.get("basePrice") ?? 0),
        compareAtPrice: num("compareAtPrice"),
        costPrice: num("costPrice"),
        cardPriceMode: mode,
        cardPrice: num("cardPrice"),
      });
      setFeedback(result);
      if (result.ok) router.refresh();
    });
  };

  return (
    <form action={submit} className="grid max-w-[620px] grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label={`${t.basePrice} (${currency})`}>
        <input
          name="basePrice"
          type="number"
          min={0}
          step="0.01"
          required
          value={basePrice}
          onChange={(e) => setBasePrice(e.target.value)}
          className={input}
        />
      </Field>
      <Field label={`${t.compareAtPrice} (${currency})`}>
        <input name="compareAtPrice" type="number" min={0} step="0.01" defaultValue={product.compareAtPrice ?? ""} className={input} />
      </Field>
      <Field label={`${t.costPrice} (${currency})`}>
        <input name="costPrice" type="number" min={0} step="0.01" defaultValue={product.costPrice ?? ""} className={input} />
      </Field>
      <div className="sm:col-span-2">
        <Field label={t.cardPrice} hint={mode === "auto" ? t.cardPriceAutoHint : undefined}>
          <div className="flex flex-wrap items-center gap-2">
            <AdminSelect
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
              className="h-10 rounded-lg px-3"
              aria-label={t.cardPrice}
            >
              {cardPercent !== null && <option value="auto">{t.cardPriceAuto} ({cardPercent}%)</option>}
              <option value="manual">{t.cardPriceManual}</option>
              <option value="none">{tc.none}</option>
            </AdminSelect>
            {mode === "manual" ? (
              <input
                name="cardPrice"
                type="number"
                min={0}
                step="0.01"
                defaultValue={product.cardPrice ?? ""}
                className={`${input} w-36`}
              />
            ) : mode === "auto" && autoPreview !== null ? (
              <span className="text-sm font-bold text-navy">
                ≈ {autoPreview.toLocaleString("en-US")} {currency}
              </span>
            ) : null}
          </div>
        </Field>
      </div>
      <div className="sm:col-span-2">
        <SaveRow pending={pending} feedback={feedback} />
      </div>
    </form>
  );
}

function SeoTab({ product }: { product: EditorProduct }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<SaveResult | null>(null);

  const submit = (formData: FormData) => {
    setFeedback(null);
    startTransition(async () => {
      const result = await saveProductSeo({
        id: product.id,
        seoTitle: String(formData.get("seoTitle") ?? "") || undefined,
        seoDescription: String(formData.get("seoDescription") ?? "") || undefined,
      });
      setFeedback(result);
      if (result.ok) router.refresh();
    });
  };

  return (
    <form action={submit} className="flex max-w-[620px] flex-col gap-4">
      <Field label={t.seoTitleField}>
        <input name="seoTitle" defaultValue={product.seoTitle ?? ""} maxLength={160} className={input} />
      </Field>
      <Field label={t.seoDescriptionField}>
        <textarea name="seoDescription" rows={3} defaultValue={product.seoDescription ?? ""} maxLength={320} className={textarea} />
      </Field>
      <SaveRow pending={pending} feedback={feedback} />
    </form>
  );
}

function VisibilityTab({ product }: { product: EditorProduct }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<SaveResult | null>(null);
  const statuses = messages.admin.statuses as Record<string, string>;

  const submit = (formData: FormData) => {
    setFeedback(null);
    startTransition(async () => {
      const result = await saveProductVisibility({
        id: product.id,
        status: String(formData.get("status")) as (typeof PRODUCT_STATUSES)[number],
        isFeatured: formData.get("isFeatured") === "on",
        sortOrder: Number(formData.get("sortOrder") ?? 0),
      });
      setFeedback(result);
      if (result.ok) router.refresh();
    });
  };

  return (
    <form action={submit} className="flex max-w-[420px] flex-col gap-4">
      <Field label={t.statusField}>
        <AdminSelect name="status" defaultValue={product.status} className="h-10 w-full rounded-lg px-3">
          {PRODUCT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statuses[s]}
            </option>
          ))}
        </AdminSelect>
      </Field>
      <label className="flex items-center gap-2 text-sm font-bold text-ink">
        <input type="checkbox" name="isFeatured" defaultChecked={product.isFeatured} className="h-4 w-4 accent-navy" />
        {t.featuredField}
      </label>
      <Field label={tc.sortOrder}>
        <input name="sortOrder" type="number" min={0} defaultValue={product.sortOrder} className={input} />
      </Field>
      <SaveRow pending={pending} feedback={feedback} />
    </form>
  );
}
