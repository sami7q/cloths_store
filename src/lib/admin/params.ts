/**
 * URL-driven list state for admin tables (§6: every list view is
 * server-paginated with sort, filters, search). All state lives in
 * searchParams so views are linkable and the tables need no client fetch.
 */

export type ListParams = {
  page: number;
  perPage: number;
  sort: string | null;
  dir: "asc" | "desc";
  q: string;
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

export function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export function parseListParams(raw: RawSearchParams, defaults?: Partial<ListParams>): ListParams {
  const page = Math.max(1, Number.parseInt(first(raw.page), 10) || 1);
  const perPage = Math.min(100, Math.max(5, Number.parseInt(first(raw.perPage), 10) || defaults?.perPage || 20));
  const sort = first(raw.sort) || defaults?.sort || null;
  const dir = first(raw.dir) === "asc" ? "asc" : first(raw.dir) === "desc" ? "desc" : (defaults?.dir ?? "desc");
  const q = first(raw.q).trim();
  return { page, perPage, sort, dir, q };
}

/** Rebuild a query string, replacing the given keys (null removes a key). */
export function buildQuery(raw: RawSearchParams, patch: Record<string, string | number | null>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    const v = first(value);
    if (v) params.set(key, v);
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === "") params.delete(key);
    else params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function totalPages(total: number, perPage: number): number {
  return Math.max(1, Math.ceil(total / perPage));
}
