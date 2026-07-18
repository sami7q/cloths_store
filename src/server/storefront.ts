import { cache } from "react";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { BannerPlacement } from "@/lib/enums";

/**
 * Storefront read layer — every query is request-deduped via react cache().
 * All content comes from the DB (StoreSettings / Banner / Category /
 * Collection / Product); nothing merchant-specific lives in code.
 */

export const getStoreSettings = cache(async () => {
  return db.storeSettings.findUnique({ where: { id: 1 } });
});

export const getBanners = cache(async (placement: BannerPlacement) => {
  return db.banner.findMany({
    where: { placement, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
});

export const getNavCategories = cache(async () => {
  return db.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: { sortOrder: "asc" },
  });
});

/** Card-relevant promo facts (full engine lands in Phase 4). */
export const getPromoFacts = cache(async () => {
  const rules = await db.promoRule.findMany({ where: { isActive: true } });
  const card = rules.find((r) => r.type === "CARD_EXTRA_PERCENT");
  const freeShip = rules.find((r) => r.type === "FREE_SHIPPING_OVER");
  const cardConfig = card?.config as { percentOff?: number } | undefined;
  const shipConfig = freeShip?.config as { threshold?: number } | undefined;
  return {
    cardPercentOff: cardConfig?.percentOff ?? null,
    freeShippingOver: shipConfig?.threshold ?? null,
  };
});

const productCardInclude = {
  images: { orderBy: { sortOrder: "asc" as const } },
  variants: { where: { isActive: true } },
} satisfies Prisma.ProductInclude;

export type ProductForCard = Prisma.ProductGetPayload<{ include: typeof productCardInclude }>;

export const getCollectionProducts = cache(async (slug: string, take = 8) => {
  const collection = await db.collection.findUnique({
    where: { slug },
    include: {
      products: {
        orderBy: { sortOrder: "asc" },
        take,
        include: { product: { include: productCardInclude } },
      },
    },
  });
  if (!collection || !collection.isActive) return null;
  return {
    ...collection,
    items: collection.products
      .map((cp) => cp.product)
      .filter((p) => p.status === "ACTIVE"),
  };
});

export const getFeaturedProducts = cache(async (take = 4) => {
  return db.product.findMany({
    where: { status: "ACTIVE", isFeatured: true },
    orderBy: { sortOrder: "asc" },
    take,
    include: productCardInclude,
  });
});

// ---------------------------------------------------------------------------
// PLP
// ---------------------------------------------------------------------------

export type CatalogFilters = {
  colors?: string[];
  sizes?: string[];
  materials?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: "newest" | "price-asc" | "price-desc" | "popular";
  page?: number;
};

export const PLP_PAGE_SIZE = 12;

function productWhere(base: Prisma.ProductWhereInput, f: CatalogFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { ...base, status: "ACTIVE" };
  if (f.minPrice != null || f.maxPrice != null) {
    where.basePrice = {
      ...(f.minPrice != null ? { gte: f.minPrice } : {}),
      ...(f.maxPrice != null ? { lte: f.maxPrice } : {}),
    };
  }
  if (f.materials?.length) where.material = { in: f.materials };
  const variantAnd: Prisma.VariantWhereInput = {};
  if (f.colors?.length) variantAnd.colorName = { in: f.colors };
  if (f.sizes?.length) variantAnd.size = { in: f.sizes };
  if (f.inStock) variantAnd.stock = { gt: 0 };
  if (Object.keys(variantAnd).length) where.variants = { some: { ...variantAnd, isActive: true } };
  return where;
}

function productOrderBy(sort: CatalogFilters["sort"]): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price-asc":
      return [{ basePrice: "asc" }];
    case "price-desc":
      return [{ basePrice: "desc" }];
    case "popular":
      return [{ isFeatured: "desc" }, { sortOrder: "asc" }];
    default:
      return [{ createdAt: "desc" }];
  }
}

export async function queryProducts(base: Prisma.ProductWhereInput, f: CatalogFilters) {
  const where = productWhere(base, f);
  const page = Math.max(1, f.page ?? 1);
  const [total, products] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: productOrderBy(f.sort),
      skip: (page - 1) * PLP_PAGE_SIZE,
      take: PLP_PAGE_SIZE,
      include: productCardInclude,
    }),
  ]);
  return { total, products, page, pageCount: Math.max(1, Math.ceil(total / PLP_PAGE_SIZE)) };
}

export const getCategoryBySlug = cache(async (slug: string) => {
  return db.category.findUnique({ where: { slug } });
});

/** Facet values available inside a category (or globally when null). */
export const getCatalogFacets = cache(async (categoryId: string | null) => {
  const productFilter = categoryId ? { categoryId, status: "ACTIVE" } : { status: "ACTIVE" };
  const [colors, sizes, materials, priceAgg] = await Promise.all([
    db.variant.findMany({
      where: { isActive: true, product: productFilter },
      select: { colorName: true, colorHex: true },
      distinct: ["colorName"],
      orderBy: { colorName: "asc" },
    }),
    db.variant.findMany({
      where: { isActive: true, product: productFilter },
      select: { size: true },
      distinct: ["size"],
      orderBy: { size: "asc" },
    }),
    db.product.findMany({
      where: { ...productFilter, material: { not: null } },
      select: { material: true },
      distinct: ["material"],
      orderBy: { material: "asc" },
    }),
    db.product.aggregate({
      where: productFilter,
      _min: { basePrice: true },
      _max: { basePrice: true },
    }),
  ]);
  return {
    colors,
    sizes: sizes.map((s) => s.size),
    materials: materials.map((m) => m.material as string),
    minPrice: Number(priceAgg._min.basePrice ?? 0),
    maxPrice: Number(priceAgg._max.basePrice ?? 0),
  };
});

// ---------------------------------------------------------------------------
// PDP
// ---------------------------------------------------------------------------

export const getProductBySlug = cache(async (slug: string) => {
  return db.product.findUnique({
    where: { slug },
    include: {
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { isActive: true }, orderBy: [{ colorName: "asc" }, { size: "asc" }] },
      reviews: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true } } },
      },
    },
  });
});

export const getRelatedProducts = cache(async (categoryId: string, excludeId: string, take = 4) => {
  return db.product.findMany({
    where: { categoryId, status: "ACTIVE", id: { not: excludeId } },
    orderBy: { sortOrder: "asc" },
    take,
    include: productCardInclude,
  });
});
