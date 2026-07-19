import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { messages } from "@/lib/i18n";
import { formatPrice, percentOff, toNumber } from "@/lib/format";
import {
  getProductBySlug,
  getPromoFacts,
  getRelatedProducts,
  getStoreSettings,
} from "@/server/storefront";
import { SplitHeading } from "@/components/store/split-heading";
import { ShopProductCard } from "@/components/store/shop-product-card";
import { buildProductCardProps, buildQuickAddItem } from "@/components/store/product-card-mapper";
import { PdpInteractive } from "./pdp-interactive";
import { ReviewForm } from "./review-form";
import { auth } from "@/lib/auth";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  return {
    // seoTitle is a full title (may already include the store name) — use it
    // absolutely so the layout template doesn't append the name twice.
    title: product.seoTitle ? { absolute: product.seoTitle } : product.name,
    description: product.seoDescription ?? undefined,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.status !== "ACTIVE") notFound();

  const [settings, promo, related, session] = await Promise.all([
    getStoreSettings(),
    getPromoFacts(),
    getRelatedProducts(product.categoryId, product.id),
    auth(),
  ]);
  const currency = settings?.currency ?? "EGP";
  const t = messages.pdp;
  const save = percentOff(product.compareAtPrice, product.basePrice);

  const ratings = product.reviews.map((r) => r.rating);
  const avgRating = ratings.length
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    : null;

  const accordion = [
    { title: t.description, body: product.description },
    { title: t.materialCare, body: product.material ?? "—" },
    { title: t.shippingReturns, body: null },
  ];

  const inStock = product.variants.some((v) => v.stock > 0);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.seoDescription ?? product.description,
      sku: product.sku,
      image: product.images.map((i) => i.url),
      offers: {
        "@type": "Offer",
        price: toNumber(product.basePrice),
        priceCurrency: currency,
        availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      },
      ...(avgRating != null
        ? { aggregateRating: { "@type": "AggregateRating", ratingValue: avgRating, reviewCount: ratings.length } }
        : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: messages.store.home, item: "/" },
        { "@type": "ListItem", position: 2, name: product.category.name, item: `/category/${product.category.slug}` },
        { "@type": "ListItem", position: 3, name: product.name },
      ],
    },
  ];

  return (
    <div className="container-store pb-4 pt-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm font-semibold text-gray-6">
        <Link href="/" className="hover:text-navy">
          {messages.store.home}
        </Link>
        {" / "}
        <Link href={`/category/${product.category.slug}`} className="hover:text-navy">
          {product.category.name}
        </Link>
        {" / "}
        <span className="text-ink">{product.name}</span>
      </nav>

      <PdpInteractive
        product={{
          id: product.id,
          slug: product.slug,
          name: product.name,
          imageUrl: product.images[0]?.url ?? null,
        }}
        images={product.images.map((i) => ({ url: i.url, alt: i.alt, variantColorRef: i.variantColorRef }))}
        variants={product.variants.map((v) => ({
          id: v.id,
          colorName: v.colorName,
          colorHex: v.colorHex,
          size: v.size,
          stock: v.stock,
          lowStockAt: v.lowStockAt,
          unitPrice: toNumber(v.price ?? product.basePrice),
          priceLabel: v.price ? formatPrice(v.price, currency) : null,
        }))}
        labels={{
          color: t.color,
          size: t.size,
          quantity: t.quantity,
          addToCart: t.addToCart,
          buyNow: t.buyNow,
          onlyLeft: t.onlyLeft,
          outOfStock: t.outOfStock,
          cartComingSoon: t.cartComingSoon,
          increaseQty: t.increaseQty,
          decreaseQty: t.decreaseQty,
        }}
        header={
          <header>
            {save ? (
              <span className="mb-3 inline-block rounded-[20px] bg-save-green px-4 py-[7px] text-[13.5px] font-bold text-white">
                {messages.store.save} -{save}%
              </span>
            ) : null}
            <h1 className="text-[34px] font-extrabold leading-tight tracking-[0.2px]">{product.name}</h1>
            {product.material ? (
              <p className="mt-1.5 text-[17px] font-medium text-gray-6">{product.material}</p>
            ) : null}
            {avgRating != null ? (
              <p className="mt-2 text-sm font-bold text-ink">
                <span aria-hidden className="text-[#E8A33D]">★</span> {avgRating}{" "}
                <span className="font-semibold text-gray-6">({ratings.length})</span>
              </p>
            ) : null}

            <div className="mt-5 flex items-baseline gap-3">
              {product.compareAtPrice ? (
                <span className="text-lg font-semibold text-gray-6 line-through">
                  {formatPrice(product.compareAtPrice, currency)}
                </span>
              ) : null}
              <span className="text-[30px] font-extrabold">{formatPrice(product.basePrice, currency)}</span>
            </div>

            {product.cardPrice ? (
              <div className="mt-3 inline-flex items-center gap-2.5 rounded-lg border-[1.5px] border-deal-red bg-deal-bg px-3 py-[9px]">
                <span
                  aria-hidden
                  className="relative h-3.5 w-[18px] rounded-[2.5px] border-[1.8px] border-deal-red before:absolute before:inset-x-0 before:top-[2.5px] before:h-[2.5px] before:bg-deal-red before:content-['']"
                />
                <span className="text-base font-extrabold text-ink">
                  {formatPrice(product.cardPrice, currency)}
                </span>
                <span className="rounded-[5px] bg-deal-red px-[9px] py-1 text-[10.5px] font-extrabold tracking-[0.4px] text-white">
                  {messages.common.bestDeal}
                </span>
              </div>
            ) : null}

            {promo.cardPercentOff != null ? (
              <p className="mt-3 text-sm font-medium text-gray-6">
                {messages.store.payWithCard} · <b className="text-ink">{promo.cardPercentOff}%</b>{" "}
                {messages.store.off}
                {promo.freeShippingOver != null ? <> · {messages.store.freeShipping}</> : null}
              </p>
            ) : null}
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.5px] text-gray-6">
              {t.sku}: {product.sku}
            </p>
          </header>
        }
      />

      {/* Accordion */}
      <section className="mt-12 max-w-[820px]">
        {accordion.map((item) => (
          <details key={item.title} className="group border-b border-line py-1">
            <summary className="flex cursor-pointer items-center justify-between py-4 text-[17px] font-extrabold uppercase tracking-[0.5px] [&::-webkit-details-marker]:hidden">
              {item.title}
              <span aria-hidden className="text-2xl font-bold text-gray-4 group-open:rotate-45 transition-transform">
                +
              </span>
            </summary>
            <div className="pb-5 text-[16px] leading-relaxed text-gray-6">
              {item.body ?? (
                <Link href="/pages/shipping-policy" className="font-bold text-navy hover:underline">
                  {t.shippingReturns} →
                </Link>
              )}
            </div>
          </details>
        ))}
      </section>

      {/* Reviews */}
      <section className="mt-12 max-w-[820px]">
        <h2 className="font-heading text-2xl font-bold uppercase tracking-[1px]">
          {t.reviews}
          {avgRating != null ? (
            <span className="ms-3 text-lg text-gray-6">
              <span aria-hidden className="text-[#E8A33D]">★</span> {avgRating} ({ratings.length})
            </span>
          ) : null}
        </h2>
        <ReviewForm
          productId={product.id}
          isAuthenticated={Boolean(session?.user)}
          labels={messages.reviews}
        />
        {product.reviews.length === 0 ? (
          <p className="mt-4 text-gray-6">{t.reviewsEmpty}</p>
        ) : (
          <ul className="mt-5 flex flex-col gap-5">
            {product.reviews.map((r) => (
              <li key={r.id} className="rounded-[10px] border border-line bg-white p-5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold">{r.user.name}</span>
                  <span aria-label={`${r.rating}/5`} className="text-[#E8A33D]">
                    {"★".repeat(r.rating)}
                    <span className="text-line">{"★".repeat(5 - r.rating)}</span>
                  </span>
                </div>
                {r.title ? <p className="mt-2 font-bold">{r.title}</p> : null}
                {r.body ? <p className="mt-1 text-[15px] leading-relaxed text-gray-6">{r.body}</p> : null}
                {r.adminReply ? (
                  <p className="mt-3 rounded-lg bg-card px-4 py-2.5 text-[14px] leading-relaxed text-gray-6">
                    <span className="font-bold text-navy">{messages.reviews.storeReply}: </span>
                    {r.adminReply}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Related */}
      {related.length > 0 ? (
        <section>
          <SplitHeading left={t.relatedProducts.split(" ")[0]} right={t.relatedProducts.split(" ").slice(1).join(" ")} />
          <div className="grid grid-cols-4 gap-5 max-lg:grid-cols-2 max-md:grid-cols-1">
            {related.map((p) => (
              <ShopProductCard key={p.id} productId={p.id} {...buildProductCardProps(p, currency, promo)} quickAddItem={buildQuickAddItem(p)} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
