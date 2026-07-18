"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Wishlist UI state — product ids. Guests: localStorage only. Logged-in:
 * mirrored to the DB via server actions; NavClient replaces the list with the
 * merged server result after login (guest-merge per §5).
 */

type WishlistState = {
  ids: string[];
  merged: boolean;
  toggle: (productId: string) => void;
  setAll: (ids: string[]) => void;
  markMerged: () => void;
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set) => ({
      ids: [],
      merged: false,
      toggle: (productId) =>
        set((s) => ({
          ids: s.ids.includes(productId)
            ? s.ids.filter((id) => id !== productId)
            : [...s.ids, productId],
        })),
      setAll: (ids) => set({ ids }),
      markMerged: () => set({ merged: true }),
    }),
    { name: "store-wishlist" },
  ),
);
