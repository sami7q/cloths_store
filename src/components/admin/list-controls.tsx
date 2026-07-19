import Link from "next/link";
import { cn } from "@/lib/utils";
import { messages } from "@/lib/i18n";
import { buildQuery, totalPages, type RawSearchParams } from "@/lib/admin/params";
import { AdminIcons } from "./icons";

const t = messages.admin;

/** Page heading + right-aligned actions, shared by every module. */
export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
      <h1 className="font-heading text-2xl font-bold uppercase tracking-[1px]">{title}</h1>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

/**
 * GET-form filter bar: selects/inputs inside keep their name= and submit as
 * query params, preserving the module's other params via hidden inputs.
 */
export function FilterBar({
  action,
  raw,
  keep = [],
  searchPlaceholder,
  searchDefault,
  children,
}: {
  action: string;
  raw: RawSearchParams;
  /** extra param names to preserve on submit (e.g. active tab) */
  keep?: string[];
  searchPlaceholder?: string;
  searchDefault?: string;
  children?: React.ReactNode;
}) {
  return (
    <form action={action} className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
      {keep.map((name) => {
        const value = Array.isArray(raw[name]) ? raw[name]?.[0] : raw[name];
        return value ? <input key={name} type="hidden" name={name} value={value} /> : null;
      })}
      {searchPlaceholder !== undefined && (
        <div className="relative">
          <AdminIcons.search
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-gray-4"
            width={15}
            height={15}
          />
          <input
            type="search"
            name="q"
            defaultValue={searchDefault}
            placeholder={searchPlaceholder}
            className="h-10 w-[240px] rounded-full border border-line bg-white ps-9 pe-4 text-sm outline-none placeholder:text-gray-4 focus:border-navy"
          />
        </div>
      )}
      {children}
      <button
        type="submit"
        className="h-10 rounded-full bg-navy px-5 text-sm font-bold uppercase tracking-[0.5px] text-white hover:bg-navy-deep"
      >
        {t.table.apply}
      </button>
      <Link href={action} className="text-sm font-bold text-gray-6 hover:text-navy">
        {t.table.clearFilters}
      </Link>
    </form>
  );
}

/** Compact select styled for admin filter bars and forms. */
export function AdminSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-10 rounded-full border border-line bg-white px-4 text-sm text-ink outline-none focus:border-navy",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function ExportCsvLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="inline-flex h-10 items-center rounded-full border border-line bg-white px-5 text-sm font-bold uppercase tracking-[0.5px] text-ink hover:border-navy print:hidden"
    >
      {t.table.exportCsv}
    </a>
  );
}

export function Pagination({
  raw,
  basePath,
  page,
  perPage,
  total,
}: {
  raw: RawSearchParams;
  basePath: string;
  page: number;
  perPage: number;
  total: number;
}) {
  const pages = totalPages(total, perPage);
  if (pages <= 1)
    return (
      <p className="mt-3 text-sm text-gray-4">
        {total} {t.table.rows}
      </p>
    );
  return (
    <nav className="mt-4 flex items-center justify-between gap-3 print:hidden" aria-label="pagination">
      <p className="text-sm text-gray-4">
        {t.table.page} {page} {t.table.of} {pages} — {total} {t.table.rows}
      </p>
      <div className="flex items-center gap-1.5">
        <PageLink disabled={page <= 1} href={`${basePath}${buildQuery(raw, { page: page - 1 <= 1 ? null : page - 1 })}`}>
          {t.table.prev}
        </PageLink>
        {pageWindow(page, pages).map((p, i) =>
          p === null ? (
            <span key={`gap-${i}`} className="px-1 text-gray-4">
              …
            </span>
          ) : (
            <PageLink key={p} active={p === page} href={`${basePath}${buildQuery(raw, { page: p === 1 ? null : p })}`}>
              {String(p)}
            </PageLink>
          ),
        )}
        <PageLink disabled={page >= pages} href={`${basePath}${buildQuery(raw, { page: page + 1 })}`}>
          {t.table.next}
        </PageLink>
      </div>
    </nav>
  );
}

function pageWindow(page: number, pages: number): (number | null)[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const around = [page - 1, page, page + 1].filter((p) => p > 1 && p < pages);
  const out: (number | null)[] = [1];
  if (around[0] !== undefined && around[0] > 2) out.push(null);
  out.push(...around);
  if (around.length && around[around.length - 1] < pages - 1) out.push(null);
  out.push(pages);
  return out;
}

function PageLink({
  href,
  disabled,
  active,
  children,
}: {
  href: string;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  if (disabled)
    return (
      <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm font-bold text-gray-4">
        {children}
      </span>
    );
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm font-bold",
        active ? "bg-navy text-white" : "text-ink hover:bg-[#F3F4F6]",
      )}
    >
      {children}
    </Link>
  );
}

const STATUS_TONES: Record<string, string> = {
  PENDING: "bg-[#FEF3C7] text-[#92400E]",
  CONFIRMED: "bg-[#DBEAFE] text-[#1E40AF]",
  PROCESSING: "bg-[#E0E7FF] text-[#3730A3]",
  SHIPPED: "bg-[#CFFAFE] text-[#155E75]",
  DELIVERED: "bg-[#DCFCE7] text-[#166534]",
  CANCELLED: "bg-[#FEE2E2] text-[#991B1B]",
  RETURNED: "bg-[#FFE4E6] text-[#9F1239]",
  PAID: "bg-[#DCFCE7] text-[#166534]",
  FAILED: "bg-[#FEE2E2] text-[#991B1B]",
  REFUNDED: "bg-[#F3E8FF] text-[#6B21A8]",
  DRAFT: "bg-[#F3F4F6] text-[#374151]",
  ACTIVE: "bg-[#DCFCE7] text-[#166534]",
  ARCHIVED: "bg-[#F3F4F6] text-[#6B7280]",
  APPROVED: "bg-[#DCFCE7] text-[#166534]",
  REJECTED: "bg-[#FEE2E2] text-[#991B1B]",
};

/** Localized colored pill for any of the string "enums". */
export function StatusPill({ status }: { status: string }) {
  const label = (t.statuses as Record<string, string>)[status] ?? status;
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold",
        STATUS_TONES[status] ?? "bg-[#F3F4F6] text-ink",
      )}
    >
      {label}
    </span>
  );
}
