/**
 * Promo engine — pure functions, no DB access (unit-tested in
 * src/lib/__tests__/promotions.test.ts). The server assembles inputs from
 * Prisma; nothing here trusts client-provided prices.
 *
 * Evaluation order (documented in DECISIONS.md):
 *   1. item-level rules by ascending `priority` (BUY_X_GET_DISCOUNT, BUNDLE_PRICE)
 *   2. coupon (PERCENT / FIXED / FREE_SHIPPING)
 *   3. CARD_EXTRA_PERCENT on the already-discounted goods subtotal
 *   4. shipping (zone rate, FREE_SHIPPING_OVER threshold, zone freeOver, coupon)
 *   5. COD fee
 */

import type { CouponScope, CouponType, PaymentMethod, PromoType } from "./enums";

export type QuoteLine = {
  variantId: string;
  productId: string;
  categoryId: string;
  unitPrice: number;
  quantity: number;
  /** Slugs of collections the product belongs to (for BUNDLE_PRICE). */
  collectionSlugs: string[];
};

export type PromoRuleInput = {
  id: string;
  name: string;
  type: PromoType;
  config: unknown;
  priority: number;
};

export type CouponInput = {
  code: string;
  type: CouponType;
  value: number;
  minSubtotal: number | null;
  maxUses: number | null;
  usedCount: number;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
  appliesTo: CouponScope;
  targetIds: string[];
};

export type AppliedDiscount = {
  source: "promo" | "coupon";
  ruleId?: string;
  label: string;
  amount: number;
};

export type QuoteInput = {
  lines: QuoteLine[];
  rules: PromoRuleInput[];
  coupon?: CouponInput | null;
  paymentMethod: PaymentMethod;
  /** Zone shipping. Omit when no address chosen yet (cart preview). */
  shippingRate?: number;
  zoneFreeOver?: number | null;
  codFee?: number;
};

export type Quote = {
  subtotal: number;
  discounts: AppliedDiscount[];
  discountTotal: number;
  shippingRate: number;
  shippingTotal: number;
  freeShipping: boolean;
  codFee: number;
  grandTotal: number;
  couponError: "invalid" | "expired" | "min_subtotal" | "exhausted" | null;
};

const round = (n: number) => Math.round(n * 100) / 100;

/** Expand lines into single units, keeping line references. */
function expandUnits(lines: QuoteLine[]): { line: QuoteLine; price: number }[] {
  return lines.flatMap((line) =>
    Array.from({ length: line.quantity }, () => ({ line, price: line.unitPrice })),
  );
}

type BuyXConfig = { tiers?: { nth: number; percentOff: number }[] };

/**
 * "2nd item -15%, 3rd item -30%": units are sorted price-descending and taken
 * in groups of `maxNth`; within each group the nth unit gets its tier's
 * percentage. Repeats for every full group so 6 items ⇒ two 2nd/3rd pairs.
 */
export function applyBuyXGetDiscount(lines: QuoteLine[], config: BuyXConfig): number {
  const tiers = (config.tiers ?? []).filter((t) => t.nth >= 2 && t.percentOff > 0);
  if (!tiers.length) return 0;
  const byNth = new Map(tiers.map((t) => [t.nth, t.percentOff]));
  const groupSize = Math.max(...tiers.map((t) => t.nth));
  const units = expandUnits(lines).sort((a, b) => b.price - a.price);
  let discount = 0;
  for (let i = 0; i < units.length; i++) {
    const posInGroup = (i % groupSize) + 1; // 1-based
    const percent = byNth.get(posInGroup);
    if (percent) discount += (units[i].price * percent) / 100;
  }
  return round(discount);
}

type BundleConfig = { collectionSlug?: string; quantity?: number; bundlePrice?: number };

/**
 * "N items from collection C for a fixed price": for every full set of N
 * eligible units (most expensive first — customer-favorable), the discount is
 * (sum of set) − bundlePrice, when positive.
 */
export function applyBundlePrice(lines: QuoteLine[], config: BundleConfig): number {
  const { collectionSlug, quantity, bundlePrice } = config;
  if (!collectionSlug || !quantity || quantity < 2 || bundlePrice == null) return 0;
  const units = expandUnits(lines.filter((l) => l.collectionSlugs.includes(collectionSlug)))
    .sort((a, b) => b.price - a.price);
  let discount = 0;
  for (let start = 0; start + quantity <= units.length; start += quantity) {
    const set = units.slice(start, start + quantity);
    const sum = set.reduce((s, u) => s + u.price, 0);
    if (sum > bundlePrice) discount += sum - bundlePrice;
  }
  return round(discount);
}

function validateCoupon(
  coupon: CouponInput,
  goodsAfterPromos: number,
  now: Date,
): Quote["couponError"] {
  if (!coupon.isActive) return "invalid";
  if (now < coupon.startsAt || now > coupon.endsAt) return "expired";
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) return "exhausted";
  if (coupon.minSubtotal != null && goodsAfterPromos < coupon.minSubtotal) return "min_subtotal";
  return null;
}

/** Goods subtotal a coupon applies to, respecting its scope. */
function couponBase(coupon: CouponInput, lines: QuoteLine[]): number {
  if (coupon.appliesTo === "CATEGORY") {
    return lines
      .filter((l) => coupon.targetIds.includes(l.categoryId))
      .reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  }
  if (coupon.appliesTo === "PRODUCT") {
    return lines
      .filter((l) => coupon.targetIds.includes(l.productId))
      .reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  }
  return lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
}

export function computeQuote(input: QuoteInput, now = new Date()): Quote {
  const { lines, coupon, paymentMethod } = input;
  const subtotal = round(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0));
  const discounts: AppliedDiscount[] = [];
  let couponError: Quote["couponError"] = null;

  // 1. item-level promo rules by priority
  const ordered = [...input.rules].sort((a, b) => a.priority - b.priority);
  let freeShipByRule = false;
  let cardRule: PromoRuleInput | null = null;

  for (const rule of ordered) {
    if (rule.type === "BUY_X_GET_DISCOUNT") {
      const amount = applyBuyXGetDiscount(lines, rule.config as BuyXConfig);
      if (amount > 0) discounts.push({ source: "promo", ruleId: rule.id, label: rule.name, amount });
    } else if (rule.type === "BUNDLE_PRICE") {
      const amount = applyBundlePrice(lines, rule.config as BundleConfig);
      if (amount > 0) discounts.push({ source: "promo", ruleId: rule.id, label: rule.name, amount });
    } else if (rule.type === "CARD_EXTRA_PERCENT") {
      cardRule = rule; // applied after coupon, below
    }
    // FREE_SHIPPING_OVER evaluated after discounts, below
  }

  let goods = subtotal - discounts.reduce((s, d) => s + d.amount, 0);

  // 2. coupon
  let couponFreeShipping = false;
  if (coupon) {
    couponError = validateCoupon(coupon, goods, now);
    if (!couponError) {
      if (coupon.type === "PERCENT") {
        const base = Math.min(couponBase(coupon, lines), goods);
        const amount = round((base * coupon.value) / 100);
        if (amount > 0) discounts.push({ source: "coupon", label: coupon.code, amount });
      } else if (coupon.type === "FIXED") {
        const amount = round(Math.min(coupon.value, goods));
        if (amount > 0) discounts.push({ source: "coupon", label: coupon.code, amount });
      } else if (coupon.type === "FREE_SHIPPING") {
        couponFreeShipping = true;
      }
    }
  }
  goods = subtotal - discounts.reduce((s, d) => s + d.amount, 0);

  // 3. card extra percent
  if (cardRule && paymentMethod === "CARD") {
    const percent = ((cardRule.config as { percentOff?: number }).percentOff ?? 0);
    const amount = round((goods * percent) / 100);
    if (amount > 0) {
      discounts.push({ source: "promo", ruleId: cardRule.id, label: cardRule.name, amount });
      goods -= amount;
    }
  }

  // 4. shipping
  const shippingRate = input.shippingRate ?? 0;
  for (const rule of ordered) {
    if (rule.type === "FREE_SHIPPING_OVER") {
      const threshold = (rule.config as { threshold?: number }).threshold;
      if (threshold != null && goods >= threshold) freeShipByRule = true;
    }
  }
  const zoneFree = input.zoneFreeOver != null && goods >= input.zoneFreeOver;
  const freeShipping = freeShipByRule || zoneFree || couponFreeShipping;
  const shippingTotal = freeShipping ? 0 : round(shippingRate);

  // 5. COD fee
  const codFee = paymentMethod === "COD" ? round(input.codFee ?? 0) : 0;

  const discountTotal = round(discounts.reduce((s, d) => s + d.amount, 0));
  return {
    subtotal,
    discounts,
    discountTotal,
    shippingRate,
    shippingTotal,
    freeShipping,
    codFee,
    grandTotal: round(subtotal - discountTotal + shippingTotal + codFee),
    couponError,
  };
}
