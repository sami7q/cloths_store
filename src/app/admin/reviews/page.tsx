import Link from "next/link";
import { requireAdminModule } from "@/lib/auth-guards";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { messages } from "@/lib/i18n";
import { REVIEW_STATUSES } from "@/lib/enums";
import { buildQuery, first, parseListParams, type RawSearchParams } from "@/lib/admin/params";
import { AdminSelect, FilterBar, PageHeader, Pagination } from "@/components/admin/list-controls";
import { ReviewCard, type ReviewItem } from "./review-card";
import { cn } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

const t = messages.admin;
export const metadata = { title: `${t.nav.reviews} — ${t.title}` };

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const session = await requireAdminModule("reviews");
  const canEdit = can(session.user.role, "reviews", "edit");
  const raw = await searchParams;
  const params = parseListParams(raw, { perPage: 10 });

  const where: Prisma.ReviewWhereInput = {};
  const tab = first(raw.tab);
  if ((REVIEW_STATUSES as readonly string[]).includes(tab)) where.status = tab;
  const rating = Number(first(raw.rating));
  if (rating >= 1 && rating <= 5) where.rating = rating;
  if (params.q) where.product = { name: { contains: params.q } };

  const [total, reviews, statusRows] = await Promise.all([
    db.review.count({ where }),
    db.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.perPage,
      take: params.perPage,
      include: {
        user: { select: { name: true } },
        product: { select: { id: true, name: true, slug: true } },
      },
    }),
    db.review.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const tabCounts = Object.fromEntries(statusRows.map((r) => [r.status, r._count._all]));
  const allCount = statusRows.reduce((sum, r) => sum + r._count._all, 0);
  const statuses = t.statuses as Record<string, string>;

  const items: ReviewItem[] = reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    status: r.status,
    adminReply: r.adminReply,
    createdAt: r.createdAt.toLocaleDateString("en-GB", { dateStyle: "medium" }),
    userName: r.user.name,
    productId: r.product.id,
    productName: r.product.name,
    productSlug: r.product.slug,
  }));

  return (
    <div>
      <PageHeader title={t.reviewsMod.title} />

      <nav className="mb-4 flex w-fit flex-wrap gap-1 rounded-full border border-line bg-white p-1">
        <Tab href={`/admin/reviews${buildQuery(raw, { tab: null, page: null })}`} active={!tab}>
          {t.table.all} <Count n={allCount} />
        </Tab>
        {REVIEW_STATUSES.map((status) => (
          <Tab key={status} href={`/admin/reviews${buildQuery(raw, { tab: status, page: null })}`} active={tab === status}>
            {statuses[status]} <Count n={tabCounts[status] ?? 0} />
          </Tab>
        ))}
      </nav>

      <FilterBar action="/admin/reviews" raw={raw} keep={["tab"]} searchPlaceholder={t.reviewsMod.searchPlaceholder} searchDefault={params.q}>
        <AdminSelect name="rating" defaultValue={first(raw.rating)} aria-label={t.reviewsMod.rating}>
          <option value="">{t.reviewsMod.anyRating}</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} {t.reviewsMod.stars}
            </option>
          ))}
        </AdminSelect>
      </FilterBar>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line py-12 text-center text-sm text-gray-4">
          {t.reviewsMod.noReviews}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((review) => (
            <ReviewCard key={review.id} review={review} canEdit={canEdit} />
          ))}
        </div>
      )}
      <Pagination raw={raw} basePath="/admin/reviews" page={params.page} perPage={params.perPage} total={total} />
    </div>
  );
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-bold",
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
