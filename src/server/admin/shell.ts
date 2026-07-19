"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth-guards";
import { can } from "@/lib/permissions";
import { auth } from "@/lib/auth";

export type AdminSearchResult = {
  products: { id: string; name: string; sku: string; href: string }[];
  orders: { id: string; orderNumber: string; who: string; href: string }[];
  customers: { id: string; name: string; email: string; href: string }[];
};

/** Topbar global search across products / orders / customers (§6 shell). */
export async function adminGlobalSearch(query: unknown): Promise<AdminSearchResult> {
  const empty: AdminSearchResult = { products: [], orders: [], customers: [] };
  const q = typeof query === "string" ? query.trim() : "";
  if (q.length < 2) return empty;

  const session = await auth();
  const role = session?.user?.role;
  if (!can(role, "dashboard", "view")) return empty;

  const [products, orders, customers] = await Promise.all([
    can(role, "products", "view")
      ? db.product.findMany({
          where: { OR: [{ name: { contains: q } }, { sku: { contains: q } }, { slug: { contains: q } }] },
          select: { id: true, name: true, sku: true },
          take: 5,
        })
      : [],
    can(role, "orders", "view")
      ? db.order.findMany({
          where: {
            OR: [
              { orderNumber: { contains: q } },
              { guestEmail: { contains: q } },
              { user: { OR: [{ name: { contains: q } }, { email: { contains: q } }] } },
            ],
          },
          select: { id: true, orderNumber: true, guestEmail: true, user: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      : [],
    can(role, "customers", "view")
      ? db.user.findMany({
          where: { role: "CUSTOMER", OR: [{ name: { contains: q } }, { email: { contains: q } }] },
          select: { id: true, name: true, email: true },
          take: 5,
        })
      : [],
  ]);

  return {
    products: products.map((p) => ({ id: p.id, name: p.name, sku: p.sku, href: `/admin/products/${p.id}` })),
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      who: o.user?.name ?? o.guestEmail ?? "",
      href: `/admin/orders/${o.orderNumber}`,
    })),
    customers: customers.map((c) => ({ id: c.id, name: c.name, email: c.email, href: `/admin/customers/${c.id}` })),
  };
}

export async function markAllNotificationsRead(): Promise<void> {
  await requireAdminAction("notifications", "edit");
  await db.notification.updateMany({ where: { isRead: false }, data: { isRead: true } });
  revalidatePath("/admin", "layout");
}
