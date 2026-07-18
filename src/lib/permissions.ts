import type { Role } from "./enums";

/**
 * Admin RBAC — default permissions matrix (STORE-BUILD-PROMPT §6.13).
 * Enforced twice: route-level in src/middleware.ts and per-page/per-action
 * via requireAdminModule() in src/lib/auth-guards.ts. Phase 6 may move this
 * to the DB behind the Staff & Roles UI; the shape stays the same.
 */

export const ADMIN_MODULES = [
  "dashboard",
  "orders",
  "products",
  "categories",
  "collections",
  "inventory",
  "discounts",
  "customers",
  "reviews",
  "content",
  "shipping",
  "payments",
  "staff",
  "notifications",
  "reports",
  "settings",
] as const;
export type AdminModule = (typeof ADMIN_MODULES)[number];

export type AccessLevel = "view" | "edit";

const S: Role[] = ["STAFF", "MANAGER", "ADMIN"]; // staff and above
const M: Role[] = ["MANAGER", "ADMIN"]; // manager and above
const A: Role[] = ["ADMIN"]; // admin only

export const PERMISSIONS: Record<AdminModule, Record<AccessLevel, Role[]>> = {
  dashboard: { view: S, edit: M },
  orders: { view: S, edit: S },
  products: { view: S, edit: S },
  categories: { view: S, edit: S },
  collections: { view: S, edit: S },
  inventory: { view: S, edit: S },
  discounts: { view: M, edit: M },
  customers: { view: S, edit: M },
  reviews: { view: S, edit: S },
  content: { view: S, edit: M },
  shipping: { view: M, edit: M },
  payments: { view: M, edit: A },
  staff: { view: A, edit: A },
  notifications: { view: S, edit: S },
  reports: { view: M, edit: M },
  settings: { view: A, edit: A },
};

/** Any role allowed into the /admin area at all. */
export function isAdminAreaRole(role: string | undefined): role is Role {
  return role === "STAFF" || role === "MANAGER" || role === "ADMIN";
}

export function can(role: string | undefined, module: AdminModule, level: AccessLevel = "view"): boolean {
  if (!isAdminAreaRole(role)) return false;
  return PERMISSIONS[module][level].includes(role);
}

/**
 * Map an /admin URL path to its module for route-level checks.
 * Returns null for module-less admin paths (e.g. /admin/forbidden).
 */
export function moduleFromPath(pathname: string): AdminModule | null {
  const rest = pathname.replace(/^\/admin\/?/, "");
  if (rest === "") return "dashboard";
  const first = rest.split("/")[0];
  return (ADMIN_MODULES as readonly string[]).includes(first) ? (first as AdminModule) : null;
}
