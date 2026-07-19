# Cloths Store — E-Commerce Platform + Admin Dashboard

A production-ready, general-purpose e-commerce platform: a customer storefront
whose entire content (branding, navigation, banners, products, promotions) is
driven from the database, plus a complete back-office at `/admin`. A merchant
can deploy it, configure everything from the dashboard, and start selling —
with zero code changes.

## Features

**Storefront**
- CMS-driven homepage: promo marquee, hero banner, category grid, lifestyle
  cards, collection carousels, social grid — all managed from admin
- Category listing pages with filters (price, color, size, material,
  availability), sorting and pagination; live search suggestions
- Product pages with color-synced galleries, per-variant stock, card-price
  display, reviews, related products
- Cart with a server-side **promo engine** (Nth-item discounts, bundle
  prices, card-payment discount, free-shipping thresholds) and coupons
- 5-step checkout — guest or signed-in — with Stripe (test mode) and Cash on
  Delivery, shipping zones, order confirmation emails
- Account area (orders + status timeline, addresses, profile), wishlist with
  guest→login merge, SEO (metadata, JSON-LD, sitemap, robots)

**Admin (16 modules)**
Dashboard KPIs & charts · Orders (status flow, invoices/packing slips, manual
orders) · Products (tabbed editor, variants matrix, CSV import/export) ·
Categories · Collections · Inventory · Discounts (coupons + promotion
builder) · Customers · Reviews moderation · Content CMS (banners, pages, nav,
footer) · Shipping zones · Payments · Staff & roles (RBAC) · Notifications ·
Reports · Settings (identity, SEO, maintenance mode, audit log)

## Tech stack

Next.js 15 (App Router, Server Components/Actions) · TypeScript (strict) ·
Tailwind CSS v4 · Prisma 6 · Auth.js (NextAuth v5) · Stripe · Zustand ·
Zod · React Email + Nodemailer · Recharts · TanStack Table v8 · Vitest ·
Playwright

## Local setup

Prerequisites: **Node 20.17+** and **pnpm**.

```bash
pnpm install
cp .env.example .env        # then edit — see the env reference below
pnpm exec prisma db push    # dev uses SQLite (file:./dev.db) — see note below
pnpm exec prisma db seed
pnpm dev                    # http://localhost:3000  (admin at /admin)
```

> **Datasource note:** development currently runs on SQLite
> (`DATABASE_URL="file:./dev.db"` in `.env`) so no local Postgres is needed.
> The schema is written Postgres-compatible throughout; the switch to
> Neon/Postgres is the final pre-deployment step (see **Deploying** below).

### Seeded logins

| Role | Email | Password |
|---|---|---|
| Admin | `admin@store.test` | `Admin123!` |
| Manager | `manager@store.test` | `Admin123!` |
| Staff | `staff@store.test` | `Admin123!` |
| Customers | 10 accounts (see Prisma Studio) | `Customer123!` |

The deterministic seed also creates 8 categories, 40 products with color/size
variants, 6 collections, 4 promo rules, 3 coupons, 2 shipping zones, 25
orders across the last 90 days, reviews, banners and static pages.

## Environment variables

All variables live in `.env` (see `.env.example` for the template):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | `file:./dev.db` in dev; Neon Postgres URL in production |
| `AUTH_SECRET` | Auth.js session secret (`openssl rand -base64 32`) |
| `AUTH_URL` | Public base URL (`http://localhost:3000` in dev) |
| `GOOGLE_ID` / `GOOGLE_SECRET` | Optional — enables Google sign-in when set |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional — card payments render disabled without them; COD keeps working |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Optional — order/status emails are skipped (with a log line) when unset |
| `UPLOAD_DRIVER` | `local` (dev, files in `public/uploads`) or `s3` + the `S3_*` variables |

## Tests

```bash
pnpm test        # Vitest — promo engine unit tests
pnpm test:e2e    # Playwright — checkout, admin product CRUD, admin order status
pnpm lint        # ESLint
pnpm build       # production build + strict type-check
```

The E2E suite is fully isolated: it reseeds its own SQLite database
(`prisma/test.db`) and boots a dev server on port **3100**, so your `pnpm dev`
session and `dev.db` are never touched.

## Deploying (Vercel + Neon)

### 1. Switch the datasource to Postgres (one-time)

1. In `prisma/schema.prisma` change the datasource to
   `provider = "postgresql"` (the URL already reads `env("DATABASE_URL")`).
2. Create a [Neon](https://neon.tech) project and put its connection string in
   `DATABASE_URL` (keep `?sslmode=require`).
3. Regenerate migrations for Postgres: delete the SQLite
   `prisma/migrations` folder and run `pnpm exec prisma migrate dev --name init`
   once against Neon.
4. Seed: `pnpm exec prisma db seed` (or adapt the seed for production data).
5. Optional hardening while you're here: restore native enums and
   `@db.Decimal(10,2)` / `@db.Text` annotations, and reconcile
   `src/lib/enums.ts` with the generated Prisma enums
   (see `DECISIONS.md → Pending tasks`).

### 2. Vercel

1. Import the repository in Vercel (framework preset: Next.js).
2. Set the environment variables from the table above — `DATABASE_URL`
   (Neon), `AUTH_SECRET`, `AUTH_URL` (your production URL), and any of the
   optional Stripe/SMTP/Google/S3 groups you use.
3. Set the build command to `prisma migrate deploy && next build` (or run
   `prisma migrate deploy` as a release step).
4. For uploads in production use `UPLOAD_DRIVER=s3` with an S3-compatible
   bucket — Vercel's filesystem is ephemeral, so the `local` driver is
   dev-only.
5. Point the Stripe webhook at `https://<your-domain>/api/webhooks/stripe`
   and set `STRIPE_WEBHOOK_SECRET` from the Stripe dashboard.

### 3. Post-deploy checklist

- Sign in as the seeded admin, change the password, and configure store
  identity (name, logo, hotline) under **Settings**.
- Replace placeholder product/banner images via the admin media uploads.
- Verify a test checkout (Stripe test card + COD) end to end.

## Project structure

```
src/
  app/
    (storefront)/   # public store
    (auth)/         # login, register, forgot password
    admin/          # dashboard (protected, RBAC)
    api/            # webhooks, uploads
  components/       # store/ + admin/ + ui/ primitives
  lib/              # db, auth, promotions, permissions, utils
  server/           # server actions by domain
prisma/             # schema, migrations, seed
messages/           # en.json, ar.json (i18n strings)
e2e/                # Playwright specs + test-DB reset
```

`DECISIONS.md` logs every ambiguity resolved during the build and the
pending pre-deployment tasks. `STORE-BUILD-PROMPT.md` is the original build
specification.
