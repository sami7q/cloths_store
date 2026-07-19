import Link from "next/link";
import { requireAdminModule } from "@/lib/auth-guards";
import { messages } from "@/lib/i18n";
import { first, type RawSearchParams } from "@/lib/admin/params";
import { getDiscountsData } from "@/server/admin/discounts-data";
import { PageHeader } from "@/components/admin/list-controls";
import { CouponsClient } from "./coupons-client";
import { PromosClient } from "./promos-client";
import { cn } from "@/lib/utils";

const t = messages.admin;
export const metadata = { title: `${t.nav.discounts} — ${t.title}` };

export default async function AdminDiscountsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await requireAdminModule("discounts");
  const raw = await searchParams;
  const tab = first(raw.tab) === "promos" ? "promos" : "coupons";
  const data = await getDiscountsData();

  return (
    <div>
      <PageHeader title={t.discounts.title} />
      <nav className="mb-5 flex w-fit gap-1 rounded-full border border-line bg-white p-1">
        <TabLink href="/admin/discounts" active={tab === "coupons"}>
          {t.discounts.tabCoupons} <Count n={data.coupons.length} />
        </TabLink>
        <TabLink href="/admin/discounts?tab=promos" active={tab === "promos"}>
          {t.discounts.tabPromotions} <Count n={data.promos.length} />
        </TabLink>
      </nav>

      {tab === "coupons" ? (
        <CouponsClient
          coupons={data.coupons}
          currency={data.currency}
          categories={data.categories}
          products={data.products}
        />
      ) : (
        <PromosClient promos={data.promos} collections={data.collections} currency={data.currency} />
      )}
    </div>
  );
}

function TabLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold",
        active ? "bg-navy text-white" : "text-gray-6 hover:text-navy",
      )}
    >
      {children}
    </Link>
  );
}

function Count({ n }: { n: number }) {
  return <span className="rounded-full bg-black/10 px-1.5 text-[11px]">{n}</span>;
}
