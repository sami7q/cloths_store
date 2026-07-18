import type { CatalogFilters } from "@/server/storefront";

/** URL searchParams ⇄ CatalogFilters helpers shared by PLP and search. */

export type SearchParams = Record<string, string | string[] | undefined>;

function list(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return (Array.isArray(v) ? v : [v]).flatMap((s) => s.split(",")).filter(Boolean);
}

function num(v: string | string[] | undefined): number | undefined {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function parseFilters(sp: SearchParams): CatalogFilters {
  const sort = (Array.isArray(sp.sort) ? sp.sort[0] : sp.sort) as CatalogFilters["sort"];
  return {
    colors: list(sp.color),
    sizes: list(sp.size),
    materials: list(sp.material),
    minPrice: num(sp.min),
    maxPrice: num(sp.max),
    inStock: sp.stock === "1",
    sort: ["newest", "price-asc", "price-desc", "popular"].includes(sort ?? "") ? sort : "newest",
    page: num(sp.page) || 1,
  };
}

/** Rebuild the query string with one mutation; filter changes reset the page. */
export function buildHref(base: string, sp: SearchParams, mutate: (p: URLSearchParams) => void): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    for (const item of Array.isArray(v) ? v : v != null ? [v] : []) p.append(k, item);
  }
  p.delete("page");
  mutate(p);
  const qs = p.toString();
  return qs ? `${base}?${qs}` : base;
}

export function toggleHref(base: string, sp: SearchParams, key: string, value: string): string {
  return buildHref(base, sp, (p) => {
    const values = p.getAll(key).flatMap((s) => s.split(","));
    p.delete(key);
    const next = values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
    if (next.length) p.set(key, next.join(","));
  });
}
