# MASTER BUILD PROMPT — Full E-Commerce Store + Complete Admin Dashboard

> **How to use:** Place this file and `zee-clone.html` in an empty project folder, open Claude Code, and say:
> `Read STORE-BUILD-PROMPT.md and zee-clone.html, then execute the plan phase by phase. Confirm the plan before Phase 0.`

---

## 1. MISSION

Build a **production-ready, general-purpose e-commerce platform** consisting of:

1. **Storefront** — customer-facing store whose visual design replicates the layout, spacing, typography, and component styling found in `zee-clone.html` (included in this folder). The design must be reusable for ANY store: all branding (logo, colors, promo texts, product data) comes from the database/CMS, never hardcoded.
2. **Admin Dashboard** — a complete back-office at `/admin` covering every operational need of a real store (detailed in §6).

The final result must be a store that a merchant can deploy, configure from the dashboard, add products, and start selling — with zero code changes.

**Language & direction:** Full i18n with English (LTR) and Arabic (RTL) locales, switchable from the storefront and configurable as default from admin. All admin and storefront strings go through the i18n layer.

---

## 2. TECH STACK (fixed — do not substitute)

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, Server Components, Server Actions) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + CSS variables for theme tokens |
| DB | PostgreSQL |
| ORM | Prisma (migrations committed) |
| Auth | Auth.js (NextAuth v5) — credentials + Google OAuth; separate admin RBAC |
| Payments | Stripe (cards) + Cash on Delivery + pluggable provider interface |
| Uploads | Local `/uploads` in dev; S3-compatible adapter interface for prod |
| Email | React Email + Nodemailer (SMTP from env) |
| Validation | Zod everywhere (forms, server actions, API) |
| State | Server Components first; Zustand only for cart/wishlist client state |
| Charts (admin) | Recharts |
| Tables (admin) | TanStack Table v8 |
| Testing | Vitest (unit) + Playwright (3 critical flows: browse→cart→checkout, admin product CRUD, admin order status change) |

**Project structure (single Next.js app, route groups):**

```
src/
  app/
    (storefront)/          # public store
    (auth)/                # login, register, forgot password
    admin/                 # dashboard (protected, RBAC)
    api/                   # route handlers (webhooks, uploads)
  components/
    store/                 # storefront UI
    admin/                 # dashboard UI
    ui/                    # shared primitives (Button, Input, Modal, ...)
  lib/                     # db, auth, payments, mail, utils
  server/                  # server actions grouped by domain
prisma/
  schema.prisma
  seed.ts
messages/                  # en.json, ar.json
```

---

## 3. DESIGN SYSTEM — extracted from `zee-clone.html` (source of truth)

Read `zee-clone.html` first and reuse its exact visual language. Key tokens (must live in `globals.css` as CSS variables + Tailwind theme):

```css
--navy: #16294E;        /* primary — buttons, nav pills, accents */
--navy-deep: #0F1E3C;   /* badges, side tab */
--ink: #1A1A1A;         /* text */
--gray-6: #6B7280;  --gray-4: #9CA3AF;  --line: #E5E7EB;
--card-bg: #F7F7F5;     /* product image background */
--deal-red: #8B1F2F;  --deal-bg: #FBF3F4;   /* card-price box + BEST DEAL */
--save-green: #3E5233;  /* SAVE -% pill */
```

**Typography:** `Archivo` (body/UI, weights 400–800), `Oswald` (section headings, uppercase, letter-spaced), `Cairo` (Arabic display). Load via `next/font`.

**Signature components to replicate exactly (as reusable React components):**

- `PromoMarquee` — navy bar, seamless infinite marquee, items separated by white rules, pause on hover. Content from CMS.
- `StoreHeader` — logo | pill search bar with circular navy button | hotline number | account icon.
- `MainNav` — sticky; uppercase links with dropdown carets; right side: About/Contact, wishlist counter, navy cart pill `{total} EGP` with count badge.
- `SplitHeading` — `WORD ——rule—— WORD` (Oswald, uppercase) used for every section title.
- `CategoryCard` — bordered card: line-icon | vertical divider | label; hover lift + shadow.
- `ProductCard` — light-gray media area; olive `SAVE -x%` pill top-left; heart top-right; name (extrabold), material subtitle, struck old price + bold price, red-bordered card-price box with `BEST DEAL` tag, "Pay with card · 15% off · Free shipping" note, clickable color swatches / size chips; hover: subtle image zoom + shadow + quick "Add to cart" reveal.
- `LifestyleCard` — tall image card with centered overlay title.
- `HeroBanner` — full-bleed image, overlay headline (supports Arabic display font), badge pill, side column of featured variants.
- `SocialGrid` (#MakeMoves) — giant tight-tracked headline + 5:8 tile grid.
- `DarkFooter` — black; large-heading columns (About / Categories / Useful Links / Policies), circular white social buttons, rounded newsletter input + navy SIGN UP pill, bottom row: letter-spaced copyright • oval logo • payment method badges.
- `SideOfferTab` — fixed vertical left tab (dismissible), text from CMS.
- `ScrollTopButton`.

All placeholder SVG shoes/gradients in the reference file are placeholders only — real product/banner images come from admin uploads.

---

## 4. DATABASE SCHEMA (Prisma — implement all models)

```
StoreSettings   (singleton: name, logoUrl, faviconUrl, currency, defaultLocale,
                 hotline, socialLinks Json, seoDefaults Json, maintenanceMode)
User            (id, name, email, phone, passwordHash, role: CUSTOMER|STAFF|MANAGER|ADMIN,
                 avatarUrl, addresses[], orders[], reviews[], wishlist[], createdAt)
Address         (userId, label, country, city, area, street, building, phone, isDefault)
Category        (id, name, nameAr, slug, iconSvg, imageUrl, parentId?, sortOrder, isActive)
Product         (id, name, nameAr, slug, description, descriptionAr, material,
                 categoryId, brand?, basePrice, compareAtPrice?, cardPrice?,   // card-payment price
                 costPrice?, sku, barcode?, weight?, tags[], images[],
                 status: DRAFT|ACTIVE|ARCHIVED, isFeatured, sortOrder,
                 seoTitle?, seoDescription?, variants[], reviews[], createdAt, updatedAt)
ProductImage    (productId, url, alt, sortOrder, variantColorRef?)
Variant         (productId, colorName, colorHex, size, sku, price?, stock, lowStockAt, isActive)
Collection      (name, nameAr, slug, imageUrl, productIds[], isActive)   // e.g. "EVA-ULTRA"
Order           (id, orderNumber, userId?, guestEmail?, guestPhone?,
                 items[], subtotal, discountTotal, shippingTotal, codFee?, grandTotal,
                 paymentMethod: CARD|COD, paymentStatus: PENDING|PAID|FAILED|REFUNDED,
                 status: PENDING|CONFIRMED|PROCESSING|SHIPPED|DELIVERED|CANCELLED|RETURNED,
                 shippingAddress Json, trackingNumber?, notes?, statusHistory[], createdAt)
OrderItem       (orderId, productId, variantId, nameSnapshot, imageSnapshot,
                 price, quantity, total)
OrderStatusLog  (orderId, fromStatus, toStatus, byUserId, note?, createdAt)
Coupon          (code, type: PERCENT|FIXED|FREE_SHIPPING, value, minSubtotal?,
                 maxUses?, usedCount, perUserLimit?, startsAt, endsAt, isActive,
                 appliesTo: ALL|CATEGORY|PRODUCT, targetIds[])
PromoRule       (name, type: BUY_X_GET_DISCOUNT | BUNDLE_PRICE | CARD_EXTRA_PERCENT
                 | FREE_SHIPPING_OVER, config Json, isActive, priority)
                 // covers: "2nd item -15%, 3rd -30%", "3 for 3999", "+15% with card", "free ship 800+"
ShippingZone    (name, countries[], cities[], rate, freeOver?, etaText, isActive)
Banner          (placement: HERO|LIFESTYLE|SIDE_TAB|MARQUEE|SOCIAL_GRID,
                 title?, titleAr?, subtitle?, imageUrl?, linkUrl?, sortOrder, isActive)
Review          (productId, userId, rating 1-5, title?, body?, status: PENDING|APPROVED|REJECTED)
Page            (slug, title, titleAr, contentRichText, isActive)   // privacy, shipping, returns...
NewsletterSub   (email, createdAt, source)
Notification    (admin-facing: type, title, body, isRead, link, createdAt)
AuditLog        (userId, action, entity, entityId, diff Json, createdAt)
```

Write `prisma/seed.ts` producing: 1 admin (`admin@store.test` / `Admin123!`), 2 staff, 10 customers, 8 categories with line icons, 40 products across categories with 3–6 color variants and size runs, realistic prices with compare-at + card prices, 4 promo rules matching §3 examples, 3 coupons, 2 shipping zones, all banner placements filled, 25 orders in mixed statuses across the last 90 days (so dashboard charts render), 15 reviews, 5 static pages.

---

## 5. STOREFRONT — pages & behaviors

| Route | Requirements |
|---|---|
| `/` | Full homepage per §3, every section CMS-driven: marquee, hero, category grid, lifestyle cards, product carousels (New Arrivals / Popular for Her / for Him / for Kids / Best Sellers — each a Collection), promo banners, social grid, footer. |
| `/category/[slug]` | PLP: filter sidebar (price range, color, size, material, availability), sort (newest/price/popularity), pagination, active-filter chips. |
| `/product/[slug]` | Gallery synced to selected color; size selector with per-variant stock ("Only 3 left" under lowStockAt, disable OOS); price block identical to ProductCard incl. card-price box; qty; Add to cart / Buy now; wishlist; accordion (description, material & care, shipping & returns); reviews with rating summary; related products carousel. |
| `/search?q=` | Debounced live suggestions in header; full results page reusing PLP grid. |
| `/cart` | Line items with variant info, qty steppers, remove; coupon field; **promo engine applied live** with a savings breakdown line per rule; totals; sticky summary. |
| `/checkout` | Steps: contact → address (saved or new) → shipping method (zones) → payment (Card via Stripe / COD with fee) → review. Guest checkout supported. Order confirmation page + email. |
| `/account` | Overview, orders list + order detail with status timeline, addresses CRUD, profile, change password. |
| `/wishlist` | Grid of ProductCards; guest wishlist in localStorage merges on login. |
| `/(auth)` | Login, register, forgot/reset password. |
| `/pages/[slug]` | Renders CMS pages (privacy, shipping, returns, about). |
| Global | Responsive (mobile drawer nav + bottom cart bar), skeleton loaders, empty states written per interface-voice, SEO (metadata API, OG images, JSON-LD Product/Breadcrumb), sitemap + robots, 404/500 pages in-theme. |

**Promo engine (server-side, single module `lib/promotions.ts`):** given a cart, evaluate active `PromoRule`s by priority, return itemized discounts + labels. Must correctly implement: percentage off Nth item, fixed bundle price for N items from a collection, extra % off when paymentMethod=CARD (reflected as "card price" on product cards too), free shipping threshold. Unit-test this module thoroughly.

---

## 6. ADMIN DASHBOARD — `/admin` (complete requirements)

**Shell:** collapsible sidebar (icons + labels), topbar with global search (products/orders/customers), notifications bell (low stock, new orders, pending reviews), admin profile menu. Clean light UI using the same token palette (navy primary). Every list view: server-side pagination, column sort, filters, search, CSV export, bulk actions.

1. **Dashboard (home)** — KPI cards (today/7d/30d revenue, orders, AOV, conversion proxy, new customers); revenue line chart with range picker; orders-by-status donut; top products table; low-stock alerts; latest orders; recent reviews awaiting moderation.
2. **Orders** — list with status tabs + filters (date, payment, method, zone); detail page: items, customer, addresses, payment info, totals breakdown incl. applied promos; change status (logged to OrderStatusLog + optional customer email per transition); add tracking number; internal notes; refund flag; print invoice + packing slip (print-css pages); manual order creation.
3. **Products** — list with image, stock roll-up, status; create/edit form in tabs: General (bilingual name/desc, category, material, tags) · Pricing (base, compare-at, cost, auto card-price % or manual) · **Variants matrix**: define colors (name+hex) × sizes → auto-generate rows with per-row SKU/price-override/stock, bulk stock edit · Media (multi-upload, drag-sort, alt text, bind image→color) · SEO · Visibility. Duplicate product; archive; bulk price/status update; CSV import & export.
4. **Categories** — tree with drag-drop ordering; icon (SVG paste or upload) + banner image; bilingual names; activate/deactivate.
5. **Collections** — CRUD; drag-drop product assignment; these power homepage carousels.
6. **Inventory** — flat variant view across products; adjust stock with reason (logged); low-stock filter; export.
7. **Discounts** — Coupons CRUD (all fields in schema, usage stats) · **Promotions** builder UI for each PromoRule type with plain-language preview sentence (e.g. "Any 3 items from EVA collection for 999"), priority ordering, enable/disable.
8. **Customers** — list (orders count, lifetime value, last order); detail: info, addresses, order history, notes; disable account; export.
9. **Reviews** — moderation queue: approve/reject, reply, filter by rating/product.
10. **Content (CMS)** — Marquee items manager; Hero banners (image, bilingual headline, badge text, link, schedule); Lifestyle cards; Side offer tab; Social grid tiles; Static pages rich-text editor; Navigation menu editor (links + dropdown columns); Footer links editor.
11. **Shipping** — zones CRUD (areas, rate, free-over, ETA text); COD fee setting.
12. **Payments** — enable/disable providers; Stripe keys status (from env, display masked); COD toggle + fee; card-discount % (feeds promo engine + product card display).
13. **Staff & Roles** — invite staff by email; roles ADMIN / MANAGER / STAFF with a permissions matrix (view/edit per module) enforced server-side via middleware + per-action checks.
14. **Notifications** — full list, mark read; settings for which events notify.
15. **Reports** — sales by day/category/product, payment-method split, coupon performance, export CSV.
16. **Settings** — store identity (name, logo, favicon, hotline, socials), currency & locale defaults, email SMTP test button, SEO defaults, maintenance mode, **audit log viewer**.

**Security:** admin routes behind middleware (session + role); server actions re-verify permissions; rate-limit auth endpoints; Zod-validate every input; never trust client prices — always recompute totals server-side; Stripe webhook signature verification; CSRF-safe actions; passwords bcrypt; audit log on all mutating admin actions.

---

## 7. EXECUTION PLAN — run phase by phase, verify each before continuing

- **Phase 0 — Scaffold:** Next.js 15 + TS + Tailwind; Prisma + Postgres connection; env template (`.env.example` with DATABASE_URL, AUTH_SECRET, GOOGLE_ID/SECRET, STRIPE keys, SMTP, UPLOAD driver); base folder structure; `ui/` primitives; theme tokens from §3; fonts. ✅ Check: app boots, tokens visible on a styleguide page `/dev/styleguide` rendering all §3 components with dummy data.
- **Phase 1 — Data layer:** full Prisma schema, migrations, seed. ✅ Check: `prisma db seed` succeeds; Prisma Studio shows coherent data.
- **Phase 2 — Auth & RBAC:** customer + admin auth, middleware, permissions matrix. ✅ Check: role-gated routes behave correctly.
- **Phase 3 — Storefront core:** header/nav/footer/marquee, homepage fully wired to CMS data, PLP, PDP. ✅ Check: matches `zee-clone.html` visually side-by-side at 1440px and 390px.
- **Phase 4 — Commerce:** cart (Zustand + server sync), promo engine + tests, checkout with Stripe test mode + COD, order emails. ✅ Check: Playwright checkout flow green; promo unit tests green.
- **Phase 5 — Account & extras:** account area, wishlist, search, reviews (submit side), static pages, SEO/sitemap.
- **Phase 6 — Admin:** build modules in §6 order 1→16; after each module, verify CRUD round-trips against seed data. ✅ Check: Playwright admin flows green.
- **Phase 7 — Hardening:** empty/loading/error states everywhere, image optimization, accessibility pass (focus rings, labels, contrast), Lighthouse ≥ 90 perf/SEO/best-practices on home + PDP, README with setup/deploy (Vercel + Neon) instructions.

**Working rules for the agent:**
- After each phase, output a short summary + what to manually verify, then WAIT for approval.
- Never hardcode store-specific text/branding; everything through StoreSettings/Banner/i18n.
- Commit per phase with conventional commits.
- If a decision is ambiguous, choose the option that keeps the platform generic and admin-configurable, and note it in `DECISIONS.md`.

---

## 8. ACCEPTANCE CRITERIA (final)

1. Fresh clone → `pnpm i && prisma migrate dev && prisma db seed && pnpm dev` → working store + admin with seed data, no errors.
2. Homepage is visually faithful to `zee-clone.html` on desktop & mobile, with all content editable from admin.
3. A merchant can, from admin only: change logo/name/hotline, build the menu, create categories & products with color/size variants and images, set promos matching all four example rule types, configure shipping & COD, and see a customer's order arrive, process it to Delivered, and print its invoice.
4. Card-price display, promo math, and totals are consistent between product card, PDP, cart, checkout, order email, and admin order detail.
5. RBAC actually blocks a STAFF user from Settings/Staff modules.
6. All tests green; `pnpm build` passes with zero TS errors.
