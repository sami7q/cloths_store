"use server";

import { db } from "@/lib/db";
import { verifiedUserId } from "@/lib/auth-guards";
import { z } from "zod";
import { formatPrice, percentOff, toNumber } from "@/lib/format";

const idsSchema = z.array(z.string().min(1)).max(200);

/** Serializable product-card payload for client-rendered grids (wishlist). */
export type WishlistCard = {
  productId: string;
  slug: string;
  name: string;
  material: string | null;
  price: string;
  oldPrice: string | null;
  cardPrice: string | null;
  savePercent: number | null;
  swatches: { name: string; hex: string }[];
  sizes: string[];
  imageUrl: string | null;
  imageAlt: string;
  quickAdd: {
    variantId: string;
    unitPrice: number;
    maxStock: number;
    colorName: string;
    size: string;
  } | null;
};

export async function getWishlistCards(guestIds: unknown): Promise<{ cards: WishlistCard[]; promo: { cardPercentOff: number | null; freeShippingOver: number | null } }> {
  const { ids } = await syncWishlist(guestIds);
  const [settings, rules, products] = await Promise.all([
    db.storeSettings.findUnique({ where: { id: 1 } }),
    db.promoRule.findMany({ where: { isActive: true } }),
    ids.length
      ? db.product.findMany({
          where: { id: { in: ids }, status: "ACTIVE" },
          include: {
            images: { orderBy: { sortOrder: "asc" }, take: 1 },
            variants: { where: { isActive: true } },
          },
        })
      : Promise.resolve([]),
  ]);
  const currency = settings?.currency ?? "EGP";
  const card = rules.find((r) => r.type === "CARD_EXTRA_PERCENT")?.config as { percentOff?: number } | undefined;
  const ship = rules.find((r) => r.type === "FREE_SHIPPING_OVER")?.config as { threshold?: number } | undefined;

  const cards: WishlistCard[] = products.map((p) => {
    const colorSeen = new Map<string, string>();
    for (const v of p.variants) if (!colorSeen.has(v.colorName)) colorSeen.set(v.colorName, v.colorHex);
    const firstInStock = p.variants.find((v) => v.stock > 0) ?? null;
    return {
      productId: p.id,
      slug: p.slug,
      name: p.name,
      material: p.material,
      price: formatPrice(p.basePrice, currency),
      oldPrice: p.compareAtPrice ? formatPrice(p.compareAtPrice, currency) : null,
      cardPrice: p.cardPrice ? formatPrice(p.cardPrice, currency) : null,
      savePercent: percentOff(p.compareAtPrice, p.basePrice),
      swatches: [...colorSeen.entries()].slice(0, 4).map(([name, hex]) => ({ name, hex })),
      sizes: [...new Set(p.variants.map((v) => v.size))].slice(0, 5),
      imageUrl: p.images[0]?.url ?? null,
      imageAlt: p.images[0]?.alt ?? p.name,
      quickAdd: firstInStock
        ? {
            variantId: firstInStock.id,
            unitPrice: toNumber(firstInStock.price ?? p.basePrice),
            maxStock: firstInStock.stock,
            colorName: firstInStock.colorName,
            size: firstInStock.size,
          }
        : null,
    };
  });
  return {
    cards,
    promo: { cardPercentOff: card?.percentOff ?? null, freeShippingOver: ship?.threshold ?? null },
  };
}

/** Toggle a product for the logged-in user; guests keep localStorage only. */
export async function toggleWishlist(productId: string): Promise<{ synced: boolean }> {
  const userId = await verifiedUserId();
  if (!userId) return { synced: false };
  const existing = await db.wishlistItem.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (existing) {
    await db.wishlistItem.delete({ where: { id: existing.id } });
  } else {
    // Ignore unknown product ids silently (product may have been deleted).
    const product = await db.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (product) await db.wishlistItem.create({ data: { userId, productId } });
  }
  return { synced: true };
}

/**
 * Merge guest (localStorage) ids into the user's DB wishlist and return the
 * authoritative id list. Guests get their own ids back unchanged.
 */
export async function syncWishlist(guestIds: unknown): Promise<{ ids: string[]; synced: boolean }> {
  const ids = idsSchema.parse(guestIds ?? []);
  const userId = await verifiedUserId();
  if (!userId) return { ids, synced: false };

  if (ids.length) {
    const [valid, existing] = await Promise.all([
      db.product.findMany({ where: { id: { in: ids }, status: "ACTIVE" }, select: { id: true } }),
      db.wishlistItem.findMany({ where: { userId }, select: { productId: true } }),
    ]);
    const have = new Set(existing.map((w) => w.productId));
    const toCreate = valid.filter((p) => !have.has(p.id));
    // no skipDuplicates on SQLite — filter beforehand
    if (toCreate.length) {
      await db.wishlistItem.createMany({
        data: toCreate.map((p) => ({ userId, productId: p.id })),
      });
    }
  }
  const all = await db.wishlistItem.findMany({
    where: { userId },
    select: { productId: true },
  });
  return { ids: all.map((w) => w.productId), synced: true };
}
