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

## Phase 6 — Admin (modules 5–8: Collections, Inventory, Discounts, Customers)

- **Collections:** product assignment persists immediately on every add/
  remove/drag (no separate save button) — the array order becomes
  `CollectionProduct.sortOrder`, which drives the homepage carousels.
  Deleting a collection is **blocked while an active BUNDLE_PRICE promo
  references its slug** — deleting would silently break the promo.
- **Inventory:** the stock-adjustment trail lives in `AuditLog`
  (`inventory.adjust` with sku/from/to/reason) — §4 has no dedicated
  inventory-log model and the audit log already satisfies "logged". A reason
  (min 3 chars) is mandatory. Adjusting a variant below its threshold raises
  a LOW_STOCK notification (only on the downward crossing). The low-stock
  filter compares `stock <= lowStockAt` in JS (column-to-column comparison
  isn't portable), so low-mode filtering/pagination is in-memory, capped at
  5000 variants.
- **Discounts:** coupon usage stats show both `usedCount` (checkout
  redemptions) and attributed orders/revenue from `Order.couponCode` — seed
  orders carry codes without incrementing usedCount, so the two can differ.
  Coupon code is the PK; renames update in place (order snapshots keep the
  old code string). Promo `config` is schema-validated per type server-side;
  the builder shows a live plain-language preview sentence (e.g. «Any 3
  items from “EVA-ULTRA” for 3,999 EGP»). Reordering normalizes all
  priorities to 0..n-1 (repairs any duplicate priorities from the seed).
  Editing a rule cannot change its type (delete + recreate instead) — keeps
  config validation honest.
- **Customers:** added nullable `User.adminNotes` column (migration
  `add_user_admin_notes`) — §6.8 requires per-customer staff notes and §4
  had no home for them; additive and Postgres-compatible. Lifetime value /
  order counts exclude CANCELLED and RETURNED orders. Disable-account flips
  `User.isActive`, which the credentials provider already rejects at
  sign-in. Detail pages are scoped to `role=CUSTOMER` — staff accounts are
  managed by module 13, not here.
- **Verified live (2026-07-19):** EVA-ULTRA assignment (add + drag-to-first
  persisted to sortOrder, removal restored), promo-protected collection
  delete blocked with message; stock adjust 2→12 on P-1011-BLA-45 with
  audited reason; TEST20 coupon create/delete round-trip, promo move-up/down
  (priorities normalized 0-3), all four seed rules render correct preview
  sentences; Ali Mostafa detail (3 orders incl. manual ORD-1027 in LTV
  13,943.65), admin note saved, disable→enable round-trip (both audited);
  customers/inventory CSV exports (low-filter respected, 127 low variants).
  **Test residue in dev.db** (reseed clears): Ali's adminNotes, ARENA LUX
  Black/45 stock 12, extra audit rows.

## Phase 6 — Admin (modules 9–12: Reviews, Content/CMS, Shipping, Payments)

- **Reviews:** approve/reject + reply from a card-style moderation queue with
  status tabs and rating/product filters; every action revalidates the PDP.
  Admin replies now render on the PDP under the review ("Store reply") —
  small storefront addition since Phase 5 didn't display `adminReply`.
- **Banner scheduling:** §6.10 hero "schedule" has no schema columns —
  stored as `config.startsAt/endsAt` (dates) and filtered in
  `getBanners()`, so all placements support scheduling. Banner edits
  **merge** into `config` so unmanaged keys (seed gradient `style` hints)
  survive; a merchant image upload still wins over the gradient.
- **Nav & footer editors:** added `StoreSettings.navLinks` /
  `footerLinks` Json columns (migration `add_settings_nav_footer_links`)
  holding `[{label,labelAr,href}]`. Header secondary links and the footer
  "useful links" column read them, falling back to the previous defaults
  when empty. Dropdown-column nav editing was skipped — the main nav is
  category-driven (managed in Categories) and the reference design has a
  flat nav; logged as the generic-first interpretation of §6.10.
- **Static pages "rich text":** an HTML source editor with a side-by-side
  bilingual preview (seed content is already HTML). A WYSIWYG would add a
  heavy dependency for little gain at this stage; `<script>`/event-handler
  markup is rejected server-side. Can be upgraded to TipTap later without
  data changes.
- **Shipping:** zones CRUD with comma-list cities/countries (empty cities =
  catch-all zone, matching the checkout's zone-matching fallback); the last
  remaining zone cannot be deleted from the UI. COD settings live on
  StoreSettings and are editable from both Shipping (§6.11) and Payments
  (§6.12) through one action whose permission gate depends on the module it
  was invoked from (shipping = MANAGER+, payments = ADMIN).
- **Payments:** Stripe status is read-only from env with masked keys (first
  8 + last 4 chars) — never stored in the DB. The card-discount % edits the
  CARD_EXTRA_PERCENT PromoRule directly (0 deactivates it); products with
  `cardPrice` set to auto keep their stored value until re-saved — the %
  drives the engine and percentage displays immediately.
- **Verified live (2026-07-19):** Sara's BABUTCHA review approved + replied
  ("Thank you Sara!…") and both now render on the public PDP; marquee item
  create→live-on-homepage→delete; hero "Comfort With Personality" hidden by
  a past end-date and restored by clearing it; page `faq-test`
  create→renders→delete (404); nav link "Size Guide" appears in the header
  and defaults return when the list is emptied; Greater Cairo rate 60→65→60
  round-trip; card % 15→20 (PDP "Pay with card · 20% off" updates while the
  static marquee banner text correctly stays put) →15. **Test residue:**
  Sara's review APPROVED with a reply, audit rows (reseed clears).

## Phase 6 — Admin (modules 13–16: Staff, Notifications, Reports, Settings) — PHASE COMPLETE

- **Staff invites** create the account immediately with a generated
  URL-safe temporary password (bcrypt-hashed): the password is shown ONCE to
  the inviting admin and also emailed via the invite template when SMTP is
  configured — invite-link/token flows need infrastructure §4 doesn't model.
  Guards: you cannot change or deactivate your own account from the staff
  module, and the last active ADMIN can be neither demoted nor deactivated.
- **Permissions matrix stays code-defined** (`src/lib/permissions.ts`) and
  is displayed read-only in the staff module. §6.13 wants the matrix
  *enforced* (it is — middleware + every action); per-store editable
  permissions would need a DB model §4 doesn't define. Logged as the
  generic-first interpretation; the display makes the contract visible.
- **Notification prefs** live in `StoreSettings.notificationPrefs`
  (migration `add_notification_prefs`; missing key = ON, explicit false =
  muted). All three producers route through `src/lib/notify.ts`, which never
  throws — a muted or failed notification cannot break checkout, review
  submission, or a stock adjustment.
- **Reports aggregate in JS** from the range's orders (≤5000) rather than
  SQL date functions — identical behavior on SQLite dev and Postgres prod.
  Excludes CANCELLED/RETURNED, same revenue definition as the dashboard.
  Product report is top-20 by revenue; day/category/payment/coupon exports
  are unbounded within the range cap.
- **Settings:** identity (name/logo/favicon/hotline/socials), currency +
  default locale, SEO defaults, maintenance toggle, SMTP test button
  (attempts a real send; clear failure message when unset). **Maintenance
  mode** renders a branded notice to visitors in the storefront layout while
  STAFF/MANAGER/ADMIN sessions browse normally — the admin area is never
  gated. **Audit log viewer** is part of the settings page: paginated,
  searchable (action/entity/id), actor-joined, diff preview.
- **Verified live (2026-07-19):** invited "Test Staffer" (temp password
  verified against the bcrypt hash), role STAFF→MANAGER, deactivated — all
  three audited; notification marked read (7→6 unread) and LOW_STOCK pref
  off→on round-trip; reports for the last 30d (10 orders / 46,793.3 EGP / 32
  units, WELCOME10 = 4 orders / 2,355 discount) with the coupon CSV export
  matching on-screen numbers; store name change reflected on the storefront
  header and reverted; maintenance ON → guests saw the notice while the
  admin session browsed normally → OFF; SMTP test correctly reported failure
  (unset); audit viewer lists the session's full trail. **Test residue:**
  inactive MANAGER account `test.staffer@store.test`, read notification,
  audit rows (reseed clears).

## Phase 7 — Hardening (Step 1: Playwright infrastructure + 3 E2E flows)

- **Datasource URL is env-based now:** `schema.prisma` reads
  `env("DATABASE_URL")` (`.env` → `file:./dev.db`). Required so the E2E
  server can point at an isolated DB; also shrinks the final
  Postgres-switch delta to just the provider line + the env value.
- **E2E isolation:** `prisma/test.db` (gitignored), reset + reseeded by
  `e2e/reset-test-db.ts` which the `test:e2e` script runs **before**
  `playwright test` — Playwright boots the webServer before `globalSetup`,
  so the DB must be ready before the runner starts. The reset deletes the
  script-owned throwaway file and runs a plain `prisma db push` into the
  fresh file instead of `db push --force-reset`: Prisma 6.19 ships an
  AI-agent guard that blocks the destructive flag when invoked from
  Claude Code, and the file-delete design needs no destructive flag at
  all (and behaves identically for humans running `pnpm test:e2e`).
- **Runner shape:** dev server (turbopack) on dedicated port 3100 so a
  normal `pnpm dev` on :3000 can coexist; single worker + serial specs
  (SQLite writes, on-demand route compiles); `retries: 1` with
  per-attempt-unique product slugs/SKUs so retries never collide.
- **Selector lessons encoded in the specs:** PDP assertions scope to
  `[data-pdp-options]` (related-product cards render their own size-chip
  buttons); checkout's "Next" button needs `exact: true` because the
  dev-mode Next.js Dev Tools floating button ("Open Next.js Dev Tools")
  substring-matches "Next".
- **False alarm, corrected:** a suspected `redirect("\admin")` typo in
  `src/server/auth.ts` was a search-tool display artifact (MSYS backslash
  mangling) — byte-level inspection shows the file correctly reads
  `redirect("/admin")`. No fix needed.

## Phase 7 — Hardening (Steps 2–6 batch) — PHASE COMPLETE

- **Empty states were already complete** (cart, checkout, wishlist, search,
  PLP filters, account orders/addresses, admin tables, PDP reviews) — the
  audit found no gaps, so Step 2 reduced to boundaries: `loading.tsx`
  skeletons (storefront group, PLP, PDP, search, account, admin — the
  layout/shell stays visible while content streams), `error.tsx` per route
  group + root `global-error.tsx` (inline-styled: it replaces the root
  layout, so globals.css is unavailable), and the cart/checkout/wishlist
  pre-hydration `return null` blanks now render skeletons instead.
  New bilingual `errorPage` strings in both message files.
- **`SmartImage` (`components/ui/smart-image.tsx`)** wraps `next/image`:
  raster sources get optimized; `.svg` sources render as plain `<img>` —
  the optimizer blocks SVG by default and resizing gains nothing, and this
  avoids `dangerouslyAllowSVG`. All 9 storefront `<img>` sites converted
  (PDP main image gets `priority` — it is the LCP element). The hero's
  CSS-background image became an absolute-fill `SmartImage` so merchant
  hero uploads are optimized; seeded gradient heroes are unaffected.
- **A11y pass:** global `:focus-visible` ring (navy; white inside the dark
  footer); marquee + smooth-scroll respect `prefers-reduced-motion`;
  qty steppers/coupon/search/newsletter inputs got real labels (new
  bilingual `increaseQty`/`decreaseQty` keys — labels were literally "−"
  and "+"); `aria-current="page"` on the active nav link; the product-card
  quick-add reveal now also appears on keyboard focus (was hover-only);
  storefront `text-gray-4` on white bumped to `gray-6` for meaningful text
  (2.5:1 fails AA; gray-4 kept for decorative marks, placeholders, and on
  dark surfaces where it passes ~8:1). Admin hint text left as-is.
- **Lighthouse (2026-07-19, prod build, Lighthouse 12.8.2, headless
  Chrome):** home **93**/100/100 mobile and **100**/100/100 desktop; PDP
  **94**/100/100 mobile and **100**/100/100 desktop
  (perf/SEO/best-practices). Target ≥90 met with no dev-only workarounds;
  mobile LCP ~3.1 s under emulated throttling is the remaining soft spot.
- **README rewritten** (setup, seeded logins, env reference, tests,
  Vercel + Neon deploy walkthrough cross-referencing the pending
  Postgres-switch steps below).
- **⚠ Spec gap surfaced (pre-dates Phase 7, needs a decision before
  launch):** `messages/ar.json` is complete and every admin form edits
  bilingual fields, but **no runtime locale layer exists** — nothing ever
  imports ar.json, there is no locale switcher, and the storefront renders
  English/LTR only. §1's "switchable en/ar with RTL" was never wired in
  Phase 3+. Left out of Phase 7 (not in its approved scope); flagged for
  an explicit go/no-go before deployment.

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
