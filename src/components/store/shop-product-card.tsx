"use client";

import { useEffect, useState } from "react";
import { ProductCard, type ProductCardProps } from "./product-card";
import { useCartStore, type CartItem } from "@/lib/cart-store";
import { useWishlistStore } from "@/lib/wishlist-store";
import { toggleWishlist } from "@/server/wishlist";

export type QuickAddItem = Omit<CartItem, "quantity">;

/**
 * ProductCard + quick add-to-cart + wishlist wiring. Quick-add uses the first
 * in-stock variant (precomputed server-side); exact color/size selection
 * lives on the PDP. Wishlist toggles the client store and fire-and-forget
 * syncs to the DB when a session exists.
 */
export function ShopProductCard({
  quickAddItem,
  productId,
  ...card
}: ProductCardProps & { quickAddItem: QuickAddItem | null; productId: string }) {
  const add = useCartStore((s) => s.add);
  const wishedIds = useWishlistStore((s) => s.ids);
  const toggle = useWishlistStore((s) => s.toggle);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  return (
    <ProductCard
      {...card}
      addToCartLabel={quickAddItem ? card.addToCartLabel : undefined}
      onAddToCart={quickAddItem ? () => add(quickAddItem) : undefined}
      wished={hydrated ? wishedIds.includes(productId) : false}
      onToggleWishlist={() => {
        toggle(productId);
        void toggleWishlist(productId);
      }}
    />
  );
}
