import type { Prisma } from "@prisma/client";

type PriceInput = Prisma.Decimal | number | string;

export function toNumber(value: PriceInput): number {
  return typeof value === "number" ? value : Number(value);
}

/** "1,649 EGP" — currency code comes from StoreSettings, never hardcoded. */
export function formatPrice(value: PriceInput, currency: string): string {
  const n = toNumber(value);
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: n % 1 === 0 ? 0 : 2 }).format(n)} ${currency}`;
}

/** Rounded percent saved between compare-at and current price, or null. */
export function percentOff(compareAt: PriceInput | null | undefined, price: PriceInput): number | null {
  if (compareAt == null) return null;
  const was = toNumber(compareAt);
  const now = toNumber(price);
  if (was <= now || was <= 0) return null;
  return Math.round(((was - now) / was) * 100);
}
