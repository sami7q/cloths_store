import Link from "next/link";
import { notFound } from "next/navigation";
import { messages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  getCatalogFacets,
  getCategoryBySlug,
  getPromoFacts,
  getStoreSettings,
  queryProducts,
  type CatalogFilters,
} from "@/server/storefront";
import { SplitHeading } from "@/components/store/split-heading";
import { ShopProductCard } from "@/components/store/shop-product-card";
import { buildProductCardProps, buildQuickAddItem } from "@/components/store/product-card-mapper";
import { Badge } from "@/components/ui/badge";
import { buildHref, parseFilters, toggleHref, type SearchParams } from "@/lib/catalog-params";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const category = await getCategoryBySlug(slug);
  if (!category || !category.isActive) notFound();

  const filters = parseFilters(sp);
  const [settings, promo, facets, result] = await Promise.all([
    getStoreSettings(),
    getPromoFacts(),
    getCatalogFacets(category.id),
    queryProducts({ categoryId: category.id }, filters),
  ]);
  const currency = settings?.currency ?? "EGP";
  const t = messages.plp;
  const base = `/category/${slug}`;

  const [left, right] = category.name.includes(" ")
    ? [category.name.split(" ")[0], category.name.split(" ").slice(1).join(" ")]
    : [messages.store.category, category.name];

  const activeChips: { label: string; href: string }[] = [
    ...filters.colors!.map((c) => ({ label: c, href: toggleHref(base, sp, "color", c) })),
    ...filters.sizes!.map((s) => ({ label: s, href: toggleHref(base, sp, "size", s) })),
    ...filters.materials!.map((m) => ({ label: m, href: toggleHref(base, sp, "material", m) })),
    ...(filters.minPrice != null || filters.maxPrice != null
      ? [{
          label: `${filters.minPrice ?? facets.minPrice} – ${filters.maxPrice ?? facets.maxPrice}`,
          href: buildHref(base, sp, (p) => { p.delete("min"); p.delete("max"); }),
        }]
      : []),
    ...(filters.inStock
      ? [{ label: t.inStockOnly, href: buildHref(base, sp, (p) => p.delete("stock")) }]
      : []),
  ];

  const sortOptions: { value: NonNullable<CatalogFilters["sort"]>; label: string }[] = [
    { value: "newest", label: t.newest },
    { value: "price-asc", label: t.priceLowHigh },
    { value: "price-desc", label: t.priceHighLow },
    { value: "popular", label: t.popular },
  ];

  return (
    <div className="container-store pb-4 pt-2">
      <SplitHeading left={left} right={right} />

      <div className="grid grid-cols-[260px_1fr] gap-8 max-lg:grid-cols-1">
        {/* Filter sidebar */}
        <aside className="flex h-fit flex-col gap-6 rounded-[10px] border border-line bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold uppercase tracking-[1px]">{t.filters}</h2>
            {activeChips.length > 0 ? (
              <Link href={base} className="text-sm font-bold text-deal-red hover:underline">
                {t.clearAll}
              </Link>
            ) : null}
          </div>

          <fieldset>
            <legend className="mb-2.5 text-sm font-extrabold uppercase tracking-[0.5px]">{t.price}</legend>
            <form action={base} className="flex items-center gap-2">
              {/* keep other filters when applying the price range */}
              {filters.colors!.length ? <input type="hidden" name="color" value={filters.colors!.join(",")} /> : null}
              {filters.sizes!.length ? <input type="hidden" name="size" value={filters.sizes!.join(",")} /> : null}
              {filters.materials!.length ? <input type="hidden" name="material" value={filters.materials!.join(",")} /> : null}
              {filters.inStock ? <input type="hidden" name="stock" value="1" /> : null}
              {filters.sort !== "newest" ? <input type="hidden" name="sort" value={filters.sort} /> : null}
              <input
                type="number"
                name="min"
                min={0}
                placeholder={`${t.min} ${facets.minPrice}`}
                defaultValue={filters.minPrice ?? ""}
                className="h-10 w-full min-w-0 rounded-lg border border-line px-3 text-sm outline-none focus:border-navy"
              />
              <span className="text-gray-4">–</span>
              <input
                type="number"
                name="max"
                min={0}
                placeholder={`${t.max} ${facets.maxPrice}`}
                defaultValue={filters.maxPrice ?? ""}
                className="h-10 w-full min-w-0 rounded-lg border border-line px-3 text-sm outline-none focus:border-navy"
              />
              <button
                type="submit"
                className="h-10 shrink-0 rounded-lg bg-navy px-3.5 text-sm font-extrabold uppercase text-white"
              >
                {t.apply}
              </button>
            </form>
          </fieldset>

          <fieldset>
            <legend className="mb-2.5 text-sm font-extrabold uppercase tracking-[0.5px]">{t.color}</legend>
            <div className="flex flex-wrap gap-2.5">
              {facets.colors.map((c) => {
                const active = filters.colors!.includes(c.colorName);
                return (
                  <Link
                    key={c.colorName}
                    href={toggleHref(base, sp, "color", c.colorName)}
                    title={c.colorName}
                    aria-pressed={active}
                    className={cn(
                      "size-7 rounded-full border-2 border-white transition-transform hover:scale-110",
                      active ? "shadow-[0_0_0_2px_var(--ink)]" : "shadow-[0_0_0_1.5px_var(--line)]",
                    )}
                    style={{ backgroundColor: c.colorHex }}
                  />
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2.5 text-sm font-extrabold uppercase tracking-[0.5px]">{t.size}</legend>
            <div className="flex flex-wrap gap-2">
              {facets.sizes.map((s) => {
                const active = filters.sizes!.includes(s);
                return (
                  <Link
                    key={s}
                    href={toggleHref(base, sp, "size", s)}
                    aria-pressed={active}
                    className={cn(
                      "flex h-[34px] min-w-[42px] items-center justify-center rounded-[7px] border px-1 text-[14.5px] font-bold",
                      active ? "border-ink text-ink" : "border-line text-gray-6",
                    )}
                  >
                    {s}
                  </Link>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2.5 text-sm font-extrabold uppercase tracking-[0.5px]">{t.material}</legend>
            <ul className="flex flex-col gap-2">
              {facets.materials.map((m) => {
                const active = filters.materials!.includes(m);
                return (
                  <li key={m}>
                    <Link
                      href={toggleHref(base, sp, "material", m)}
                      aria-pressed={active}
                      className={cn(
                        "text-[15px] font-semibold hover:text-navy",
                        active ? "font-extrabold text-navy" : "text-gray-6",
                      )}
                    >
                      {active ? "✓ " : ""}
                      {m}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </fieldset>

          <fieldset>
            <legend className="mb-2.5 text-sm font-extrabold uppercase tracking-[0.5px]">{t.availability}</legend>
            <Link
              href={filters.inStock ? buildHref(base, sp, (p) => p.delete("stock")) : buildHref(base, sp, (p) => p.set("stock", "1"))}
              aria-pressed={filters.inStock}
              className={cn(
                "text-[15px] font-semibold hover:text-navy",
                filters.inStock ? "font-extrabold text-navy" : "text-gray-6",
              )}
            >
              {filters.inStock ? "✓ " : ""}
              {t.inStockOnly}
            </Link>
          </fieldset>
        </aside>

        {/* Results */}
        <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[15px] font-semibold text-gray-6">
              {result.total} {t.products}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="me-1 text-sm font-bold uppercase tracking-[0.5px]">{t.sortBy}</span>
              {sortOptions.map((o) => (
                <Link
                  key={o.value}
                  href={buildHref(base, sp, (p) => {
                    if (o.value === "newest") p.delete("sort");
                    else p.set("sort", o.value);
                  })}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm font-bold transition-colors",
                    filters.sort === o.value
                      ? "border-navy bg-navy text-white"
                      : "border-line text-gray-6 hover:border-navy hover:text-navy",
                  )}
                >
                  {o.label}
                </Link>
              ))}
            </div>
          </div>

          {activeChips.length > 0 ? (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {activeChips.map((chip) => (
                <Link key={chip.label + chip.href} href={chip.href}>
                  <Badge tone="navy">
                    {chip.label} <span aria-hidden>✕</span>
                  </Badge>
                </Link>
              ))}
            </div>
          ) : null}

          {result.products.length === 0 ? (
            <p className="rounded-[10px] border border-line bg-white p-10 text-center text-gray-6">
              {t.empty}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-5 max-lg:grid-cols-2 max-md:grid-cols-1">
              {result.products.map((p) => (
                <ShopProductCard
                  key={p.id}
                  productId={p.id}
                  {...buildProductCardProps(p, currency, promo)}
                  quickAddItem={buildQuickAddItem(p)}
                />
              ))}
            </div>
          )}

          {result.pageCount > 1 ? (
            <nav className="mt-9 flex items-center justify-center gap-2" aria-label={t.page}>
              {result.page > 1 ? (
                <Link
                  href={buildHref(base, sp, (p) => p.set("page", String(result.page - 1)))}
                  className="rounded-full border border-line px-4 py-2 text-sm font-bold hover:border-navy"
                >
                  ← {t.prev}
                </Link>
              ) : null}
              {Array.from({ length: result.pageCount }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={buildHref(base, sp, (p) => (n === 1 ? p.delete("page") : p.set("page", String(n))))}
                  aria-current={n === result.page ? "page" : undefined}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-full border text-sm font-bold",
                    n === result.page ? "border-navy bg-navy text-white" : "border-line hover:border-navy",
                  )}
                >
                  {n}
                </Link>
              ))}
              {result.page < result.pageCount ? (
                <Link
                  href={buildHref(base, sp, (p) => p.set("page", String(result.page + 1)))}
                  className="rounded-full border border-line px-4 py-2 text-sm font-bold hover:border-navy"
                >
                  {t.next} →
                </Link>
              ) : null}
            </nav>
          ) : null}
        </div>
      </div>
    </div>
  );
}
