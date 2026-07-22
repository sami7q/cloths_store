import "server-only";
import { db } from "@/lib/db";
import { formatPrice, toNumber } from "@/lib/format";
import { parseListParams, first, type RawSearchParams } from "@/lib/admin/params";
import { PRODUCT_STATUSES, isOneOf } from "@/lib/enums";
import type { Prisma } from "@prisma/client";

/** Read-side queries for the admin Products module (§6.3). */

export type ProductRow = {
  id: string;
  name: string;
  sku: string;
  categoryName: string;
  imageUrl: string | null;
  price: string;
  stock: number;
  variantCount: number;
  status: string;
  isFeatured: boolean;
  updatedAt: string;
};

function buildWhere(raw: RawSearchParams): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};
  const status = first(raw.status);
  if (isOneOf(PRODUCT_STATUSES, status)) where.status = status;
  const category = first(raw.category);
  if (category) where.categoryId = category;
  const q = first(raw.q).trim();
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { nameAr: { contains: q } },
      { sku: { contains: q } },
      { material: { contains: q } },
      { slug: { contains: q } },
    ];
  }
  return where;
}

const SORT_KEYS = ["updatedAt", "name", "basePrice", "status", "createdAt"] as const;

export async function listProducts(raw: RawSearchParams) {
  const params = parseListParams(raw, { sort: "updatedAt" });
  const where = buildWhere(raw);
  const sortKey = (SORT_KEYS as readonly string[]).includes(params.sort ?? "") ? params.sort! : "updatedAt";
  const [settings, total, products, categories] = await Promise.all([
    db.storeSettings.findUnique({ where: { id: 1 } }),
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: { [sortKey]: params.dir },
      skip: (params.page - 1) * params.perPage,
      take: params.perPage,
      include: {
        category: { select: { name: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        variants: { select: { stock: true } },
      },
    }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  const currency = settings?.currency ?? "EGP";
  return {
    params,
    total,
    categories,
    rows: products.map(
      (p): ProductRow => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        categoryName: p.category.name,
        imageUrl: p.images[0]?.url ?? null,
        price: formatPrice(p.basePrice, currency),
        stock: p.variants.reduce((s, v) => s + v.stock, 0),
        variantCount: p.variants.length,
        status: p.status,
        isFeatured: p.isFeatured,
        updatedAt: p.updatedAt.toLocaleDateString("en-GB", { dateStyle: "medium" }),
      }),
    ),
  };
}

export async function productsForExport(raw: RawSearchParams) {
  return db.product.findMany({
    where: buildWhere(raw),
    orderBy: { updatedAt: "desc" },
    take: 5000,
    include: { category: { select: { slug: true } }, variants: { select: { stock: true } } },
  });
}

export type EditorVariant = {
  id: string;
  colorName: string;
  colorHex: string;
  size: string;
  sku: string;
  price: number | null;
  stock: number;
  lowStockAt: number;
  isActive: boolean;
  hasOrders: boolean;
};

export async function getProductEditorData(id: string) {
  const [product, categories, cardRule, settings] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        variants: {
          orderBy: [{ colorName: "asc" }, { size: "asc" }],
          include: { _count: { select: { orderItems: true } } },
        },
      },
    }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, parentId: true } }),
    db.promoRule.findFirst({ where: { type: "CARD_EXTRA_PERCENT", isActive: true } }),
    db.storeSettings.findUnique({ where: { id: 1 } }),
  ]);
  if (!product) return null;
  return {
    currency: settings?.currency ?? "EGP",
    cardPercent: ((cardRule?.config as { percentOff?: number } | null)?.percentOff as number | undefined) ?? null,
    categories,
    product: {
      id: product.id,
      name: product.name,
      nameAr: product.nameAr,
      slug: product.slug,
      description: product.description,
      descriptionAr: product.descriptionAr,
      material: product.material,
      brand: product.brand,
      categoryId: product.categoryId,
      sku: product.sku,
      barcode: product.barcode,
      weight: product.weight,
      tags: (product.tags as string[]) ?? [],
      basePrice: toNumber(product.basePrice),
      compareAtPrice: product.compareAtPrice ? toNumber(product.compareAtPrice) : null,
      cardPrice: product.cardPrice ? toNumber(product.cardPrice) : null,
      costPrice: product.costPrice ? toNumber(product.costPrice) : null,
      status: product.status,
      isFeatured: product.isFeatured,
      sortOrder: product.sortOrder,
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
    },
    images: product.images.map((img) => ({
      id: img.id,
      url: img.url,
      alt: img.alt,
      sortOrder: img.sortOrder,
      variantColorRef: img.variantColorRef,
    })),
    variants: product.variants.map(
      (v): EditorVariant => ({
        id: v.id,
        colorName: v.colorName,
        colorHex: v.colorHex,
        size: v.size,
        sku: v.sku,
        price: v.price ? toNumber(v.price) : null,
        stock: v.stock,
        lowStockAt: v.lowStockAt,
        isActive: v.isActive,
        hasOrders: v._count.orderItems > 0,
      }),
    ),
  };
}

export async function getCategoriesForSelect() {
  return db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, parentId: true } });
}
