import { formatPrice, percentOff, toNumber } from "@/lib/format";
import { messages } from "@/lib/i18n";
import type { ProductForCard } from "@/server/storefront";
import type { ProductCardProps, ProductCardSwatch } from "./product-card";
import type { QuickAddItem } from "./shop-product-card";

/** First in-stock variant → quick-add payload (null when fully OOS). */
export function buildQuickAddItem(product: ProductForCard): QuickAddItem | null {
  const variant = product.variants.find((v) => v.stock > 0);
  if (!variant) return null;
  return {
    variantId: variant.id,
    productId: product.id,
    slug: product.slug,
    name: product.name,
    colorName: variant.colorName,
    size: variant.size,
    imageUrl: product.images[0]?.url ?? null,
    unitPrice: toNumber(variant.price ?? product.basePrice),
    maxStock: variant.stock,
  };
}

const MAX_SWATCHES = 4;
const MAX_SIZES = 5;

type PromoFacts = { cardPercentOff: number | null; freeShippingOver: number | null };

/**
 * Server-side mapping: Product (+variants/images) → ProductCard props.
 * All strings pre-formatted here so the client card stays brand-agnostic.
 */
export function buildProductCardProps(
  product: ProductForCard,
  currency: string,
  promo: PromoFacts,
): ProductCardProps {
  const t = messages;

  const colorSeen = new Map<string, ProductCardSwatch>();
  for (const v of product.variants) {
    if (!colorSeen.has(v.colorName)) colorSeen.set(v.colorName, { name: v.colorName, hex: v.colorHex });
  }
  const swatches = [...colorSeen.values()];

  const sizeSeen = [...new Set(product.variants.map((v) => v.size))];

  const save = percentOff(product.compareAtPrice, product.basePrice);
  const image = product.images[0];

  return {
    name: product.name,
    material: product.material ?? undefined,
    price: formatPrice(product.basePrice, currency),
    oldPrice: product.compareAtPrice ? formatPrice(product.compareAtPrice, currency) : undefined,
    cardPrice: product.cardPrice ? formatPrice(product.cardPrice, currency) : undefined,
    cardPriceTag: product.cardPrice ? t.common.bestDeal : undefined,
    saveLabel: save ? `${t.store.save} -${save}%` : undefined,
    payNote:
      promo.cardPercentOff != null ? (
        <>
          {t.store.payWithCard} · <b>{promo.cardPercentOff}%</b> {t.store.off}
          {promo.freeShippingOver != null ? <> · {t.store.freeShipping}</> : null}
        </>
      ) : undefined,
    swatches: swatches.slice(0, MAX_SWATCHES),
    extraSwatchCount: swatches.length > MAX_SWATCHES ? swatches.length - MAX_SWATCHES : undefined,
    sizes: sizeSeen.slice(0, MAX_SIZES),
    extraSizeCount: sizeSeen.length > MAX_SIZES ? sizeSeen.length - MAX_SIZES : undefined,
    media: image ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image.url} alt={image.alt} className="h-[82%] w-[82%] object-contain" />
    ) : (
      <span aria-hidden className="block size-1/2 rounded-2xl bg-line" />
    ),
    href: `/product/${product.slug}`,
    addToCartLabel: t.common.addToCart,
    wishlistLabel: t.common.addToWishlist,
  };
}
