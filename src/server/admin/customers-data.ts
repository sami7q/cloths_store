import "server-only";
import { db } from "@/lib/db";
import { formatPrice, toNumber } from "@/lib/format";
import { parseListParams, first, type RawSearchParams } from "@/lib/admin/params";
import type { Prisma } from "@prisma/client";

/** Read-side queries for the admin Customers module (§6.8). */

const LIVE_ORDERS: Prisma.OrderWhereInput = { status: { notIn: ["CANCELLED", "RETURNED"] } };

export type CustomerRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  ordersCount: number;
  lifetimeValue: string;
  lastOrder: string | null;
  joined: string;
};

function buildWhere(raw: RawSearchParams): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = { role: "CUSTOMER" };
  const q = first(raw.q).trim();
  if (q) {
    where.OR = [{ name: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }];
  }
  return where;
}

export async function listCustomers(raw: RawSearchParams) {
  const params = parseListParams(raw, { sort: "createdAt" });
  const where = buildWhere(raw);
  const sortKey = ["createdAt", "name", "email"].includes(params.sort ?? "") ? params.sort! : "createdAt";

  const [settings, total, users] = await Promise.all([
    db.storeSettings.findUnique({ where: { id: 1 } }),
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { [sortKey]: params.dir },
      skip: (params.page - 1) * params.perPage,
      take: params.perPage,
    }),
  ]);
  const currency = settings?.currency ?? "EGP";

  const stats = await db.order.groupBy({
    by: ["userId"],
    where: { userId: { in: users.map((u) => u.id) }, ...LIVE_ORDERS },
    _count: { _all: true },
    _sum: { grandTotal: true },
    _max: { createdAt: true },
  });
  const byUser = new Map(stats.map((s) => [s.userId, s]));

  const rows: CustomerRow[] = users.map((u) => {
    const s = byUser.get(u.id);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      isActive: u.isActive,
      ordersCount: s?._count._all ?? 0,
      lifetimeValue: formatPrice(s?._sum.grandTotal ? toNumber(s._sum.grandTotal) : 0, currency),
      lastOrder: s?._max.createdAt
        ? s._max.createdAt.toLocaleDateString("en-GB", { dateStyle: "medium" })
        : null,
      joined: u.createdAt.toLocaleDateString("en-GB", { dateStyle: "medium" }),
    };
  });
  return { params, total, rows, currency };
}

export async function customersForExport(raw: RawSearchParams) {
  const users = await db.user.findMany({
    where: buildWhere(raw),
    orderBy: { createdAt: "desc" },
    take: 5000,
  });
  const stats = await db.order.groupBy({
    by: ["userId"],
    where: { userId: { in: users.map((u) => u.id) }, ...LIVE_ORDERS },
    _count: { _all: true },
    _sum: { grandTotal: true },
    _max: { createdAt: true },
  });
  const byUser = new Map(stats.map((s) => [s.userId, s]));
  return users.map((u) => ({ user: u, stats: byUser.get(u.id) ?? null }));
}

export async function getCustomerDetail(id: string) {
  const [settings, user] = await Promise.all([
    db.storeSettings.findUnique({ where: { id: 1 } }),
    db.user.findUnique({
      where: { id, role: "CUSTOMER" },
      include: {
        addresses: { orderBy: { isDefault: "desc" } },
        orders: { orderBy: { createdAt: "desc" }, include: { _count: { select: { items: true } } } },
        _count: { select: { wishlist: true, reviews: true } },
      },
    }),
  ]);
  if (!user) return null;
  const currency = settings?.currency ?? "EGP";
  const live = user.orders.filter((o) => !["CANCELLED", "RETURNED"].includes(o.status));
  return {
    currency,
    user,
    lifetimeValue: formatPrice(
      live.reduce((sum, o) => sum + toNumber(o.grandTotal), 0),
      currency,
    ),
    ordersCount: live.length,
  };
}
