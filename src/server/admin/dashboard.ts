import { db } from "@/lib/db";
import { toNumber } from "@/lib/format";
import type { OrderStatus } from "@/lib/enums";

/**
 * Dashboard aggregates (§6.1). Revenue counts every order that isn't
 * CANCELLED or RETURNED, regardless of payment status — COD orders are
 * PENDING-payment until delivered but are still demand.
 */

const DEAD_STATUSES: OrderStatus[] = ["CANCELLED", "RETURNED"];

export type KpiWindow = { revenue: number; orders: number; aov: number; newCustomers: number; ordersPerCustomer: number };

export type DashboardData = {
  currency: string;
  kpis: { today: KpiWindow; d7: KpiWindow; d30: KpiWindow };
  chart: { label: string; value: number }[];
  statusCounts: { status: string; count: number }[];
  topProducts: { productId: string | null; name: string; units: number; revenue: number }[];
  lowStock: { variantId: string; productId: string; productName: string; colorName: string; size: string; stock: number; lowStockAt: number }[];
  latestOrders: { orderNumber: string; who: string; total: number; status: string; createdAt: Date }[];
  pendingReviews: { id: string; productName: string; productSlug: string; userName: string; rating: number; title: string | null }[];
};

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

type SlimOrder = { userId: string | null; guestEmail: string | null; grandTotal: unknown; createdAt: Date };

function windowKpis(orders: SlimOrder[], newCustomers: number): KpiWindow {
  const revenue = orders.reduce((sum, o) => sum + toNumber(o.grandTotal as never), 0);
  const buyers = new Set(orders.map((o) => o.userId ?? `guest:${o.guestEmail ?? "?"}`)).size;
  return {
    revenue,
    orders: orders.length,
    aov: orders.length ? revenue / orders.length : 0,
    newCustomers,
    ordersPerCustomer: buyers ? orders.length / buyers : 0,
  };
}

export async function getDashboardData(rangeDays: number): Promise<DashboardData> {
  const today = startOfDay(new Date());
  const d7 = daysAgo(7);
  const d30 = daysAgo(30);
  const rangeStart = startOfDay(daysAgo(rangeDays - 1));
  const oldest = new Date(Math.min(rangeStart.getTime(), d30.getTime()));

  const [settings, orders, custToday, cust7, cust30, orderItems, lowVariants, latest, reviews, statusRows] =
    await Promise.all([
      db.storeSettings.findUnique({ where: { id: 1 } }),
      db.order.findMany({
        where: { createdAt: { gte: oldest }, status: { notIn: DEAD_STATUSES } },
        select: { userId: true, guestEmail: true, grandTotal: true, createdAt: true },
      }),
      db.user.count({ where: { role: "CUSTOMER", createdAt: { gte: today } } }),
      db.user.count({ where: { role: "CUSTOMER", createdAt: { gte: d7 } } }),
      db.user.count({ where: { role: "CUSTOMER", createdAt: { gte: d30 } } }),
      db.orderItem.findMany({
        where: { order: { createdAt: { gte: rangeStart }, status: { notIn: DEAD_STATUSES } } },
        select: { productId: true, nameSnapshot: true, quantity: true, total: true },
      }),
      db.variant.findMany({
        where: { isActive: true, stock: { lte: 15 }, product: { status: "ACTIVE" } },
        select: {
          id: true,
          productId: true,
          colorName: true,
          size: true,
          stock: true,
          lowStockAt: true,
          product: { select: { name: true } },
        },
        orderBy: { stock: "asc" },
      }),
      db.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          orderNumber: true,
          grandTotal: true,
          status: true,
          createdAt: true,
          guestEmail: true,
          user: { select: { name: true } },
        },
      }),
      db.review.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          rating: true,
          title: true,
          product: { select: { name: true, slug: true } },
          user: { select: { name: true } },
        },
      }),
      db.order.groupBy({
        by: ["status"],
        where: { createdAt: { gte: rangeStart } },
        _count: { _all: true },
      }),
    ]);

  const inWindow = (from: Date) => orders.filter((o) => o.createdAt >= from);

  // Revenue-by-day buckets, zero-filled across the whole range.
  const buckets = new Map<string, number>();
  for (let i = 0; i < rangeDays; i++) {
    const day = new Date(rangeStart.getTime() + i * 24 * 60 * 60 * 1000);
    buckets.set(day.toISOString().slice(0, 10), 0);
  }
  for (const o of inWindow(rangeStart)) {
    const key = new Date(o.createdAt.getTime() - o.createdAt.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + toNumber(o.grandTotal as never));
  }

  const byProduct = new Map<string, { productId: string | null; name: string; units: number; revenue: number }>();
  for (const item of orderItems) {
    const key = item.productId ?? item.nameSnapshot;
    const entry = byProduct.get(key) ?? { productId: item.productId, name: item.nameSnapshot, units: 0, revenue: 0 };
    entry.units += item.quantity;
    entry.revenue += toNumber(item.total as never);
    byProduct.set(key, entry);
  }

  return {
    currency: settings?.currency ?? "EGP",
    kpis: {
      today: windowKpis(inWindow(today), custToday),
      d7: windowKpis(inWindow(d7), cust7),
      d30: windowKpis(inWindow(d30), cust30),
    },
    chart: [...buckets.entries()].map(([key, value]) => ({
      label: new Date(`${key}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      value: Math.round(value * 100) / 100,
    })),
    statusCounts: statusRows.map((r) => ({ status: r.status, count: r._count._all })),
    topProducts: [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6),
    lowStock: lowVariants
      .filter((v) => v.stock <= v.lowStockAt)
      .slice(0, 8)
      .map((v) => ({
        variantId: v.id,
        productId: v.productId,
        productName: v.product.name,
        colorName: v.colorName,
        size: v.size,
        stock: v.stock,
        lowStockAt: v.lowStockAt,
      })),
    latestOrders: latest.map((o) => ({
      orderNumber: o.orderNumber,
      who: o.user?.name ?? o.guestEmail ?? "—",
      total: toNumber(o.grandTotal),
      status: o.status,
      createdAt: o.createdAt,
    })),
    pendingReviews: reviews.map((r) => ({
      id: r.id,
      productName: r.product.name,
      productSlug: r.product.slug,
      userName: r.user.name,
      rating: r.rating,
      title: r.title,
    })),
  };
}
