import { describe, expect, it } from "vitest";
import {
  applyBundlePrice,
  applyBuyXGetDiscount,
  computeQuote,
  type CouponInput,
  type PromoRuleInput,
  type QuoteLine,
} from "../promotions";

const line = (over: Partial<QuoteLine> = {}): QuoteLine => ({
  variantId: "v1",
  productId: "p1",
  categoryId: "c1",
  unitPrice: 1000,
  quantity: 1,
  collectionSlugs: [],
  ...over,
});

const buyXRule: PromoRuleInput = {
  id: "r-buyx",
  name: "2nd -15%, 3rd -30%",
  type: "BUY_X_GET_DISCOUNT",
  config: { tiers: [{ nth: 2, percentOff: 15 }, { nth: 3, percentOff: 30 }] },
  priority: 10,
};

const bundleRule: PromoRuleInput = {
  id: "r-bundle",
  name: "3 EVA for 3999",
  type: "BUNDLE_PRICE",
  config: { collectionSlug: "eva-ultra", quantity: 3, bundlePrice: 3999 },
  priority: 20,
};

const cardRule: PromoRuleInput = {
  id: "r-card",
  name: "Extra 15% with card",
  type: "CARD_EXTRA_PERCENT",
  config: { percentOff: 15 },
  priority: 30,
};

const freeShipRule: PromoRuleInput = {
  id: "r-ship",
  name: "Free shipping over 800",
  type: "FREE_SHIPPING_OVER",
  config: { threshold: 800 },
  priority: 40,
};

const coupon = (over: Partial<CouponInput> = {}): CouponInput => ({
  code: "TEST",
  type: "PERCENT",
  value: 10,
  minSubtotal: null,
  maxUses: null,
  usedCount: 0,
  startsAt: new Date("2026-01-01"),
  endsAt: new Date("2027-01-01"),
  isActive: true,
  appliesTo: "ALL",
  targetIds: [],
  ...over,
});

const NOW = new Date("2026-07-19");

describe("applyBuyXGetDiscount", () => {
  it("gives nothing for a single item", () => {
    expect(applyBuyXGetDiscount([line()], buyXRule.config as never)).toBe(0);
  });

  it("discounts the 2nd (cheaper) of two items by 15%", () => {
    const lines = [line({ unitPrice: 1000 }), line({ variantId: "v2", unitPrice: 600 })];
    // sorted desc: [1000, 600] → 2nd = 600 × 15%
    expect(applyBuyXGetDiscount(lines, buyXRule.config as never)).toBe(90);
  });

  it("discounts 2nd by 15% and 3rd by 30% for three items", () => {
    const lines = [
      line({ unitPrice: 1000 }),
      line({ variantId: "v2", unitPrice: 800 }),
      line({ variantId: "v3", unitPrice: 500 }),
    ];
    // 800×0.15 + 500×0.30 = 120 + 150
    expect(applyBuyXGetDiscount(lines, buyXRule.config as never)).toBe(270);
  });

  it("repeats the pattern per group of three (6 units)", () => {
    const lines = [line({ unitPrice: 900, quantity: 6 })];
    // each group of 3: 900×0.15 + 900×0.30 = 405; two groups = 810
    expect(applyBuyXGetDiscount(lines, buyXRule.config as never)).toBe(810);
  });

  it("expands quantities across lines", () => {
    const lines = [line({ unitPrice: 1000, quantity: 2 })];
    expect(applyBuyXGetDiscount(lines, buyXRule.config as never)).toBe(150);
  });
});

describe("applyBundlePrice", () => {
  const eva = (price: number, qty = 1, id = String(price)) =>
    line({ variantId: id, unitPrice: price, quantity: qty, collectionSlugs: ["eva-ultra"] });

  it("no discount below the bundle quantity", () => {
    expect(applyBundlePrice([eva(1500), eva(1600, 1, "b")], bundleRule.config as never)).toBe(0);
  });

  it("charges bundle price for exactly N items", () => {
    const lines = [eva(1500), eva(1600, 1, "b"), eva(1700, 1, "c")];
    // 4800 − 3999
    expect(applyBundlePrice(lines, bundleRule.config as never)).toBe(801);
  });

  it("ignores items outside the collection", () => {
    const lines = [eva(1500), eva(1600, 1, "b"), line({ unitPrice: 1700 })];
    expect(applyBundlePrice(lines, bundleRule.config as never)).toBe(0);
  });

  it("applies once per full set (5 items → one bundle)", () => {
    const lines = [eva(2000, 5)];
    // most-expensive-first sets: one full set of 3 → 6000 − 3999
    expect(applyBundlePrice(lines, bundleRule.config as never)).toBe(2001);
  });

  it("never produces a negative discount", () => {
    const lines = [eva(1000, 3)]; // 3000 < 3999
    expect(applyBundlePrice(lines, bundleRule.config as never)).toBe(0);
  });
});

describe("computeQuote — card percent & shipping", () => {
  it("applies card discount only for CARD payments", () => {
    const base = { lines: [line({ unitPrice: 1000 })], rules: [cardRule], shippingRate: 60 };
    const card = computeQuote({ ...base, paymentMethod: "CARD" }, NOW);
    const cod = computeQuote({ ...base, paymentMethod: "COD", codFee: 25 }, NOW);
    expect(card.discountTotal).toBe(150);
    expect(card.grandTotal).toBe(1000 - 150 + 60);
    expect(cod.discountTotal).toBe(0);
    expect(cod.codFee).toBe(25);
    expect(cod.grandTotal).toBe(1000 + 60 + 25);
  });

  it("free shipping at/above the threshold, not below", () => {
    const rules = [freeShipRule];
    const above = computeQuote(
      { lines: [line({ unitPrice: 900 })], rules, paymentMethod: "COD", shippingRate: 60 },
      NOW,
    );
    const below = computeQuote(
      { lines: [line({ unitPrice: 500 })], rules, paymentMethod: "COD", shippingRate: 60 },
      NOW,
    );
    expect(above.freeShipping).toBe(true);
    expect(above.shippingTotal).toBe(0);
    expect(below.freeShipping).toBe(false);
    expect(below.shippingTotal).toBe(60);
  });

  it("threshold checks the discounted goods total", () => {
    // 900 − 15% card = 765 < 800 → shipping charged
    const quote = computeQuote(
      {
        lines: [line({ unitPrice: 900 })],
        rules: [cardRule, freeShipRule],
        paymentMethod: "CARD",
        shippingRate: 60,
      },
      NOW,
    );
    expect(quote.freeShipping).toBe(false);
    expect(quote.grandTotal).toBe(900 - 135 + 60);
  });

  it("zone freeOver also grants free shipping", () => {
    const quote = computeQuote(
      { lines: [line({ unitPrice: 1500 })], rules: [], paymentMethod: "COD", shippingRate: 90, zoneFreeOver: 1200 },
      NOW,
    );
    expect(quote.shippingTotal).toBe(0);
  });
});

describe("computeQuote — coupons", () => {
  it("percent coupon applies after item promos", () => {
    const quote = computeQuote(
      {
        lines: [line({ unitPrice: 1000 }), line({ variantId: "v2", unitPrice: 600 })],
        rules: [buyXRule],
        coupon: coupon({ value: 10 }),
        paymentMethod: "COD",
      },
      NOW,
    );
    // buy-x: 90 → goods 1510 → coupon 10% of 1510 = 151
    expect(quote.discounts.map((d) => d.amount)).toEqual([90, 151]);
    expect(quote.discountTotal).toBe(241);
    expect(quote.couponError).toBeNull();
  });

  it("fixed coupon caps at the goods total", () => {
    const quote = computeQuote(
      {
        lines: [line({ unitPrice: 30 })],
        rules: [],
        coupon: coupon({ type: "FIXED", value: 50 }),
        paymentMethod: "COD",
      },
      NOW,
    );
    expect(quote.discountTotal).toBe(30);
    expect(quote.grandTotal).toBe(0);
  });

  it("free-shipping coupon zeroes shipping", () => {
    const quote = computeQuote(
      {
        lines: [line({ unitPrice: 300 })],
        rules: [],
        coupon: coupon({ type: "FREE_SHIPPING", value: 0 }),
        paymentMethod: "COD",
        shippingRate: 60,
      },
      NOW,
    );
    expect(quote.shippingTotal).toBe(0);
  });

  it("rejects expired, exhausted and under-minimum coupons", () => {
    const lines = [line({ unitPrice: 400 })];
    const expired = computeQuote(
      { lines, rules: [], coupon: coupon({ endsAt: new Date("2026-01-02") }), paymentMethod: "COD" },
      NOW,
    );
    const exhausted = computeQuote(
      { lines, rules: [], coupon: coupon({ maxUses: 5, usedCount: 5 }), paymentMethod: "COD" },
      NOW,
    );
    const underMin = computeQuote(
      { lines, rules: [], coupon: coupon({ minSubtotal: 500 }), paymentMethod: "COD" },
      NOW,
    );
    expect(expired.couponError).toBe("expired");
    expect(exhausted.couponError).toBe("exhausted");
    expect(underMin.couponError).toBe("min_subtotal");
    for (const q of [expired, exhausted, underMin]) expect(q.discountTotal).toBe(0);
  });

  it("scoped coupon only discounts matching categories", () => {
    const quote = computeQuote(
      {
        lines: [
          line({ unitPrice: 1000, categoryId: "shoes" }),
          line({ variantId: "v2", unitPrice: 500, categoryId: "bags" }),
        ],
        rules: [],
        coupon: coupon({ appliesTo: "CATEGORY", targetIds: ["shoes"], value: 10 }),
        paymentMethod: "COD",
      },
      NOW,
    );
    expect(quote.discountTotal).toBe(100); // 10% of 1000 only
  });
});

describe("computeQuote — full stack", () => {
  it("combines buy-x, coupon, card percent, free shipping and rounding", () => {
    const quote = computeQuote(
      {
        lines: [
          line({ unitPrice: 1199, quantity: 2 }),
          line({ variantId: "v2", unitPrice: 899 }),
        ],
        rules: [buyXRule, cardRule, freeShipRule],
        coupon: coupon({ value: 10 }),
        paymentMethod: "CARD",
        shippingRate: 60,
      },
      NOW,
    );
    // subtotal 3297; buy-x: 2nd 1199×15% + 3rd 899×30% = 179.85+269.7 = 449.55
    // goods 2847.45 → coupon 284.75 (rounded) → 2562.70 → card 15% = 384.41 → 2178.29
    // ≥800 → free shipping; CARD → no COD fee
    expect(quote.subtotal).toBe(3297);
    expect(quote.discountTotal).toBe(449.55 + 284.75 + 384.41);
    expect(quote.freeShipping).toBe(true);
    expect(quote.grandTotal).toBe(round2(3297 - quote.discountTotal));
  });
});

const round2 = (n: number) => Math.round(n * 100) / 100;
