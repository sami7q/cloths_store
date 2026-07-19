import "server-only";
import { db } from "@/lib/db";
import { toNumber } from "@/lib/format";
import { parseListParams, first, type RawSearchParams } from "@/lib/admin/params";
import type { Prisma } from "@prisma/client";

/** Read-side queries for the admin Inventory module (§6.6) — flat variant view. */

export type InventoryRow = {
  variantId: string;
  productId: string;
  productName: string;
  productStatus: string;
  sku: string;
  colorName: string;
  colorHex: string;
  size: string;
  price: number;
  stock: number;
  lowStockAt: number;
  isActive: boolean;
  isLow: boolean;
};

function buildWhere(raw: RawSearchParams): Prisma.VariantWhereInput {
  const where: Prisma.VariantWhereInput = { product: { status: { not: "ARCHIVED" } } };
  const q = first(raw.q).trim();
  if (q) {
    where.OR = [
      { sku: { contains: q } },
      { colorName: { contains: q } },
      { product: { name: { contains: q } } },
      { product: { sku: { contains: q } } },
    ];
  }
  return where;
}

const toRow = (v: {
  id: string;
  productId: string;
  sku: string;
  colorName: string;
  colorHex: string;
  size: string;
  price: unknown;
  stock: number;
  lowStockAt: number;
  isActive: boolean;
  product: { name: string; status: string; basePrice: unknown };
}): InventoryRow => ({
  variantId: v.id,
  productId: v.productId,
  productName: v.product.name,
  productStatus: v.product.status,
  sku: v.sku,
  colorName: v.colorName,
  colorHex: v.colorHex,
  size: v.size,
  price: toNumber((v.price ?? v.product.basePrice) as never),
  stock: v.stock,
  lowStockAt: v.lowStockAt,
  isActive: v.isActive,
  isLow: v.stock <= v.lowStockAt,
});

export async function listInventory(raw: RawSearchParams) {
  const params = parseListParams(raw, { sort: "product", dir: "asc", perPage: 25 });
  const where = buildWhere(raw);
  const lowOnly = first(raw.low) === "1";
  const include = { product: { select: { name: true, status: true, basePrice: true } } };

  if (lowOnly) {
    // stock <= lowStockAt is a column-to-column comparison — filter in JS.
    const all = await db.variant.findMany({ where, include, take: 5000 });
    const rows = all.map(toRow).filter((r) => r.isLow);
    rows.sort((a, b) => (params.sort === "stock" ? sortNum(a.stock, b.stock, params.dir) : sortStr(a, b, params)));
    const total = rows.length;
    const start = (params.page - 1) * params.perPage;
    return { params, total, rows: rows.slice(start, start + params.perPage), lowOnly };
  }

  const orderBy: Prisma.VariantOrderByWithRelationInput =
    params.sort === "stock"
      ? { stock: params.dir }
      : params.sort === "sku"
        ? { sku: params.dir }
        : { product: { name: params.dir } };

  const [total, variants] = await Promise.all([
    db.variant.count({ where }),
    db.variant.findMany({
      where,
      include,
      orderBy,
      skip: (params.page - 1) * params.perPage,
      take: params.perPage,
    }),
  ]);
  return { params, total, rows: variants.map(toRow), lowOnly };
}

function sortNum(a: number, b: number, dir: "asc" | "desc") {
  return dir === "asc" ? a - b : b - a;
}
function sortStr(a: InventoryRow, b: InventoryRow, params: { dir: "asc" | "desc" }) {
  const cmp = `${a.productName}${a.sku}`.localeCompare(`${b.productName}${b.sku}`);
  return params.dir === "asc" ? cmp : -cmp;
}

export async function inventoryForExport(raw: RawSearchParams) {
  const lowOnly = first(raw.low) === "1";
  const variants = await db.variant.findMany({
    where: buildWhere(raw),
    include: { product: { select: { name: true, sku: true, status: true, basePrice: true } } },
    orderBy: { sku: "asc" },
    take: 5000,
  });
  return variants.filter((v) => !lowOnly || v.stock <= v.lowStockAt);
}
