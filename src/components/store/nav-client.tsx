"use client";

import { useEffect, useState } from "react";
import { MainNav, type MainNavProps } from "./main-nav";
import { cartCount, cartEstimate, useCartStore } from "@/lib/cart-store";

type Props = Omit<MainNavProps, "cartCount" | "cartTotalLabel"> & {
  /** Currency code from StoreSettings for the pill total. */
  currency: string;
};

/** MainNav bound to the live cart (post-hydration to avoid SSR mismatch). */
export function NavClient({ currency, ...nav }: Props) {
  const items = useCartStore((s) => s.items);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const count = hydrated ? cartCount(items) : 0;
  const total = hydrated ? cartEstimate(items) : 0;

  return (
    <MainNav
      {...nav}
      cartCount={count}
      cartTotalLabel={`${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(total)} ${currency}`}
    />
  );
}
