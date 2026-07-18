"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWishlistStore } from "@/lib/wishlist-store";
import { getWishlistCards, type WishlistCard } from "@/server/wishlist";
import { ShopProductCard } from "@/components/store/shop-product-card";
import { messages } from "@/lib/i18n";

/**
 * Wishlist grid — client-driven so guest (localStorage) ids work; logged-in
 * users get their guest ids merged into the DB by getWishlistCards.
 */
export function WishlistClient() {
  const ids = useWishlistStore((s) => s.ids);
  const [data, setData] = useState<Awaited<ReturnType<typeof getWishlistCards>> | null>(null);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const idsKey = ids.join(",");
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    void getWishlistCards(useWishlistStore.getState().ids).then((res) => {
      if (!cancelled) setData(res);
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, idsKey]);

  const t = messages;
  if (!hydrated || data === null) return null;

  if (data.cards.length === 0) {
    return (
      <div className="rounded-[10px] border border-line bg-white p-14 text-center">
        <p className="text-lg text-gray-6">{t.account.wishlistEmpty}</p>
        <Link href="/" className="mt-4 inline-block font-bold text-navy hover:underline">
          {t.cart.continueShopping} →
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-5 max-lg:grid-cols-2 max-md:grid-cols-1">
      {data.cards.map((card) => (
        <WishlistCardItem key={card.productId} card={card} promo={data.promo} />
      ))}
    </div>
  );
}

function WishlistCardItem({
  card,
  promo,
}: {
  card: WishlistCard;
  promo: { cardPercentOff: number | null; freeShippingOver: number | null };
}) {
  const t = messages;
  return (
    <ShopProductCard
      productId={card.productId}
      name={card.name}
      material={card.material ?? undefined}
      price={card.price}
      oldPrice={card.oldPrice ?? undefined}
      cardPrice={card.cardPrice ?? undefined}
      cardPriceTag={card.cardPrice ? t.common.bestDeal : undefined}
      saveLabel={card.savePercent ? `${t.store.save} -${card.savePercent}%` : undefined}
      payNote={
        promo.cardPercentOff != null ? (
          <>
            {t.store.payWithCard} · <b>{promo.cardPercentOff}%</b> {t.store.off}
            {promo.freeShippingOver != null ? <> · {t.store.freeShipping}</> : null}
          </>
        ) : undefined
      }
      swatches={card.swatches}
      sizes={card.sizes}
      media={
        card.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.imageUrl} alt={card.imageAlt} className="h-[82%] w-[82%] object-contain" />
        ) : (
          <span aria-hidden className="block size-1/2 rounded-2xl bg-line" />
        )
      }
      href={`/product/${card.slug}`}
      addToCartLabel={t.common.addToCart}
      wishlistLabel={t.common.addToWishlist}
      quickAddItem={
        card.quickAdd
          ? {
              variantId: card.quickAdd.variantId,
              productId: card.productId,
              slug: card.slug,
              name: card.name,
              colorName: card.quickAdd.colorName,
              size: card.quickAdd.size,
              imageUrl: card.imageUrl,
              unitPrice: card.quickAdd.unitPrice,
              maxStock: card.quickAdd.maxStock,
            }
          : null
      }
    />
  );
}
