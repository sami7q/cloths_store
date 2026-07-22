/**
 * Domain enums — single source of truth for the String columns in
 * prisma/schema.prisma (SQLite has no native enums; see the schema header and
 * DECISIONS.md → Phase 1). Validate against these everywhere (Zod, forms,
 * server actions). When the datasource returns to Postgres these may become
 * native enums again — keep names/values identical.
 */

/** Narrowing guard for enum-ish values arriving as plain strings (query params, CSV cells). */
export function isOneOf<T extends string>(values: readonly T[], v: string): v is T {
  return (values as readonly string[]).includes(v);
}

export const ROLES = ["CUSTOMER", "STAFF", "MANAGER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const PRODUCT_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PAYMENT_METHODS = ["CARD", "COD"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const COUPON_TYPES = ["PERCENT", "FIXED", "FREE_SHIPPING"] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export const COUPON_SCOPES = ["ALL", "CATEGORY", "PRODUCT"] as const;
export type CouponScope = (typeof COUPON_SCOPES)[number];

export const PROMO_TYPES = [
  "BUY_X_GET_DISCOUNT",
  "BUNDLE_PRICE",
  "CARD_EXTRA_PERCENT",
  "FREE_SHIPPING_OVER",
] as const;
export type PromoType = (typeof PROMO_TYPES)[number];

export const BANNER_PLACEMENTS = ["HERO", "LIFESTYLE", "SIDE_TAB", "MARQUEE", "SOCIAL_GRID"] as const;
export type BannerPlacement = (typeof BANNER_PLACEMENTS)[number];

export const REVIEW_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
