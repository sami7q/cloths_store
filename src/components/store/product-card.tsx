"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { HeartIcon } from "./icons";

export type ProductCardSwatch = { name?: string; hex: string };

export type ProductCardProps = {
  name: string;
  material?: string;
  /** Pre-formatted prices, e.g. "1,690 EGP" (currency from StoreSettings). */
  price: string;
  oldPrice?: string;
  /** Card-payment price shown in the red-bordered deal box. */
  cardPrice?: string;
  /** Deal-box tag label, e.g. "BEST DEAL" — from i18n/CMS. */
  cardPriceTag?: string;
  /** Save pill label, e.g. "SAVE -22%" — from i18n/promo engine. */
  saveLabel?: string;
  /** "Pay with card · 15% off · Free shipping" note — from promo engine. */
  payNote?: ReactNode;
  swatches?: ProductCardSwatch[];
  extraSwatchCount?: number;
  sizes?: string[];
  extraSizeCount?: number;
  /** Product media (image); placeholder SVG in dev. */
  media: ReactNode;
  href?: string;
  /** Quick add-to-cart reveal label; button hidden when absent. */
  addToCartLabel?: string;
  wishlistLabel?: string;
  onAddToCart?: () => void;
  /** Controlled wishlist state; falls back to local state when absent. */
  wished?: boolean;
  onToggleWishlist?: () => void;
};

export function ProductCard({
  name,
  material,
  price,
  oldPrice,
  cardPrice,
  cardPriceTag,
  saveLabel,
  payNote,
  swatches,
  extraSwatchCount,
  sizes,
  extraSizeCount,
  media,
  href = "#",
  addToCartLabel,
  wishlistLabel = "Add to wishlist",
  onAddToCart,
  wished: wishedProp,
  onToggleWishlist,
}: ProductCardProps) {
  const [swatchIndex, setSwatchIndex] = useState(0);
  const [selectedSizes, setSelectedSizes] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [wishedLocal, setWished] = useState(false);
  const wished = wishedProp ?? wishedLocal;

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) => {
      const next = new Set(prev);
      if (next.has(size)) next.delete(size);
      else next.add(size);
      return next;
    });
  };

  return (
    <article className="group relative rounded-[10px] bg-white pb-5 transition-shadow duration-300 hover:shadow-[0_14px_34px_rgba(0,0,0,0.09)]">
      <div className="relative">
        <a
          href={href}
          className="relative flex aspect-[1/1.05] items-center justify-center overflow-hidden rounded-[10px] bg-card"
        >
          {saveLabel ? (
            <span className="absolute start-4 top-4 z-[2] rounded-[20px] bg-save-green px-4 py-[7px] text-[13.5px] font-bold text-white">
              {saveLabel}
            </span>
          ) : null}
          <span className="flex w-full items-center justify-center transition-transform duration-300 group-hover:rotate-[-2deg] group-hover:scale-105">
            {media}
          </span>
        </a>
        <button
          type="button"
          aria-label={wishlistLabel}
          aria-pressed={wished}
          onClick={() => (onToggleWishlist ? onToggleWishlist() : setWished((w) => !w))}
          className={cn(
            "absolute end-3.5 top-3.5 z-[2] transition-colors",
            wished ? "text-deal-red" : "text-ink hover:text-deal-red",
          )}
        >
          <HeartIcon className="size-[26px]" filled={wished} />
        </button>
        {addToCartLabel ? (
          <button
            type="button"
            onClick={onAddToCart}
            className="absolute inset-x-4 bottom-4 z-[2] h-11 translate-y-3 rounded-full bg-navy text-[15px] font-extrabold uppercase tracking-[0.5px] text-white opacity-0 transition-all duration-300 hover:bg-navy-deep group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100"
          >
            {addToCartLabel}
          </button>
        ) : null}
      </div>

      <div className="px-1.5 pt-[18px]">
        <h3 className="text-xl font-extrabold tracking-[0.2px]">
          <a href={href}>{name}</a>
        </h3>
        {material ? (
          <div className="mt-1.5 text-[16.5px] font-medium text-gray-6">
            {material}
          </div>
        ) : null}

        <div className="mt-[22px] flex items-baseline gap-2.5">
          {oldPrice ? (
            <span className="text-base font-semibold text-gray-6 line-through">
              {oldPrice}
            </span>
          ) : null}
          <span className="text-2xl font-extrabold">{price}</span>
        </div>

        {cardPrice ? (
          <div className="mt-3 inline-flex items-center gap-2.5 rounded-lg border-[1.5px] border-deal-red bg-deal-bg px-3 py-[9px]">
            <span
              aria-hidden
              className="relative h-3.5 w-[18px] rounded-[2.5px] border-[1.8px] border-deal-red before:absolute before:inset-x-0 before:top-[2.5px] before:h-[2.5px] before:bg-deal-red before:content-['']"
            />
            <span className="text-base font-extrabold text-ink">{cardPrice}</span>
            {cardPriceTag ? (
              <span className="rounded-[5px] bg-deal-red px-[9px] py-1 text-[10.5px] font-extrabold tracking-[0.4px] text-white">
                {cardPriceTag}
              </span>
            ) : null}
          </div>
        ) : null}

        {payNote ? (
          <div className="mt-3 text-sm font-medium text-gray-6 [&_b]:font-bold [&_b]:text-ink [&_strong]:font-bold [&_strong]:text-ink">
            {payNote}
          </div>
        ) : null}

        {swatches && swatches.length > 0 ? (
          <div className="mt-3.5 flex items-center gap-[9px]">
            {swatches.map((swatch, i) => (
              <button
                key={`${swatch.hex}-${i}`}
                type="button"
                title={swatch.name}
                aria-label={swatch.name ?? swatch.hex}
                aria-pressed={swatchIndex === i}
                onClick={() => setSwatchIndex(i)}
                className={cn(
                  "size-[26px] rounded-full border-2 border-white transition-transform hover:scale-[1.12]",
                  swatchIndex === i
                    ? "shadow-[0_0_0_2px_var(--ink)]"
                    : "shadow-[0_0_0_1.5px_var(--line)]",
                )}
                style={{ backgroundColor: swatch.hex }}
              />
            ))}
            {extraSwatchCount ? (
              <span className="text-sm font-bold text-ink">
                +{extraSwatchCount}
              </span>
            ) : null}
          </div>
        ) : null}

        {sizes && sizes.length > 0 ? (
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            {sizes.map((size) => (
              <button
                key={size}
                type="button"
                aria-pressed={selectedSizes.has(size)}
                onClick={() => toggleSize(size)}
                className={cn(
                  "flex h-[34px] min-w-[42px] items-center justify-center rounded-[7px] border px-1 text-[14.5px] font-bold transition-colors",
                  selectedSizes.has(size)
                    ? "border-ink text-ink"
                    : "border-line text-gray-6",
                )}
              >
                {size}
              </button>
            ))}
            {extraSizeCount ? (
              <span className="text-sm font-bold text-ink">
                +{extraSizeCount}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
