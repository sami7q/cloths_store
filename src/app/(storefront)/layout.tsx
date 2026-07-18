import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { messages } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import {
  getBanners,
  getNavCategories,
  getStoreSettings,
} from "@/server/storefront";
import { PromoMarquee } from "@/components/store/promo-marquee";
import { StoreHeader } from "@/components/store/store-header";
import { MainNav } from "@/components/store/main-nav";
import { DarkFooter } from "@/components/store/dark-footer";
import { SideOfferTab } from "@/components/store/side-offer-tab";
import { ScrollTopButton } from "@/components/store/scroll-top-button";
import { FacebookIcon, InstagramIcon, TikTokIcon } from "@/components/store/icons";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getStoreSettings();
  const seo = (settings?.seoDefaults ?? {}) as { title?: string; description?: string };
  return {
    title: { default: seo.title ?? settings?.name ?? "Store", template: `%s | ${settings?.name ?? "Store"}` },
    description: seo.description,
    icons: settings?.faviconUrl ? { icon: settings.faviconUrl } : undefined,
  };
}

function StoreLogo({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt={name} className="h-11 w-auto" />;
  }
  return (
    <span className="font-heading text-[30px] font-bold uppercase tracking-[1.5px] text-navy">
      {name}
    </span>
  );
}

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const [settings, marquee, sideTab, categories, session] = await Promise.all([
    getStoreSettings(),
    getBanners("MARQUEE"),
    getBanners("SIDE_TAB"),
    getNavCategories(),
    auth(),
  ]);

  const t = messages;
  const name = settings?.name ?? "Store";
  const currency = settings?.currency ?? "EGP";
  const socialLinks = (settings?.socialLinks ?? {}) as Record<string, string>;
  const seo = (settings?.seoDefaults ?? {}) as { description?: string };

  const wishlistCount = session?.user
    ? await db.wishlistItem.count({ where: { userId: session.user.id } })
    : 0;

  const pages = await db.page.findMany({
    where: { isActive: true },
    select: { slug: true, title: true },
  });

  const socials = [
    socialLinks.facebook && { label: "Facebook", href: socialLinks.facebook, icon: <FacebookIcon /> },
    socialLinks.instagram && { label: "Instagram", href: socialLinks.instagram, icon: <InstagramIcon /> },
    socialLinks.tiktok && { label: "TikTok", href: socialLinks.tiktok, icon: <TikTokIcon /> },
  ].filter(Boolean) as { label: string; href: string; icon: React.ReactNode }[];

  return (
    <>
      <PromoMarquee items={marquee.map((b) => b.title ?? "").filter(Boolean)} />
      <StoreHeader
        logo={<StoreLogo name={name} logoUrl={settings?.logoUrl ?? null} />}
        searchPlaceholder={t.common.searchPlaceholder}
        searchLabel={t.common.search}
        hotline={settings?.hotline ?? undefined}
        accountLabel={t.common.account}
        accountHref="/account"
      />
      <MainNav
        links={[
          { label: t.store.home, href: "/", active: true },
          ...categories.map((c) => ({ label: c.name, href: `/category/${c.slug}` })),
        ]}
        secondaryLinks={[
          { label: t.store.aboutUs, href: "/pages/about-us" },
          { label: t.store.contact, href: "/pages/about-us" },
        ]}
        wishlistCount={wishlistCount}
        wishlistHref="/wishlist"
        wishlistLabel={t.common.wishlist}
        cartCount={0}
        cartTotalLabel={formatPrice(0, currency)}
        cartLabel={t.common.cart}
        cartHref="/cart"
      />

      <main>{children}</main>

      <DarkFooter
        aboutHeading={name}
        aboutText={seo.description ?? ""}
        socialHeading={t.store.followUs}
        socials={socials}
        columns={[
          {
            heading: t.store.categories,
            links: categories.slice(0, 5).map((c) => ({ label: c.name, href: `/category/${c.slug}` })),
          },
          {
            heading: t.store.usefulLinks,
            links: [
              { label: t.store.home, href: "/" },
              { label: t.common.account, href: "/account" },
              { label: t.common.wishlist, href: "/wishlist" },
              { label: t.common.search, href: "/search" },
            ],
          },
          {
            heading: t.store.policies,
            links: pages.map((p) => ({ label: p.title, href: `/pages/${p.slug}` })),
          },
        ]}
        newsletterNote={t.store.newsletterNote}
        newsletterPlaceholder={t.store.newsletterPlaceholder}
        newsletterButtonLabel={t.store.signUp}
        copyright={
          <>
            © {new Date().getFullYear()} <b>{name}</b> — {t.store.allRightsReserved}
          </>
        }
        logo={
          <span className="rounded-[50%] border-2 border-white px-7 py-3 font-heading text-xl font-bold uppercase tracking-[1px]">
            {name}
          </span>
        }
        payments={
          <span className="flex gap-2.5">
            {["VISA", "MASTERCARD", "COD"].map((p) => (
              <span
                key={p}
                className="rounded border border-white/40 px-2.5 py-1 text-[11px] font-extrabold tracking-[1px] text-white/90"
              >
                {p}
              </span>
            ))}
          </span>
        }
      />
      {sideTab[0]?.title ? <SideOfferTab text={sideTab[0].title} closeLabel={t.common.close} /> : null}
      <ScrollTopButton label={t.common.backToTop} />
    </>
  );
}
