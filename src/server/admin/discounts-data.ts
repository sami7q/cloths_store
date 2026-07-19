import "server-only";
import { db } from "@/lib/db";
import { toNumber } from "@/lib/format";

/** Read-side queries for the admin Discounts module (§6.7). */

export type CouponRow = {
  code: string;
  type: string;
  value: number;
  minSubtotal: number | null;
  maxUses: number | null;
  usedCount: number;
  perUserLimit: number | null;
  startsAt: string; // yyyy-mm-dd for <input type=date>
  endsAt: string;
  isActive: boolean;
  appliesTo: string;
  targetIds: string[];
  ordersCount: number;
  revenue: number;
};

export type PromoRow = {
  id: string;
  name: string;
  type: string;
  config: unknown;
  isActive: boolean;
  priority: number;
};

const day = (d: Date) => d.toISOString().slice(0, 10);

export async function getDiscountsData() {
  const [settings, coupons, rules, orders, categories, products, collections] = await Promise.all([
    db.storeSettings.findUnique({ where: { id: 1 } }),
    db.coupon.findMany({ orderBy: { startsAt: "desc" } }),
    db.promoRule.findMany({ orderBy: { priority: "asc" } }),
    db.order.groupBy({
      by: ["couponCode"],
      where: { couponCode: { not: null }, status: { notIn: ["CANCELLED", "RETURNED"] } },
      _count: { _all: true },
      _sum: { grandTotal: true },
    }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.product.findMany({
      where: { status: { not: "ARCHIVED" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.collection.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { slug: true, name: true } }),
  ]);

  const statsByCode = new Map(orders.map((o) => [o.couponCode, o]));

  const couponRows: CouponRow[] = coupons.map((c) => {
    const stats = statsByCode.get(c.code);
    return {
      code: c.code,
      type: c.type,
      value: toNumber(c.value),
      minSubtotal: c.minSubtotal ? toNumber(c.minSubtotal) : null,
      maxUses: c.maxUses,
      usedCount: c.usedCount,
      perUserLimit: c.perUserLimit,
      startsAt: day(c.startsAt),
      endsAt: day(c.endsAt),
      isActive: c.isActive,
      appliesTo: c.appliesTo,
      targetIds: (c.targetIds as string[]) ?? [],
      ordersCount: stats?._count._all ?? 0,
      revenue: stats?._sum.grandTotal ? toNumber(stats._sum.grandTotal) : 0,
    };
  });

  const promoRows: PromoRow[] = rules.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    config: r.config,
    isActive: r.isActive,
    priority: r.priority,
  }));

  return {
    currency: settings?.currency ?? "EGP",
    coupons: couponRows,
    promos: promoRows,
    categories,
    products,
    collections,
  };
}
