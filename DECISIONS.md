# Decisions Log

Ambiguities resolved during the build; the rule applied is always: keep the
platform generic and admin-configurable.

## Phase 0 — Scaffold

- **Prisma 6 instead of Prisma 7.** The machine runs Node 20.17; Prisma 7
  requires Node ≥ 20.19 (its preinstall check fails). Pinned `prisma@6` +
  `@prisma/client@6` with the classic `prisma-client-js` generator. Upgrading
  later is a two-line change (bump deps, switch generator + add
  `@prisma/adapter-pg`) once Node is upgraded.
- **Schema is wiring-only in Phase 0.** `prisma/schema.prisma` holds only the
  datasource/generator blocks; the full data model ships with Phase 1 as
  planned. `src/lib/db.ts` (singleton client) is ready for `DATABASE_URL`.
- **All component text/branding arrives via props.** Signature components
  (`ProductCard`, `DarkFooter`, `PromoMarquee`, ...) take pre-formatted,
  already-localized strings — including price strings (currency comes from
  `StoreSettings` later) and labels like "BEST DEAL"/"SAVE -x%" (i18n/promo
  engine later). No brand or currency literals live in `src/components/`.
- **Dummy assets are quarantined in `/dev`.** Placeholder shoes/logos/gradients
  copied from `zee-clone.html` live only in `src/app/dev/styleguide/placeholders.tsx`
  and must never be imported outside `/dev`.
- **Root metadata is a neutral placeholder** ("Storefront") until
  StoreSettings-driven metadata exists (Phase 1+).
- **Logical CSS properties from day one.** Components use `ps/pe/start/end`
  utilities instead of left/right so the Phase-3+ RTL (Arabic) locale works
  without a rewrite.
- **`container-store` utility** replicates the reference `.container`
  (max-width 1440px, 24px gutters).
- **create-next-app was scaffolded via a temp subfolder** (`scaffold-tmp`)
  because the project root already contained the brief + reference file, then
  moved to the root.
