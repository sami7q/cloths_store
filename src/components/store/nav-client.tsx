"use client";

import { useEffect, useRef, useState } from "react";
import { MainNav, type MainNavProps } from "./main-nav";
import { cartCount, cartEstimate, useCartStore } from "@/lib/cart-store";
import { useWishlistStore } from "@/lib/wishlist-store";
import { syncWishlist } from "@/server/wishlist";

type Props = Omit<MainNavProps, "cartCount" | "cartTotalLabel" | "wishlistCount"> & {
  /** Currency code from StoreSettings for the pill total. */
  currency: string;
  /** True when a session exists — triggers the guest-wishlist merge. */
  isAuthenticated: boolean;
};

/** MainNav bound to the live cart/wishlist (post-hydration, no SSR mismatch). */
export function NavClient({ currency, isAuthenticated, ...nav }: Props) {
  const items = useCartStore((s) => s.items);
  const wishlistIds = useWishlistStore((s) => s.ids);
  const setAll = useWishlistStore((s) => s.setAll);
  const [hydrated, setHydrated] = useState(false);
  const syncedRef = useRef(false);
  useEffect(() => setHydrated(true), []);

  // Guest-merge on login: push local ids to the server once per mount, then
  // adopt the authoritative merged list.
  useEffect(() => {
    if (!hydrated || !isAuthenticated || syncedRef.current) return;
    syncedRef.current = true;
    void syncWishlist(useWishlistStore.getState().ids).then((res) => {
      if (res.synced) setAll(res.ids);
    });
  }, [hydrated, isAuthenticated, setAll]);

  const count = hydrated ? cartCount(items) : 0;
  const total = hydrated ? cartEstimate(items) : 0;

  return (
    <MainNav
      {...nav}
      wishlistCount={hydrated ? wishlistIds.length : 0}
      cartCount={count}
      cartTotalLabel={`${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(total)} ${currency}`}
    />
  );
}
