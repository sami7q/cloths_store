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

## Phase 2 — Auth & RBAC

- **NextAuth v5 (beta) with JWT sessions, split config.** `auth.config.ts` is
  edge-safe (imported by middleware, no Prisma/bcrypt); `auth.ts` adds the
  Credentials + Google providers and DB-touching callbacks. JWT strategy keeps
  middleware DB-free (role travels in the token).
- **Google OAuth is env-gated.** The provider and its login button only appear
  when `GOOGLE_ID`/`GOOGLE_SECRET` are set; OAuth sign-ins upsert a `User` row
  (role CUSTOMER) so relations (orders/wishlist/reviews) work identically.
- **Permissions matrix is static code for now** (`src/lib/permissions.ts`):
  view/edit per module for STAFF/MANAGER/ADMIN. STAFF has no
  discounts/shipping/payments/reports and no staff/settings; MANAGER has
  everything except staff & settings (ADMIN-only). Phase 6's Staff & Roles UI
  may move it to the DB — same shape.
- **Enforcement is two-layer:** middleware redirects (login / home /
  `/admin/forbidden`) + `requireAdminModule()` server-side guard called by
  every admin page (and later, every server action). Never middleware alone.
- **Password reset is a stub** — the form exists and always returns the same
  "reset link will be sent" message (no account enumeration); actual email
  send + token model land with the SMTP layer (Phase 4/5).
- **Rate limiting is in-memory** (`src/lib/rate-limit.ts`, sliding window,
  per-instance). Swap for Redis/Upstash when scaling out.
- **Interim i18n accessor** (`src/lib/i18n.ts`) reads `messages/en.json` so
  auth/admin strings stay out of components; Phase 3 replaces it with the
  locale-aware layer.
- **Admin module pages are guarded placeholders** rendering the role's
  view/edit badges — they exist so RBAC is verifiable now; Phase 6 replaces
  them module by module.

## Phase 3 — Storefront core

- **Main nav is derived from active top-level categories** (+ static Home /
  About / Contact links). There is no Menu model in §4; the §6.10 Navigation
  menu editor will add dedicated storage in Phase 6 — until then categories
  are the single source of truth.
- **`Banner.config.style` holds a CSS background** (gradient) used when no
  `imageUrl` is set; a merchant-uploaded image always wins. Seeded decorative
  banners ship gradients so the sample store looks like the reference without
  fake photos.
- **Homepage carousels read fixed collection slugs** (`new-arrivals`,
  `popular-for-her`, `popular-for-him`, `for-kids`, `best-sellers`) — the
  content of each is fully admin-managed; sections with no products
  auto-hide. Making the slug list itself configurable can ride along with the
  Phase 6 content module.
- **Product-card promo note reads PromoRule configs directly**
  (CARD_EXTRA_PERCENT / FREE_SHIPPING_OVER) as display facts; the full
  cart-evaluation promo engine is Phase 4.
- **Footer about-text comes from `StoreSettings.seoDefaults.description`** —
  no dedicated field in §4; revisit if admin needs a separate blurb.
- **`/pages/[slug]` and a minimal `/search` shipped early** (spec places them
  in Phase 5) so footer/header links resolve during visual verification;
  search gains live suggestions in Phase 5.
- **PLP filters are URL-state, server-rendered** (toggle links + GET form for
  price) — no client JS beyond the shared cards; filters compose and reset
  pagination on change.
- **PDP metadata uses `seoTitle` as an absolute title** because seeded/admin
  seoTitle may already include the store name (avoids "X | Store | Store").

## Phase 4 — Commerce

- **Promo engine is pure** (`src/lib/promotions.ts`), 20 Vitest cases.
  Documented semantics: units sorted price-descending, grouped by the largest
  tier `nth`; within each group the nth unit gets its tier percent (repeats
  per group). Bundles take the most expensive eligible units per full set
  (customer-favorable). Order of application: item rules by priority → coupon
  → CARD_EXTRA_PERCENT on discounted goods → shipping thresholds (rule, zone
  freeOver, FREE_SHIPPING coupon) → COD fee.
- **Cart contents live client-side** (Zustand + localStorage) as variant refs
  + display snapshots; every quote and the order total are recomputed
  server-side from the DB (`quoteCart`/`placeOrder`) — client prices are
  never trusted.
- **Quick add-to-cart on product cards uses the first in-stock variant**;
  exact color/size selection happens on the PDP.
- **Order placement is transactional**: conditional stock decrements
  (`stock >= qty` guard → "stock_changed" error on race), coupon usage
  increment, order + items + status log created atomically.
- **Stale-session guard**: a JWT can outlive its user row (re-seeds, deleted
  accounts) — `placeOrder` verifies the user id and falls back to guest.
  Found live when a pre-reseed session hit the Order.userId FK.
- **Stripe is env-gated** (Checkout Session redirect; single line item with
  the server-computed total; order id in metadata; webhook verifies the
  signature and marks PAID/CONFIRMED). Without STRIPE_SECRET_KEY the card
  option renders disabled and COD remains available.
- **Email is best-effort**: React Email template rendered via
  @react-email/render + Nodemailer; without SMTP_HOST the send is skipped
  with a log line — checkout never fails on mail. COD mails on placement;
  card mails from the webhook after payment.
- **Shipping zone matched by city name** (case-insensitive) with the
  empty-cities zone as catch-all; the checkout shows the matched zone
  (§5 "shipping method (zones)") rather than offering a manual choice.
- **Playwright E2E deferred to Phase 7** (hardening) where all three specced
  flows (checkout, admin product CRUD, admin order status) land together;
  Phase 4 was verified by the promo unit tests + a live COD checkout
  (ORD-1026) exercising promos, stock decrement, notification and mail
  fallback. Vitest pinned to v3 + vite 6 (vitest 4's rolldown native binding
  fails to install on this machine).

## Phase 5 — Account & extras

- **`verifiedUserId()` centralizes the stale-JWT guard** (lib/auth-guards):
  every server action writing rows keyed by userId (orders, wishlist,
  reviews, addresses, profile) resolves the session id against the DB first.
  Replaces the Phase-4 inline check after the same FK failure surfaced in
  wishlist sync.
- **Wishlist state lives in a client store for everyone** (localStorage);
  logged-in users mirror to the DB via fire-and-forget actions. The
  guest-merge (§5) happens in NavClient on the first authenticated mount:
  local ids are pushed via `syncWishlist` and the store adopts the merged
  authoritative list.
- **`/wishlist` is client-rendered from serializable card payloads**
  (`getWishlistCards`) because guest ids only exist in the browser; the same
  action also performs the merge for logged-in users.
- **Header search suggestions** debounce 250 ms, min 2 chars, top-5 by
  name/material; the presentational StoreHeader gained a `searchSlot` prop so
  the client SearchBox replaces the plain GET form.
- **Reviews submit as PENDING** (one per user per product, enforced in the
  action — no DB unique constraint in §4) and raise an admin notification;
  they appear on the PDP only after Phase-6 moderation approves them.
- **Order detail is owner-only** (`order.userId === session.user.id`) — staff
  views arrive with the Phase 6 orders module.
- **SEO**: dynamic `sitemap.ts` (static + categories + products + pages from
  the DB, base URL from AUTH_URL), `robots.ts` disallowing
  admin/account/api/checkout/cart/dev, JSON-LD Product + BreadcrumbList on
  the PDP, themed 404 page.

## Phase 6 — Admin (modules 1–4: Dashboard, Orders, Products, Categories)

- **Incremental delivery:** per user request the 16 modules ship in batches of
  3–4 with a verification stop after each; this section covers batch 1.
- **Shell:** collapsible sidebar (state in localStorage) filtered by the
  permissions matrix, topbar global search (products/orders/customers, each
  group permission-gated), notifications bell (unread count + mark-all-read),
  profile menu. Sidebar/topbar carry `print:hidden` so invoice/packing pages
  print clean.
- **Shared infra:** TanStack Table v8 in fully manual mode — rows arrive
  server-paginated/sorted, header clicks rewrite searchParams (linkable list
  state, no client fetching). Zero-dependency CSV helpers (BOM for Excel
  Arabic, RFC-4180 parser); exports capped at 5000 rows and audit-logged.
  `requireAdminAction()` guard for server actions/routes (throws instead of
  redirecting; re-verifies the user row exists and is active — stale-JWT
  safe) and `audit()` (never throws — an audit failure must not roll back the
  action it describes). Upload storage behind a `StorageDriver` interface
  (local `/public/uploads` driver now, S3-compatible swap for prod; 5 MB cap,
  MIME whitelist).
- **Dashboard definitions:** revenue counts every order not
  CANCELLED/RETURNED regardless of payment status (COD is demand before it is
  paid). "Conversion proxy" = orders ÷ distinct purchasing customers in the
  window. Low-stock list compares `stock <= lowStockAt` in JS (Prisma can't
  compare two columns portably).
- **Orders:** status change logs to OrderStatusLog with the acting user and
  optional note; "notify customer" sends the React-Email status template
  (skips with a log when SMTP unset). Marking a COD order DELIVERED
  auto-sets `paymentStatus = PAID` (cash collected on delivery). Refund is a
  reversible paymentStatus flag. Manual (staff-created) orders start at
  CONFIRMED — staff entry skips the PENDING gate — and reuse `quoteCart`, so
  promos/shipping/COD fee are recomputed server-side identically to checkout;
  the address country derives from the matched shipping zone (never
  hardcoded). Invoice (with prices) and packing slip (without) share one
  print-CSS document.
- **Products:** editor is one page with six tabs; a new product saves
  General first (created as DRAFT, basePrice 0) and unlocks
  Variants/Media/SEO/Visibility after creation. Card price supports
  auto mode — the server recomputes from the active CARD_EXTRA_PERCENT rule
  and stores a concrete `cardPrice` (client preview is advisory only).
  Variants-matrix rows removed by the admin are hard-deleted unless
  referenced by order items — those deactivate instead (snapshots keep old
  orders intact either way, but the SKU history stays queryable). CSV
  import/export is product-level with matching columns (round-trip safe);
  rows match existing products by SKU, else create (import needs
  categorySlug + basePrice + description to create). Variant-level export
  belongs to the Inventory module (module 6).
- **Categories:** drag-drop reordering within the same level (HTML5 DnD,
  insert-before semantics); parent changes via the edit dialog. Delete is
  blocked while products or subcategories reference the category. Pasted or
  uploaded SVG icons are sanitized (must be a bare `<svg>` doc; rejects
  script/foreignObject/event handlers/external hrefs).
- **Verified live (2026-07-19):** dashboard KPIs/charts vs seed, order
  ORD-1021 status flow (PENDING→PROCESSING w/ note + email-skip log + audit
  rows) + tracking + invoice, manual order ORD-1027 (2× BABUTCHA Grey/39 →
  −247.35 multi-buy, free shipping Giza, +25 COD = 3,075.65 exactly matching
  the checkout engine), product "Aqua Test Slide" full round-trip (create →
  price 999/1299/450 + auto card 849.15 → 2×3 variant matrix, bulk stock 10 →
  ACTIVE → live PDP with consistent card-price display), category
  create/nest/delete + persisted drag reorder, STAFF sidebar filtering +
  /admin/forbidden. **Test residue in dev.db** (reseed clears): ORD-1027,
  ORD-1021 now PROCESSING with tracking TRK-889900, product
  `aqua-test-slide`, audit-log rows.

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
