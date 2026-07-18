"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type PdpVariant = {
  id: string;
  colorName: string;
  colorHex: string;
  size: string;
  stock: number;
  lowStockAt: number;
  /** Pre-formatted variant price override, when it differs. */
  priceLabel: string | null;
};

export type PdpImage = { url: string; alt: string; variantColorRef: string | null };

type Labels = {
  color: string;
  size: string;
  quantity: string;
  addToCart: string;
  buyNow: string;
  onlyLeft: string; // contains {n}
  outOfStock: string;
  cartComingSoon: string;
};

export function PdpInteractive({
  images,
  variants,
  labels,
  header,
}: {
  images: PdpImage[];
  variants: PdpVariant[];
  labels: Labels;
  /** Server-rendered title + price block shown above the options. */
  header?: React.ReactNode;
}) {
  const colors = useMemo(() => {
    const seen = new Map<string, string>();
    for (const v of variants) if (!seen.has(v.colorName)) seen.set(v.colorName, v.colorHex);
    return [...seen.entries()].map(([name, hex]) => ({ name, hex }));
  }, [variants]);

  const [color, setColor] = useState(colors[0]?.name ?? "");
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);

  // Gallery synced to the selected color when a bound image exists.
  const gallery = useMemo(() => {
    const bound = images.filter((i) => i.variantColorRef === color);
    return bound.length ? bound : images;
  }, [images, color]);
  const activeImage = gallery[Math.min(imageIndex, gallery.length - 1)];

  const sizesForColor = variants.filter((v) => v.colorName === color);
  const selected = sizesForColor.find((v) => v.size === size) ?? null;
  const maxQty = selected ? Math.max(1, selected.stock) : 1;

  const pickColor = (name: string) => {
    setColor(name);
    setSize(null);
    setQty(1);
    setImageIndex(0);
  };

  return (
    <div className="grid grid-cols-[1.1fr_1fr] gap-10 max-lg:grid-cols-1">
      {/* Gallery */}
      <div>
        <div className="flex aspect-[1/1.05] items-center justify-center overflow-hidden rounded-[10px] bg-card">
          {activeImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={activeImage.url} alt={activeImage.alt} className="h-[82%] w-[82%] object-contain" />
          ) : null}
        </div>
        {gallery.length > 1 ? (
          <div className="mt-3 flex gap-3">
            {gallery.map((img, i) => (
              <button
                key={`${img.url}-${i}`}
                type="button"
                onClick={() => setImageIndex(i)}
                aria-pressed={i === imageIndex}
                className={cn(
                  "flex size-20 items-center justify-center overflow-hidden rounded-lg border-2 bg-card",
                  i === imageIndex ? "border-navy" : "border-line",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.alt} className="h-4/5 w-4/5 object-contain" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Options — title/price block arrives server-rendered via `header`. */}
      <div className="flex flex-col gap-6" data-pdp-options>
        {header}
        <fieldset>
          <legend className="mb-2.5 text-sm font-extrabold uppercase tracking-[0.5px]">
            {labels.color}: <span className="font-bold normal-case text-gray-6">{color}</span>
          </legend>
          <div className="flex flex-wrap gap-2.5">
            {colors.map((c) => (
              <button
                key={c.name}
                type="button"
                title={c.name}
                aria-pressed={color === c.name}
                onClick={() => pickColor(c.name)}
                className={cn(
                  "size-9 rounded-full border-2 border-white transition-transform hover:scale-110",
                  color === c.name ? "shadow-[0_0_0_2px_var(--ink)]" : "shadow-[0_0_0_1.5px_var(--line)]",
                )}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2.5 text-sm font-extrabold uppercase tracking-[0.5px]">{labels.size}</legend>
          <div className="flex flex-wrap gap-2">
            {sizesForColor.map((v) => {
              const out = v.stock <= 0;
              const active = size === v.size;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={out}
                  aria-pressed={active}
                  onClick={() => {
                    setSize(v.size);
                    setQty(1);
                  }}
                  className={cn(
                    "flex h-11 min-w-[52px] items-center justify-center rounded-[7px] border px-2 text-[15px] font-bold transition-colors",
                    out
                      ? "cursor-not-allowed border-line text-gray-4 line-through"
                      : active
                        ? "border-ink bg-ink text-white"
                        : "border-line text-gray-6 hover:border-ink hover:text-ink",
                  )}
                >
                  {v.size}
                </button>
              );
            })}
          </div>
          {selected ? (
            selected.stock <= 0 ? (
              <p className="mt-2.5 text-sm font-bold text-deal-red">{labels.outOfStock}</p>
            ) : selected.stock <= selected.lowStockAt ? (
              <p className="mt-2.5 text-sm font-bold text-deal-red">
                {labels.onlyLeft.replace("{n}", String(selected.stock))}
              </p>
            ) : null
          ) : null}
          {selected?.priceLabel ? (
            <p className="mt-2.5 text-sm font-semibold text-gray-6">{selected.priceLabel}</p>
          ) : null}
        </fieldset>

        <div className="flex items-center gap-4">
          <span className="text-sm font-extrabold uppercase tracking-[0.5px]">{labels.quantity}</span>
          <div className="flex items-center rounded-full border border-line">
            <button
              type="button"
              aria-label="−"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="flex size-11 items-center justify-center text-xl font-bold text-gray-6 hover:text-ink"
            >
              −
            </button>
            <span className="min-w-8 text-center text-base font-extrabold">{qty}</span>
            <button
              type="button"
              aria-label="+"
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
              className="flex size-11 items-center justify-center text-xl font-bold text-gray-6 hover:text-ink"
            >
              +
            </button>
          </div>
        </div>

        {/* Cart wiring lands in Phase 4 — buttons are present but inert. */}
        <div className="flex flex-wrap gap-3" title={labels.cartComingSoon}>
          <button
            type="button"
            disabled={!selected || selected.stock <= 0}
            className="h-14 flex-1 rounded-full bg-navy px-8 text-[15px] font-extrabold uppercase tracking-[0.5px] text-white transition-colors hover:bg-navy-deep disabled:pointer-events-none disabled:opacity-50"
          >
            {labels.addToCart}
          </button>
          <button
            type="button"
            disabled={!selected || selected.stock <= 0}
            className="h-14 flex-1 rounded-full border-2 border-navy px-8 text-[15px] font-extrabold uppercase tracking-[0.5px] text-navy transition-colors hover:bg-navy hover:text-white disabled:pointer-events-none disabled:opacity-50"
          >
            {labels.buyNow}
          </button>
        </div>
      </div>
    </div>
  );
}
