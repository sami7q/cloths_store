"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { formatPrice, toNumber } from "@/lib/format";

export type SearchSuggestion = {
  slug: string;
  name: string;
  priceLabel: string;
  imageUrl: string | null;
};

/** Debounced header suggestions — top 5 active products by name match. */
export async function searchSuggestions(query: unknown): Promise<SearchSuggestion[]> {
  const q = z.string().max(80).parse(query ?? "").trim();
  if (q.length < 2) return [];
  const [settings, products] = await Promise.all([
    db.storeSettings.findUnique({ where: { id: 1 } }),
    db.product.findMany({
      where: { status: "ACTIVE", OR: [{ name: { contains: q } }, { material: { contains: q } }] },
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
      take: 5,
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    }),
  ]);
  const currency = settings?.currency ?? "EGP";
  return products.map((p) => ({
    slug: p.slug,
    name: p.name,
    priceLabel: formatPrice(toNumber(p.basePrice), currency),
    imageUrl: p.images[0]?.url ?? null,
  }));
}
