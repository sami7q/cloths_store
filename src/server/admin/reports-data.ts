import "server-only";
import { db } from "@/lib/db";
import { toNumber } from "@/lib/format";
import { first, type RawSearchParams } from "@/lib/admin/params";

/**
 * Reports (§6.15) — aggregates computed in JS from the range's orders so the
 * queries stay portable across SQLite (dev) and Postgres (prod).
 */

export type ReportRange = { from: Date; to: Date; fromStr: string; toStr: string };

export function parseRange(raw: RawSearchParams): ReportRange {
  const today = new Date();
  const defaultFrom = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
  const fromStr = /^\d{4}-\d{2}-\d{2}$/.test(first(raw.from)) ? first(raw.from) : defaultFrom.toISOString().slice(0, 10);
  const toStr = /^\d{4}-\d{2}-\d{2}$/.test(first(raw.to)) ? first(raw.to) : today.toISOString().slice(0, 10);
  return {
    from: new Date(`${fromStr}T00:00:00`),
    to: new Date(`${toStr}T23:59:59`),
    fromStr,
    toStr,
  };
}

export type ReportsData = {
  currency: string;
  totals: { orders: number; revenue: number; units: number };
  byDay: { day: string; orders: number; revenue: number }[];
  byCategory: { name: string; units: number; revenue: number; share: number }[];
  byProduct: { name: string; sku: string; units: number; revenue: number }[];
  paymentSplit: { method: string; orders: number; revenue: number; share: number }[];
  coupons: { code: string; orders: number; discount: number; revenue: number; avgOrder: number }[];
};

export async function getReportsData(range: ReportRange): Promise<ReportsData> {
  const [settings, orders] = await Promise.all([
    db.storeSettings.findUnique({ where: { id: 1 } }),
    db.order.findMany({
      where: { createdAt: { gte: range.from, lte: range.to }, status: { notIn: ["CANCELLED", "RETURNED"] } },
      include: {
        items: { include: { product: { select: { sku: true, category: { select: { name: true } } } } } },
      },
      orderBy: { createdAt: "asc" },
      take: 5000,
    }),
  ]);

  const round = (n: number) => Math.round(n * 100) / 100;
  let totalRevenue = 0;
  let totalUnits = 0;

  const byDay = new Map<string, { orders: number; revenue: number }>();
  const byCategory = new Map<string, { units: number; revenue: number }>();
  const byProduct = new Map<string, { name: string; sku: string; units: number; revenue: number }>();
  const byMethod = new Map<string, { orders: number; revenue: number }>();
  const byCoupon = new Map<string, { orders: number; discount: number; revenue: number }>();

  for (const order of orders) {
    const revenue = toNumber(order.grandTotal);
    totalRevenue += revenue;

    const day = new Date(order.createdAt.getTime() - order.createdAt.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
    const d = byDay.get(day) ?? { orders: 0, revenue: 0 };
    d.orders += 1;
    d.revenue += revenue;
    byDay.set(day, d);

    const m = byMethod.get(order.paymentMethod) ?? { orders: 0, revenue: 0 };
    m.orders += 1;
    m.revenue += revenue;
    byMethod.set(order.paymentMethod, m);

    if (order.couponCode) {
      const c = byCoupon.get(order.couponCode) ?? { orders: 0, discount: 0, revenue: 0 };
      c.orders += 1;
      c.discount += toNumber(order.discountTotal);
      c.revenue += revenue;
      byCoupon.set(order.couponCode, c);
    }

    for (const item of order.items) {
      totalUnits += item.quantity;
      const itemRevenue = toNumber(item.total);
      const categoryName = item.product?.category.name ?? "—";
      const cat = byCategory.get(categoryName) ?? { units: 0, revenue: 0 };
      cat.units += item.quantity;
      cat.revenue += itemRevenue;
      byCategory.set(categoryName, cat);

      const key = item.productId ?? item.nameSnapshot;
      const prod = byProduct.get(key) ?? {
        name: item.nameSnapshot.split(" — ")[0],
        sku: item.product?.sku ?? "—",
        units: 0,
        revenue: 0,
      };
      prod.units += item.quantity;
      prod.revenue += itemRevenue;
      byProduct.set(key, prod);
    }
  }

  const itemRevenueTotal = [...byCategory.values()].reduce((sum, c) => sum + c.revenue, 0) || 1;

  return {
    currency: settings?.currency ?? "EGP",
    totals: { orders: orders.length, revenue: round(totalRevenue), units: totalUnits },
    byDay: [...byDay.entries()].map(([day, v]) => ({ day, orders: v.orders, revenue: round(v.revenue) })),
    byCategory: [...byCategory.entries()]
      .map(([name, v]) => ({
        name,
        units: v.units,
        revenue: round(v.revenue),
        share: Math.round((v.revenue / itemRevenueTotal) * 100),
      }))
      .sort((a, b) => b.revenue - a.revenue),
    byProduct: [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 20).map((p) => ({
      ...p,
      revenue: round(p.revenue),
    })),
    paymentSplit: [...byMethod.entries()].map(([method, v]) => ({
      method,
      orders: v.orders,
      revenue: round(v.revenue),
      share: orders.length ? Math.round((v.orders / orders.length) * 100) : 0,
    })),
    coupons: [...byCoupon.entries()]
      .map(([code, v]) => ({
        code,
        orders: v.orders,
        discount: round(v.discount),
        revenue: round(v.revenue),
        avgOrder: round(v.revenue / v.orders),
      }))
      .sort((a, b) => b.revenue - a.revenue),
  };
}
