import en from "../../messages/en.json";

/**
 * Interim i18n accessor — Phase 3 replaces this with the locale-aware layer
 * (per-request locale, RTL switching). Until then, server components read
 * strings from messages/en.json through this module so no UI string is
 * hardcoded in components/pages.
 */
export const messages = en;
export type Messages = typeof en;
