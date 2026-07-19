import { messages } from "@/lib/i18n";
import {
  getBanners,
  getCollectionProducts,
  getFeaturedProducts,
  getNavCategories,
  getPromoFacts,
  getStoreSettings,
} from "@/server/storefront";
import { HeroBanner, HeroSideItem } from "@/components/store/hero-banner";
import { SplitHeading } from "@/components/store/split-heading";
import { CategoryCard } from "@/components/store/category-card";
import { LifestyleCard } from "@/components/store/lifestyle-card";
import { ShopProductCard } from "@/components/store/shop-product-card";
import { SocialGrid } from "@/components/store/social-grid";
import { SmartImage } from "@/components/ui/smart-image";
import { buildProductCardProps, buildQuickAddItem } from "@/components/store/product-card-mapper";
import type { ProductForCard } from "@/server/storefront";

// Homepage carousels — each slug is a Collection managed from admin.
const HOME_COLLECTIONS = [
  "new-arrivals",
  "popular-for-her",
  "popular-for-him",
  "for-kids",
  "best-sellers",
];

type BannerConfig = { badge?: string; badgeAr?: string; style?: string };

function bannerConfig(config: unknown): BannerConfig {
  return (config ?? {}) as BannerConfig;
}

/** imageUrl (merchant upload) wins; config.style gradient is the CMS fallback. */
function bannerBackground(imageUrl: string | null, config: BannerConfig): React.CSSProperties | undefined {
  if (imageUrl || !config.style) return undefined;
  return { background: config.style };
}

function splitTitle(name: string): [string, string] {
  const words = name.split(" ");
  if (words.length === 1) return [name, ""];
  return [words[0], words.slice(1).join(" ")];
}

export default async function HomePage() {
  const [settings, promo, heroBanners, lifestyle, socialTiles, categories, featured] =
    await Promise.all([
      getStoreSettings(),
      getPromoFacts(),
      getBanners("HERO"),
      getBanners("LIFESTYLE"),
      getBanners("SOCIAL_GRID"),
      getNavCategories(),
      getFeaturedProducts(4),
    ]);
  const collections = (
    await Promise.all(HOME_COLLECTIONS.map((slug) => getCollectionProducts(slug, 4)))
  ).filter((c): c is NonNullable<Awaited<ReturnType<typeof getCollectionProducts>>> => c != null && c.items.length > 0);

  const currency = settings?.currency ?? "EGP";
  const hero = heroBanners[0];
  const heroConfig = bannerConfig(hero?.config);
  const t = messages;

  const renderCards = (items: ProductForCard[]) => (
    <div className="grid grid-cols-4 gap-5 max-lg:grid-cols-2 max-md:grid-cols-1">
      {items.map((p) => (
        <ShopProductCard key={p.id} productId={p.id} {...buildProductCardProps(p, currency, promo)} quickAddItem={buildQuickAddItem(p)} />
      ))}
    </div>
  );

  return (
    <div className="container-store pb-4 pt-6">
      {/* Hero + featured side column */}
      {hero ? (
        <section className="grid grid-cols-[1fr_210px] gap-6 max-lg:grid-cols-1">
          <HeroBanner
            title={
              hero.titleAr ? (
                <div
                  dir="rtl"
                  lang="ar"
                  className="font-arabic text-[88px] font-black leading-none text-white [text-shadow:0_4px_30px_rgba(0,0,0,0.25)] max-md:text-[54px]"
                >
                  {hero.titleAr}
                </div>
              ) : (
                <div className="font-heading text-[72px] font-bold uppercase leading-none text-white [text-shadow:0_4px_30px_rgba(0,0,0,0.25)] max-md:text-[44px]">
                  {hero.title}
                </div>
              )
            }
            subtitle={hero.titleAr ? (hero.title ?? undefined) : undefined}
            badge={heroConfig.badge}
            caption={hero.subtitle ?? undefined}
            imageUrl={hero.imageUrl ?? undefined}
            style={bannerBackground(hero.imageUrl, heroConfig)}
          />
          <aside className="flex flex-col justify-between rounded-lg border border-line bg-white px-2 py-1.5 max-lg:hidden">
            {featured.map((p) => (
              <HeroSideItem
                key={p.id}
                href={`/product/${p.slug}`}
                name={p.name.split(" ")[0]}
                type={p.material ?? undefined}
                media={
                  <SmartImage
                    src={p.images[0]?.url ?? "/images/placeholder-product.svg"}
                    alt={p.images[0]?.alt ?? p.name}
                    width={110}
                    height={74}
                    sizes="110px"
                    className="h-[74px] w-[110px] object-contain"
                  />
                }
              />
            ))}
          </aside>
        </section>
      ) : null}

      {/* Categories */}
      <section>
        <SplitHeading left={t.store.shopBy} right={t.store.category} />
        <div className="grid grid-cols-5 gap-4 max-lg:grid-cols-3 max-md:grid-cols-2">
          {categories.map((c) => (
            <CategoryCard
              key={c.id}
              href={`/category/${c.slug}`}
              name={c.name}
              icon={c.iconSvg ? <span dangerouslySetInnerHTML={{ __html: c.iconSvg }} /> : <span />}
            />
          ))}
        </div>
      </section>

      {/* Lifestyle banners */}
      {lifestyle.length > 0 ? (
        <section className="mt-14 grid grid-cols-4 gap-5 max-lg:grid-cols-2 max-md:grid-cols-1">
          {lifestyle.map((b) => (
            <LifestyleCard
              key={b.id}
              title={b.title}
              href={b.linkUrl ?? "#"}
              imageUrl={b.imageUrl ?? undefined}
              style={bannerBackground(b.imageUrl, bannerConfig(b.config))}
            />
          ))}
        </section>
      ) : null}

      {/* Collection carousels */}
      {collections.map((collection) => {
        const [left, right] = splitTitle(collection.name);
        return (
          <section key={collection.id}>
            <SplitHeading left={left} right={right} />
            {renderCards(collection.items)}
          </section>
        );
      })}

      {/* Social grid */}
      {socialTiles.length > 0 ? (
        <SocialGrid
          title={socialTiles[0]?.title ?? "#"}
          tagline={socialTiles[0]?.subtitle ? <span>{socialTiles[0].subtitle}</span> : undefined}
          tiles={socialTiles.map((b) => ({
            href: b.linkUrl ?? "#",
            label: b.title ?? undefined,
            imageUrl: b.imageUrl ?? undefined,
            style: bannerBackground(b.imageUrl, bannerConfig(b.config)),
          }))}
        />
      ) : null}
    </div>
  );
}
