# Green Grove Family Clinic — Health Care Clinic

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://www.prisma.io/)
[![Playwright](https://img.shields.io/badge/Playwright-e2e-2EAD33?logo=playwright)](https://playwright.dev/)

A production-grade, pixel-faithful clone of the [Green Grove Family Clinic
landing experience](https://health-care-clinic.base44.app/), rebuilt as a
full Next.js application: the same section-for-section scroll narrative, the
same design system, and a real appointment-request backend (validated API +
SQLite via Prisma) instead of the original's hosted form sink.

## Overview

The reference app is a single-page marketing site for a family clinic:
video hero, service catalog, team, insurance partners, an appointment
request form, FAQ, and two legal pages. This rebuild reproduces it
section-for-section — identical copy, layout classes, and computed
rendering — while upgrading the substrate from a Vite SPA compiled with
Tailwind CSS v3 to **Next.js 16 App Router with Tailwind CSS v4**.

That engine migration is the interesting part: Tailwind v4 changes the
compiled output of dozens of utilities (theme token format, shadow scale,
gradient interpolation, the `space-y` selector, the `!important` modifier
syntax). Every one of those differences was measured against the live
reference and neutralized — see
[docs/Tailwind-V4-Validation-Report.md](docs/Tailwind-V4-Validation-Report.md)
and the ADR log in
[Project_Architecture_Document.md](Project_Architecture_Document.md).
The result renders at the same computed metrics as the reference (page
height 7490px at 1440×900, identical heading scales, identical card
geometry).

## Key Features

| Feature | Description |
| ------- | ----------- |
| 🎥 Video hero | Autoplaying muted looping hero video with an sRGB readability scrim and a rotating three-message value badge |
| 🧭 Scroll-spy nav | Desktop pill nav marks the section in view (mid-viewport threshold) with a persistent underline + semibold |
| 📱 Mobile menu | Accessible dropdown panel (`aria-expanded`, Escape, outside-click, link-activation closes + jumps) pinned by e2e specs |
| 🩺 Eight services | Stacked-entrance cards choreographed by IntersectionObserver + CSS custom properties |
| 📝 Appointment form | Underline-style form → validated `POST /api/appointments` → Prisma/SQLite, with Sending…/success/error states |
| 🔎 SEO discoverability | Beyond-parity head-only layer (ADR-011): `/sitemap.xml` (the 3 public routes, derived from the unit-tested `src/lib/seo.ts` allowlist) + allow-all `/robots.txt` with the sitemap reference, canonical URLs, complete OpenGraph (incl. a generated 1200×630 `og-image.png`) and a `summary_large_image` twitter card — every public page title composed by a single root template. The reference SPA has none of this (verified: both files 404, no meta description) — the enhancement adds zero rendered-body markup, so visual parity is untouched |
| ❓ FAQ accordion | Native `<details>`/`<summary>` with rotating plus glyphs |
| ⚖️ Legal pages | `/privacy-policy` and `/accessibility-statement` with identical copy and layout |
| 🔐 Staff sign-in | `/login` — scrypt password verify + HMAC-signed httpOnly session cookie (7 days), login-rate-limited |
| 📊 Appointment dashboard | `/dashboard` — staff-only review surface: stats cards (total / new today / upcoming / top specialty) + a query bar (status filter, specialty filter, case-insensitive search — a native GET form, works without JS) + latest 100 requests with status transitions (New → Confirmed → Completed via `PATCH /api/appointments/[id]`) + a one-click CSV export that respects the active filters (`GET /api/appointments/export`, RFC 4180), server-guarded |
| 🛡️ Abuse controls | Per-key fixed-window rate limiting (5 / 10 min on appointments, 10 / 10 min on login — keyed on the LAST `X-Forwarded-For` token so proxies make it trustworthy), a 64 KiB body cap (413) enforced while STREAM-READING (chunked bodies without content-length are capped identically), strict server-side payload validation, and baseline security headers on every route response and app-level redirect (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, no `X-Powered-By`; the framework's internal 308 trailing-slash redirect is emitted before `headers()` applies — a documented, e2e-pinned limitation) |
| ✅ Tested | 169 unit tests + 63 Playwright e2e tests, including Tailwind v4 trap guards, title- and favicon-deviation pins, a dependency-contract pin, the full auth loop, rate-limit/429/413 pins on BOTH routes (stream-read body cap incl. chunked transports + transport-error tolerance), non-object-body tolerance pins, reduced-motion scroll pins, the email length bound (both routes), the security-header contract (route responses AND app-level redirects, with the framework-308 limitation pinned), the curated transport-failure message, the dashboard status-transition loop (New → Confirmed → Completed), the dashboard query layer (derived-allowlist parsing, filter/search/casefold pins, bogus-param dropping, the empty-filter state, export-respects-filter + RFC 4180 escaping + the spreadsheet formula-injection guard + duplicate-key first-wins + the UTF-8 BOM), the SEO surface pins (robots allow-all + no-Disallow, sitemap loc parity — every advertised loc fetches 200, canonical/OG/twitter head tags, og-image 1200×630 IHDR pin, the staff noindex metas; the expected baked origin is DERIVED from the build env so the suite is green under any `NEXT_PUBLIC_SITE_URL`), a secrets-hygiene pin (doc surfaces scanned for pasted key material — session-40), and the validation + timing-equalization + status + demo-seed + seo-composition + dashboard-filters seams |

> The reference app itself has no login or dashboard (its complete route
> table is `/`, `/privacy-policy`, `/accessibility-statement` — verified
> against its SPA bundle). The staff sign-in and appointment dashboard are
> an intentional, documented **extension beyond the reference**: they close
> the product loop the reference outsources (public form → validated API →
> SQLite persistence → staff review). Neither route is linked from the
> landing page, so the public experience stays byte-faithful.

## Architecture

| Layer | Technology | Version | Purpose |
| ----- | ---------- | ------- | ------- |
| Web framework | Next.js (App Router, standalone output) | 16.x | Pages, API routes, RSC composition |
| UI runtime | React | 19.x | Server + client components |
| Language | TypeScript (strict) | 5.x | Types throughout |
| Styling | Tailwind CSS (CSS-first `@theme inline`) | 4.x | Design tokens, utilities |
| Icons | lucide-react | 0.525.x | All iconography |
| Database | SQLite via Prisma ORM | 6.x | Appointment + staff persistence |
| Auth | Node crypto (scrypt + HMAC-SHA256) | built-in | Staff sessions — zero external auth dependencies |
| Unit tests | Vitest | 5.x | Pure seams (db-path resolution, auth crypto, appointment + status validation, rate limiting, dependency pin, demo seed, SEO composition, dashboard filters, secrets hygiene) |
| E2E tests | Playwright | 1.x | Landing, mobile nav, form, legal pages, auth loop, appointment status management, SEO surfaces, dashboard filters + CSV export |

```mermaid
flowchart TB
    B[Browser] -->|GET /| N[Next.js 16 App Router]
    B -->|POST /api/appointments| API[Route Handler]
    B -->|GET /api/health| API
    B -->|POST /api/auth/login + /logout| AUTH[Auth Handler]
    B -->|GET /login and /dashboard| N
    N --> S[(Static pages: /, /privacy-policy, /accessibility-statement, /login)]
    API --> V[Validation + rate limit]
    AUTH --> A[scrypt verify + session sign]
    V --> P[(Prisma Client)]
    A --> P
    P --> DB[(SQLite db/custom.db)]
```

## File Hierarchy

```
📂 src/
├── 📂 app/
│   ├── 📄 globals.css            ← Tailwind v4 theme: full hsl() tokens, pinned shadows, base element rules
│   ├── 📄 layout.tsx             ← DM Sans via next/font, metadata, viewport
│   ├── 📄 icon.svg               ← the reference's SVG favicon (vendored)
│   ├── 📄 sitemap.ts              ← /sitemap.xml — the 3 public routes (PUBLIC_PATHS-derived)
│   ├── 📄 robots.ts               ← /robots.txt — allow-all + sitemap reference (ADR-011)
│   ├── 📄 page.tsx               ← Landing composition (8 scroll sections + fixed header + footer)
│   ├── 📂 api/appointments/      ← POST — validated writes; [id]/ PATCH — staff status transitions;
│   │                               export/ GET — session-guarded CSV (session-34, ADR-012)
│   ├── 📂 api/auth/              ← POST login/logout — scrypt verify + session cookie
│   ├── 📂 api/health/            ← GET — liveness + DB probe
│   ├── 📂 login/                 ← Staff sign-in page (not linked from the landing page)
│   ├── 📂 dashboard/             ← Staff appointment dashboard (session-guarded RSC)
│   ├── 📂 privacy-policy/        ← Legal page
│   └── 📂 accessibility-statement/
├── 📂 components/site/           ← Header, Hero, About, Services, Differentiators,
│                                   Insurance, Team, Contact, AppointmentForm, Faq,
│                                   Footer, LegalPage, Reveal
├── 📂 components/dashboard/      ← LoginForm, LogoutButton, StatusButton (client islands)
└── 📂 lib/
    ├── 📄 content.ts             ← All site copy + icon maps + status labels (single source)
    ├── 📄 auth.ts                ← scrypt + HMAC session primitives (unit-tested)
    ├── 📄 validation.ts          ← Appointment + status validation seams (unit-tested)
    ├── 📄 rate-limit.ts          ← XFF keying, fixed-window limiter, 64 KiB body cap (unit-tested)
    ├── 📄 motion.ts              ← Reduced-motion-aware scroll behavior
    ├── 📄 db.ts                  ← Prisma singleton (env-resolved URL)
    ├── 📄 db-path.ts             ← SQLite path resolution (unit-tested)
    ├── 📄 seed-demo.ts            ← Demo dashboard rows (opt-in, unit-tested — session-28 F1)
    ├── 📄 seo.ts                  ← Metadata composition seam: brand, title template, OG image
    │                                 contract, PUBLIC_PATHS allowlist, pageMetadata factory
    │                                 (unit-tested — session-32, ADR-011)
    └── 📄 dashboard-filters.ts     ← The dashboard query seam: parse/filter/CSV/query-string
                                      (unit-tested — session-34, ADR-012)
📂 prisma/schema.prisma           ← Appointment + AdminUser models
📂 scripts/seed.ts                ← db:seed — staff account upsert; SEED_DEMO=1/--demo restores the 6 demo rows (opt-in, idempotent)
📂 tests/e2e/                     ← Playwright specs (mobile-navigation, landing,
│                                   appointment-form, appointments-status, legal-pages, auth,
│                                   seo — robots/sitemap/canonical/OG/og-image/noindex pins,
│                                   dashboard-filters — query-bar + CSV-export pins)
📂 tests/*.test.ts                ← Vitest seams (db-path, auth, deps, validation,
│                                   rate-limit, status, seed-demo, seo, dashboard-filters,
│                                   secrets)
📂 public/media/                  ← Hero video/poster, section photography
📂 public/og-image.png            ← Generated 1200×630 social card (session-32)
📂 docs/                          ← Validation report, screenshots, deployment
```

## Quick Start

Requires Node.js ≥ 20 (or Bun ≥ 1.1) and a C-compatible toolchain for
Prisma's SQLite engine.

```bash
bun install                # or npm install
cp .env.example .env       # defaults: SQLite at db/custom.db
bun run db:push            # create the schema
bun run db:seed            # create the staff login (ADMIN_EMAIL/PASSWORD)
SEED_DEMO=1 bun run db:seed   # optional: the 6 demo dashboard rows (dev only)
bun run dev                # http://localhost:3000
```

The demo seed is **opt-in** (session-28 F1): it restores the 6 realistic
appointment rows the dashboard screenshots show (2 new / 2 confirmed /
2 completed) — idempotently, with self-renewing future dates, and only
rows that are valid public-API payloads by construction
(`src/lib/seed-demo.ts`, unit-tested). Production seeding never runs it.

Verify setup:

```bash
curl http://localhost:3000/api/health
# {"ok":true,"database":"up"}
```

Staff sign-in: open `http://localhost:3000/login` and use the
`ADMIN_EMAIL` / `ADMIN_PASSWORD` from your `.env` (dotenv gotcha: a value
starting with `$` must be escaped as `\$`).

### Appointment API

| Endpoint | Method | Body / Response | Notes |
| -------- | ------ | --------------- | ----- |
| `/api/appointments` | POST | `{fullName, phone, email?, specialty, preferredDate?}` → `201 {ok, id}` | 422 with field map on invalid input (non-object bodies get the same field map; email capped at 254 chars); 413 over 64 KiB (stream-read cap — holds for chunked bodies AND transport errors degrade to 400); 429 when rate-limited (5 req / 10 min / IP) |
| `/api/health` | GET | `200 {ok, database}` | 503 when the DB is unreachable |
| `/api/auth/login` | POST | `{email, password}` → `200 {ok}` + httpOnly session cookie | 401 generic error (no user enumeration); 422 field map (email pattern + the shared 254-char bound); 429 rate-limited (10 / 10 min / IP) |
| `/api/appointments/[id]` | PATCH | `{status}` → `200 {ok, id, status}` (staff session required) | 401 anonymous; 422 field map (status allowlist: new/confirmed/completed); 404 unknown id; 413 over 64 KiB; 429 rate-limited (60 / 10 min / IP) |
| `/api/appointments/export` | GET | `text/csv` attachment (staff session required) — RFC 4180 rows respecting the ACTIVE dashboard filters (`?status=&specialty=&search=`) | 401 anonymous (before any DB read); 429 rate-limited (60 / 10 min / IP); ISO 8601 dates + raw status values; filename `appointments-<date>.csv`; spreadsheet formula-injection guard (session-36): cells leading with `= + - @` tab CR gain the apostrophe text-marker — values still display verbatim in Excel/LibreOffice/Sheets but never evaluate; UTF-8 BOM prefix (session-38): Excel double-click decodes BOM-less UTF-8 CSV as ANSI, mojibake-ing non-ASCII patient names — the signature makes UTF-8 auto-detected (exactly once, before the header row; transparent to LibreOffice/Sheets) |
| `/api/auth/logout` | POST | → `200 {ok}` | Clears the session cookie; idempotent |

## Environment Variables

```bash
DATABASE_URL="file:../db/custom.db"   # relative to prisma/schema.prisma
NEXT_PUBLIC_SITE_URL=http://localhost:3000   # canonical origin — canonical/OG/sitemap URLs
                                      # resolve against it at BUILD time; set it in production
                                      # or those tags advertise localhost (ADR-011)
AUTH_SECRET=""                        # HMAC key for staff sessions (REQUIRED in production)
ADMIN_EMAIL="admin@example.com"       # seeded by bun run db:seed
ADMIN_PASSWORD="change-me"            # seeded by bun run db:seed (escape $ as \$)
```

The `dev` / `build` / `db:*` scripts strip any ambient `DATABASE_URL`
(`env -u`) so a stray exported shell variable can never shadow the repo
`.env`; the production `start` script deliberately keeps ambient env
(see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)).

## Testing

```bash
bun run lint          # ESLint (flat config) — 14 correctness rules ON, every deliberate off documented
bun run typecheck     # tsc --noEmit (true strict)
bun run test          # Vitest unit layer (db-path + auth + deps + validation + rate-limit + status + seed-demo + seo + dashboard-filters + secrets seams)
bun run build         # production standalone build (types enforced)
bun run test:e2e      # Playwright — boots the standalone server + scratch DB
```

The e2e layer deserves a note: `tests/e2e/mobile-navigation.spec.ts` pins
the mobile menu contract AND guards the documented Tailwind v4 traps by
rasterizing the rendered pixel of the nav pill and dropdown (a bare-HSL
theme regression would collapse them to transparent). The
`seo` spec pins the discoverability surfaces (robots allow-all + the
absent Disallow, sitemap loc parity — every advertised `<loc>` fetches
200 after the LL-11 host rewrite, canonical/OG/twitter head tags, the
og-image 1200×630 IHDR dimensions, and the staff noindex metas). The
`dashboard-filters` spec pins the query layer (the derived select
options, filter/search/case-insensitivity, bogus-param dropping, the
empty-filter state, and the CSV export — filter-respecting, RFC 4180
quoting, session-guarded).

## Design System

| Token | Value | Usage |
| ----- | ----- | ----- |
| `--background` | `hsl(205 50% 96%)` | Page background |
| `--foreground` / `--primary` | `hsl(151 32% 22%)` | Deep clinic green (text, buttons) |
| `--primary-foreground` | `hsl(50 58% 88%)` | Warm sand on primary |
| `--secondary` | `hsl(49 62% 82%)` | Footer tan |
| `--accent` | `hsl(205 42% 91%)` | About card right rail, team cards |
| `--service-gradient-*` | cream → blush → gold | Services + team bands (sRGB interpolation) |
| `--radius` | `1.25rem` | Base radius (cards use `rounded-[24px]`/`[28px]`) |
| `--shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | Pinned to the v3 geometry (v4 scale-shift guard) |

Typography: **DM Sans** (400/500/600/700) via `next/font`. Headings are
forced to weight 400 and fixed scales (h2 48px → 60px at `sm+`, h3 20px)
by the ported base layer — matching the reference exactly.

## Screenshots

| View | File |
| ---- | ---- |
| Desktop hero | [docs/screenshots/01-desktop-hero.png](docs/screenshots/01-desktop-hero.png) |
| Desktop sections | [docs/screenshots/02-desktop-*.png](docs/screenshots/) |
| Full page | [docs/screenshots/03-desktop-full.png](docs/screenshots/03-desktop-full.png) |
| Mobile hero / menu | [docs/screenshots/04-mobile-hero.png](docs/screenshots/04-mobile-hero.png), [05-mobile-menu-open.png](docs/screenshots/05-mobile-menu-open.png), [06-mobile-services.png](docs/screenshots/06-mobile-services.png) |
| Appointment flow | [docs/screenshots/09-appointment-form.png](docs/screenshots/09-appointment-form.png), [10-appointment-success.png](docs/screenshots/10-appointment-success.png), [14-appointment-field-errors.png](docs/screenshots/14-appointment-field-errors.png) |
| Legal pages | [docs/screenshots/07-privacy-policy.png](docs/screenshots/07-privacy-policy.png), [08-accessibility-statement.png](docs/screenshots/08-accessibility-statement.png) |
| Staff sign-in | [docs/screenshots/11-login-desktop.png](docs/screenshots/11-login-desktop.png) |
| Appointment dashboard | [docs/screenshots/12-dashboard-desktop.png](docs/screenshots/12-dashboard-desktop.png), [13-dashboard-mobile.png](docs/screenshots/13-dashboard-mobile.png), [15-dashboard-mobile-390-full.png](docs/screenshots/15-dashboard-mobile-390-full.png) |

## Deployment

The app builds to a self-contained standalone server. See
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full runbook; the short
version:

```bash
bun run build
bun .next/standalone/server.js   # PORT + DATABASE_URL from the environment
```

## Troubleshooting

| Issue | Cause | Fix |
| ----- | ----- | --- |
| Nav pill / mobile menu renders transparent | Bare HSL triplet in `@theme inline` (v4 trap #1) | Keep full `hsl(...)` values in `:root` |
| Unhydrated page when opened via `127.0.0.1` | Next 16 dev-origin protection | `allowedDevOrigins` is set in `next.config.ts` — keep it |
| `space-y-*` gaps differ from the reference | v4 `:where()` selector rewrite (trap #4) | Prefer grid/flex gaps, or pad children directly |
| e2e color assertions fail on format | v4 computes opacity modifiers as `oklab(...)` | Rasterize pixels (see mobile-navigation spec), don't string-match |
| Data lands in the wrong `custom.db` | An ambient `DATABASE_URL` env var shadows the repo `.env` | The `dev`/`build`/`db:*` scripts `env -u` it away; `start` (production) intentionally reads ambient env |
| `db:seed` says credentials are missing | dotenv interpolated a leading `$` in the password to `""` | Escape it in `.env`: `ADMIN_PASSWORD="\$<your-password>"` (keep doc examples as obvious placeholders — realistic-looking ones get adopted as live credentials) |
