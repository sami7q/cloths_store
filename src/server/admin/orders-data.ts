import "server-only";
import { db } from "@/lib/db";
import { toNumber, formatPrice } from "@/lib/format";
import { parseListParams, first, type RawSearchParams } from "@/lib/admin/params";
import { ORDER_STATUSES, PAYMENT_STATUSES, isOneOf } from "@/lib/enums";
import type { Prisma } from "@prisma/client";

/** Read-side queries for the admin Orders module (§6.2). */

export type OrderRow = {
  id: string;
  orderNumber: string;
  who: string;
  email: string;
  itemCount: number;
  total: string;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  createdAt: string;
};

function buildWhere(raw: RawSearchParams): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};
  const tab = first(raw.tab);
  if (isOneOf(ORDER_STATUSES, tab)) where.status = tab;
  const pm = first(raw.pm);
  if (pm === "CARD" || pm === "COD") where.paymentMethod = pm;
  const ps = first(raw.ps);
  if (isOneOf(PAYMENT_STATUSES, ps)) where.paymentStatus = ps;
  const from = first(raw.from);
  const to = first(raw.to);
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(`${from}T00:00:00`);
    if (to) where.createdAt.lte = new Date(`${to}T23:59:59`);
  }
  const q = first(raw.q).trim();
  if (q) {
    where.OR = [
      { orderNumber: { contains: q } },
      { guestEmail: { contains: q } },
      { user: { OR: [{ name: { contains: q } }, { email: { contains: q } }] } },
    ];
  }
  return where;
}

const SORTS: Record<string, Prisma.OrderOrderByWithRelationInput> = {
  createdAt: { createdAt: "desc" },
  total: { grandTotal: "desc" },
  orderNumber: { orderNumber: "desc" },
  status: { status: "desc" },
};

function orderBy(sort: string | null, dir: "asc" | "desc"): Prisma.OrderOrderByWithRelationInput {
  const base = SORTS[sort ?? "createdAt"] ?? SORTS.createdAt;
  const key = Object.keys(base)[0] as keyof Prisma.OrderOrderByWithRelationInput;
  return { [key]: dir } as Prisma.OrderOrderByWithRelationInput;
}

async function currency(): Promise<string> {
  const settings = await db.storeSettings.findUnique({ where: { id: 1 } });
  return settings?.currency ?? "EGP";
}

function toRow(cur: string) {
  return (o: {
    id: string;
    orderNumber: string;
    guestEmail: string | null;
    user: { name: string; email: string } | null;
    _count: { items: number };
    grandTotal: unknown;
    paymentMethod: string;
    paymentStatus: string;
    status: string;
    createdAt: Date;
  }): OrderRow => ({
    id: o.id,
    orderNumber: o.orderNumber,
    who: o.user?.name ?? o.guestEmail ?? "—",
    email: o.user?.email ?? o.guestEmail ?? "",
    itemCount: o._count.items,
    total: formatPrice(o.grandTotal as never, cur),
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    status: o.status,
    createdAt: o.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }),
  });
}

export async function listOrders(raw: RawSearchParams) {
  const params = parseListParams(raw, { sort: "createdAt" });
  const where = buildWhere(raw);
  const [cur, total, rows, statusRows] = await Promise.all([
    currency(),
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: orderBy(params.sort, params.dir),
      skip: (params.page - 1) * params.perPage,
      take: params.perPage,
      include: { user: { select: { name: true, email: true } }, _count: { select: { items: true } } },
    }),
    db.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const tabCounts = Object.fromEntries(statusRows.map((r) => [r.status, r._count._all]));
  return { params, total, rows: rows.map(toRow(cur)), tabCounts, allCount: statusRows.reduce((s, r) => s + r._count._all, 0) };
}

export async function ordersForExport(raw: RawSearchParams) {
  const where = buildWhere(raw);
  return db.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 5000,
    include: { user: { select: { name: true, email: true } }, _count: { select: { items: true } } },
  });
}

export async function getOrderDetail(orderNumber: string) {
  const [cur, order] = await Promise.all([
    currency(),
    db.order.findUnique({
      where: { orderNumber },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        items: true,
        statusHistory: { orderBy: { createdAt: "asc" }, include: { byUser: { select: { name: true } } } },
      },
    }),
  ]);
  if (!order) return null;
  return { order, currency: cur };
}

/** Catalog + customers payload for the manual-order form. */
export async function getManualOrderContext() {
  const [cur, settings, customers, products, zones] = await Promise.all([
    currency(),
    db.storeSettings.findUnique({ where: { id: 1 } }),
    db.user.findMany({
      where: { role: "CUSTOMER", isActive: true },
      select: { id: true, name: true, email: true, phone: true },
      orderBy: { name: "asc" },
      take: 500,
    }),
    db.product.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        basePrice: true,
        variants: {
          where: { isActive: true },
          select: { id: true, colorName: true, size: true, stock: true, price: true },
          orderBy: [{ colorName: "asc" }, { size: "asc" }],
        },
      },
      orderBy: { name: "asc" },
    }),
    db.shippingZone.findMany({ where: { isActive: true }, select: { cities: true } }),
  ]);
  return {
    currency: cur,
    codEnabled: settings?.codEnabled ?? true,
    customers,
    cities: [...new Set(zones.flatMap((z) => (z.cities as string[]) ?? []))].sort(),
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      variants: p.variants.map((v) => ({
        id: v.id,
        label: `${v.colorName} / ${v.size}`,
        stock: v.stock,
        price: toNumber(v.price ?? p.basePrice),
      })),
    })),
  };
}
