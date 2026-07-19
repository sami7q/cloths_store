import Link from "next/link";
import { requireAdminModule } from "@/lib/auth-guards";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { messages } from "@/lib/i18n";
import { first, type RawSearchParams } from "@/lib/admin/params";
import { PageHeader } from "@/components/admin/list-controls";
import { BannersClient, type BannerFields, type BannerItem } from "./banners-client";
import { PagesClient, type PageItem } from "./pages-client";
import { LinksClient, type CmsLink } from "./links-client";
import { cn } from "@/lib/utils";

const t = messages.admin;
export const metadata = { title: `${t.nav.content} — ${t.title}` };

const TABS = [
  { key: "hero", label: t.content.tabHero, placement: "HERO", fields: { subtitle: true, image: true, link: true, badge: true, schedule: true } as BannerFields },
  { key: "marquee", label: t.content.tabMarquee, placement: "MARQUEE", fields: {} as BannerFields, hint: t.content.marqueeHint },
  { key: "lifestyle", label: t.content.tabLifestyle, placement: "LIFESTYLE", fields: { subtitle: true, image: true, link: true } as BannerFields },
  { key: "sidetab", label: t.content.tabSideTab, placement: "SIDE_TAB", fields: { link: true } as BannerFields, hint: t.content.sideTabHint },
  { key: "social", label: t.content.tabSocial, placement: "SOCIAL_GRID", fields: { image: true, link: true, caption: true } as BannerFields },
  { key: "pages", label: t.content.tabPages, placement: null, fields: {} as BannerFields },
  { key: "links", label: t.content.tabLinks, placement: null, fields: {} as BannerFields },
] as const;

export default async function AdminContentPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const session = await requireAdminModule("content");
  const canEdit = can(session.user.role, "content", "edit");
  const raw = await searchParams;
  const tabKey = first(raw.tab) || "hero";
  const tab = TABS.find((x) => x.key === tabKey) ?? TABS[0];

  let body: React.ReactNode;
  if (tab.key === "pages") {
    const pages = await db.page.findMany({ orderBy: { slug: "asc" } });
    const items: PageItem[] = pages.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      titleAr: p.titleAr,
      contentRich: p.contentRich,
      contentRichAr: p.contentRichAr,
      isActive: p.isActive,
    }));
    body = <PagesClient items={items} canEdit={canEdit} />;
  } else if (tab.key === "links") {
    const settings = await db.storeSettings.findUnique({ where: { id: 1 } });
    const parse = (value: unknown): CmsLink[] =>
      ((value ?? []) as Partial<CmsLink>[]).map((l) => ({
        label: l.label ?? "",
        labelAr: l.labelAr ?? "",
        href: l.href ?? "",
      }));
    body = (
      <LinksClient
        navLinks={parse(settings?.navLinks)}
        footerLinks={parse(settings?.footerLinks)}
        canEdit={canEdit}
      />
    );
  } else {
    const banners = await db.banner.findMany({
      where: { placement: tab.placement as string },
      orderBy: { sortOrder: "asc" },
    });
    const items: BannerItem[] = banners.map((b) => {
      const config = (b.config ?? {}) as Record<string, unknown>;
      return {
        id: b.id,
        placement: b.placement,
        title: b.title,
        titleAr: b.titleAr,
        subtitle: b.subtitle,
        subtitleAr: b.subtitleAr,
        imageUrl: b.imageUrl,
        linkUrl: b.linkUrl,
        badge: String(config.badge ?? ""),
        caption: String(config.caption ?? ""),
        startsAt: String(config.startsAt ?? ""),
        endsAt: String(config.endsAt ?? ""),
        sortOrder: b.sortOrder,
        isActive: b.isActive,
        hasStyle: Boolean(config.style),
      };
    });
    body = (
      <BannersClient
        placement={tab.placement as string}
        items={items}
        fields={tab.fields}
        hint={"hint" in tab ? tab.hint : undefined}
        canEdit={canEdit}
      />
    );
  }

  return (
    <div>
      <PageHeader title={t.content.title} />
      <nav className="mb-5 flex w-fit flex-wrap gap-1 rounded-full border border-line bg-white p-1">
        {TABS.map((x) => (
          <Link
            key={x.key}
            href={x.key === "hero" ? "/admin/content" : `/admin/content?tab=${x.key}`}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-bold",
              tab.key === x.key ? "bg-navy text-white" : "text-gray-6 hover:text-navy",
            )}
          >
            {x.label}
          </Link>
        ))}
      </nav>
      {body}
    </div>
  );
}
