import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { messages } from "@/lib/i18n";
import {
  getBanners,
  getNavCategories,
  getStoreSettings,
} from "@/server/storefront";
import { PromoMarquee } from "@/components/store/promo-marquee";
import { StoreHeader } from "@/components/store/store-header";
import { NavClient } from "@/components/store/nav-client";
import { SearchBox } from "@/components/store/search-box";
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

  // Maintenance mode (§6.16): visitors get a notice; staff keep full access.
  const role = session?.user?.role;
  const isStaff = role === "STAFF" || role === "MANAGER" || role === "ADMIN";
  if (settings?.maintenanceMode && !isStaff) {
    return (
      <main className="grid min-h-screen place-items-center bg-card px-6">
        <div className="max-w-md text-center">
          <p className="font-heading text-4xl font-bold uppercase tracking-[1.5px] text-navy">
            {settings.name}
          </p>
          <h1 className="mt-6 font-heading text-2xl font-bold uppercase tracking-[1px]">
            {messages.store.maintenanceTitle}
          </h1>
          <p className="mt-3 text-gray-6">{messages.store.maintenanceBody}</p>
        </div>
      </main>
    );
  }

  const t = messages;
  const name = settings?.name ?? "Store";
  const currency = settings?.currency ?? "EGP";
  const socialLinks = (settings?.socialLinks ?? {}) as Record<string, string>;
  const seo = (settings?.seoDefaults ?? {}) as { description?: string };

  const pages = await db.page.findMany({
    where: { isActive: true },
    select: { slug: true, title: true },
  });

  type CmsLink = { label?: string; href?: string };
  const navLinks = ((settings?.navLinks ?? []) as CmsLink[]).filter((l) => l.label && l.href);
  const footerLinks = ((settings?.footerLinks ?? []) as CmsLink[]).filter((l) => l.label && l.href);

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
        searchSlot={
          <SearchBox
            labels={{
              placeholder: t.common.searchPlaceholder,
              searchLabel: t.common.search,
              seeAll: t.search.seeAll,
              noSuggestions: t.search.noSuggestions,
            }}
          />
        }
        hotline={settings?.hotline ?? undefined}
        accountLabel={t.common.account}
        accountHref="/account"
      />
      <NavClient
        currency={currency}
        isAuthenticated={Boolean(session?.user)}
        links={[
          { label: t.store.home, href: "/", active: true },
          ...categories.map((c) => ({ label: c.name, href: `/category/${c.slug}` })),
        ]}
        secondaryLinks={
          navLinks.length
            ? navLinks.map((l) => ({ label: l.label as string, href: l.href as string }))
            : [
                { label: t.store.aboutUs, href: "/pages/about-us" },
                { label: t.store.contact, href: "/pages/about-us" },
              ]
        }
        wishlistHref="/wishlist"
        wishlistLabel={t.common.wishlist}
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
            links: footerLinks.length
              ? footerLinks.map((l) => ({ label: l.label as string, href: l.href as string }))
              : [
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
