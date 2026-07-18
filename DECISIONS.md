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

## Phase 1 — Data layer

- **TEMPORARY: SQLite datasource for all dev phases (P1–P7).** Per user
  decision (2026-07-18), the real Neon/Postgres connection is deferred to the
  final pre-deployment phase. `schema.prisma` uses `provider = "sqlite"`,
  `url = "file:./dev.db"` (gitignored). Postgres-compat rules while on SQLite:
  - **No native enums** (SQLite lacks them): enum-ish columns are `String`
    with the allowed values centralized in `src/lib/enums.ts` (typed const
    arrays used by Zod/forms/server actions). Values must stay identical if
    they become Postgres enums again.
  - **No scalar lists**: `tags`, `targetIds`, `countries`, `cities` are `Json`
    holding string arrays (portable to Postgres as-is).
  - **No native type attributes** (`@db.Decimal`, `@db.Text`): plain
    `Decimal`/`String`, valid on both providers.
  - No SQLite-only behavior anywhere (no raw SQL with SQLite syntax, etc.).

- **`CollectionProduct` join model instead of `productIds[]`.** §4 sketched an
  array; a join table with `sortOrder` is required for the admin drag-drop
  product ordering (§6.5) and referential integrity.
- **`WishlistItem` model** materializes the `wishlist[]` relation on User
  (unique per user+product).
- **`Coupon.code` is the primary key** — it is the natural unique handle used
  at checkout; no surrogate id needed.
- **`Order.couponCode` + `Order.promoBreakdown Json`** added beyond §4 so the
  coupon-performance report (§6.15) and the admin order detail's "applied
  promos" breakdown (§6.2) have data without recomputation.
- **`StoreSettings.codEnabled/codFee`** — §6.11/§6.12 require a COD toggle +
  fee setting; the singleton settings row is its natural home.
- **`Page.contentRichAr` and `Banner.subtitleAr`** — §4 listed single-language
  fields, but the storefront is fully bilingual; every displayed string gets an
  Arabic twin. `Banner.config Json` holds placement-specific extras (badge
  text, captions, style hints) so one model serves all five placements.
- **`Review.adminReply`** — §6.9 lets admins reply to reviews.
- **`bcryptjs` instead of native `bcrypt`** — pure-JS, no node-gyp build on
  Windows; API-compatible. Seed passwords: admin/staff `Admin123!`, customers
  `Customer123!`.
- **Seed is deterministic** (mulberry32 RNG with fixed seed) so re-seeding
  produces the same catalog; order dates remain relative to "now" so dashboard
  charts always have recent data.
- **Seed images point to committed generic placeholders**
  (`/public/images/placeholder-product.svg`, `placeholder-banner.svg`) — no
  network dependency, no branding; merchants replace them via admin uploads.
- **Money columns are `Decimal(10,2)`**; product `weight` is integer grams.
- **`prisma.seed` lives in `package.json`** (Prisma 6 convention; emits a
  deprecation notice about the future `prisma.config.ts` — migrate alongside
  the Prisma 7 upgrade).

## ⚠ Pending tasks — before the final deployment phase

- **Switch the datasource back to PostgreSQL:** set
  `provider = "postgresql"` + `url = env("DATABASE_URL")` in
  `prisma/schema.prisma`, point `DATABASE_URL` at the real Neon instance,
  regenerate migrations for Postgres (delete the SQLite `prisma/migrations`
  and run `prisma migrate dev --name init` once against Neon, or author a
  fresh baseline), then `prisma migrate deploy` + re-run the seed (or a
  production-safe seed). Consider restoring native enums and
  `@db.Decimal(10,2)`/`@db.Text` annotations at that point, and reconcile
  `src/lib/enums.ts` with generated Prisma enums.
