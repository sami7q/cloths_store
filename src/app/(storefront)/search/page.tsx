import { messages } from "@/lib/i18n";
import { getPromoFacts, getStoreSettings, queryProducts } from "@/server/storefront";
import { parseFilters, type SearchParams } from "@/lib/catalog-params";
import { SplitHeading } from "@/components/store/split-heading";
import { ShopProductCard } from "@/components/store/shop-product-card";
import { buildProductCardProps, buildQuickAddItem } from "@/components/store/product-card-mapper";

export const metadata = { title: messages.store.searchResults };

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim() ?? "";
  const t = messages.store;

  const [settings, promo, result] = await Promise.all([
    getStoreSettings(),
    getPromoFacts(),
    q
      ? queryProducts(
          { OR: [{ name: { contains: q } }, { description: { contains: q } }, { material: { contains: q } }] },
          parseFilters(sp),
        )
      : Promise.resolve(null),
  ]);
  const currency = settings?.currency ?? "EGP";

  return (
    <div className="container-store pb-4 pt-2">
      <SplitHeading left={t.searchResults.split(" ")[0]} right={t.searchResults.split(" ").slice(1).join(" ")} />
      {q ? (
        <p className="mb-6 text-[15px] font-semibold text-gray-6">
          {t.resultsFor}: <span className="font-extrabold text-ink">“{q}”</span>
          {result ? ` — ${result.total}` : null}
        </p>
      ) : null}
      {!result || result.products.length === 0 ? (
        <p className="rounded-[10px] border border-line bg-white p-10 text-center text-gray-6">{t.noResults}</p>
      ) : (
        <div className="grid grid-cols-4 gap-5 max-lg:grid-cols-2 max-md:grid-cols-1">
          {result.products.map((p) => (
            <ShopProductCard key={p.id} {...buildProductCardProps(p, currency, promo)} quickAddItem={buildQuickAddItem(p)} />
          ))}
        </div>
      )}
    </div>
  );
}
