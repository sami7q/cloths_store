"use client";

import { ProductCard, type ProductCardProps } from "./product-card";
import { useCartStore, type CartItem } from "@/lib/cart-store";

export type QuickAddItem = Omit<CartItem, "quantity">;

/**
 * ProductCard + quick add-to-cart. The quick-add uses the first in-stock
 * variant (precomputed server-side); exact color/size selection lives on the
 * PDP.
 */
export function ShopProductCard({
  quickAddItem,
  ...card
}: ProductCardProps & { quickAddItem: QuickAddItem | null }) {
  const add = useCartStore((s) => s.add);
  return (
    <ProductCard
      {...card}
      addToCartLabel={quickAddItem ? card.addToCartLabel : undefined}
      onAddToCart={quickAddItem ? () => add(quickAddItem) : undefined}
    />
  );
}
