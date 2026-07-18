"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Client cart state — variant refs + display snapshots only. Prices shown in
 * the pill/cart are estimates; every quote and the final order total are
 * recomputed server-side (src/server/cart.ts). Never trusted.
 */

export type CartItem = {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  colorName: string;
  size: string;
  imageUrl: string | null;
  /** Display-only unit price snapshot. */
  unitPrice: number;
  quantity: number;
  maxStock: number;
};

type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.variantId === item.variantId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === item.variantId
                  ? { ...i, quantity: Math.min(i.quantity + (item.quantity ?? 1), i.maxStock) }
                  : i,
              ),
            };
          }
          return {
            items: [
              ...state.items,
              { ...item, quantity: Math.min(item.quantity ?? 1, item.maxStock) },
            ],
          };
        }),
      setQuantity: (variantId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.variantId !== variantId)
              : state.items.map((i) =>
                  i.variantId === variantId
                    ? { ...i, quantity: Math.min(quantity, i.maxStock) }
                    : i,
                ),
        })),
      remove: (variantId) =>
        set((state) => ({ items: state.items.filter((i) => i.variantId !== variantId) })),
      clear: () => set({ items: [] }),
    }),
    { name: "store-cart" },
  ),
);

export const cartCount = (items: CartItem[]) => items.reduce((s, i) => s + i.quantity, 0);
export const cartEstimate = (items: CartItem[]) => items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
