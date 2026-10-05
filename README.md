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
| ❓ FAQ accordion | Native `<details>`/`<summary>` with rotating plus glyphs |
| ⚖️ Legal pages | `/privacy-policy` and `/accessibility-statement` with identical copy and layout |
| 🛡️ Abuse controls | Per-IP fixed-window rate limiting (5 / 10 min) and strict server-side payload validation |
| ✅ Tested | 15 unit tests + 22 Playwright e2e tests, including Tailwind v4 trap guards |

## Architecture

| Layer | Technology | Version | Purpose |
| ----- | ---------- | ------- | ------- |
| Web framework | Next.js (App Router, standalone output) | 16.x | Pages, API routes, RSC composition |
| UI runtime | React | 19.x | Server + client components |
| Language | TypeScript (strict) | 5.x | Types throughout |
| Styling | Tailwind CSS (CSS-first `@theme inline`) | 4.x | Design tokens, utilities |
| Icons | lucide-react | 0.525.x | All iconography |
| Database | SQLite via Prisma ORM | 6.x | Appointment persistence |
| Unit tests | Vitest | 5.x | Pure seams (db-path resolution) |
| E2E tests | Playwright | 1.x | Landing, mobile nav, form, legal pages |

```mermaid
flowchart TB
    B[Browser] -->|GET /| N[Next.js 16 App Router]
    B -->|POST /api/appointments| API[Route Handler]
    B -->|GET /api/health| API
    N --> S[(Static pages: /, /privacy-policy, /accessibility-statement)]
    API --> V[Validation + rate limit]
    V --> P[(Prisma Client)]
    P --> DB[(SQLite db/custom.db)]
```

## File Hierarchy

```
📂 src/
├── 📂 app/
│   ├── 📄 globals.css            ← Tailwind v4 theme: full hsl() tokens, pinned shadows, base element rules
│   ├── 📄 layout.tsx             ← DM Sans via next/font, metadata, viewport
│   ├── 📄 page.tsx               ← Landing composition (9 sections)
│   ├── 📂 api/appointments/      ← POST — validated writes
│   ├── 📂 api/health/            ← GET — liveness + DB probe
│   ├── 📂 privacy-policy/        ← Legal page
│   └── 📂 accessibility-statement/
├── 📂 components/site/           ← Header, Hero, About, Services, Differentiators,
│                                   Insurance, Team, Contact, AppointmentForm, Faq,
│                                   Footer, LegalPage, Reveal
└── 📂 lib/
    ├── 📄 content.ts             ← All site copy + icon maps (single source)
    ├── 📄 db.ts                  ← Prisma singleton (env-resolved URL)
    └── 📄 db-path.ts             ← SQLite path resolution (unit-tested)
📂 prisma/schema.prisma           ← Appointment model
📂 tests/e2e/                     ← Playwright specs (mobile-navigation, landing, …)
📂 public/media/                  ← Hero video/poster, section photography
📂 docs/                          ← Validation report, screenshots, deployment
```

## Quick Start

Requires Node.js ≥ 20 (or Bun ≥ 1.1) and a C-compatible toolchain for
Prisma's SQLite engine.

```bash
bun install                # or npm install
cp .env.example .env       # defaults: SQLite at db/custom.db
bun run db:push            # create the schema
bun run dev                # http://localhost:3000
```

Verify setup:

```bash
curl http://localhost:3000/api/health
# {"ok":true,"database":"up"}
```

### Appointment API

| Endpoint | Method | Body / Response | Notes |
| -------- | ------ | --------------- | ----- |
| `/api/appointments` | POST | `{fullName, phone, email?, specialty, preferredDate?}` → `201 {ok, id}` | 422 with field map on invalid input; 429 when rate-limited (5 req / 10 min / IP) |
| `/api/health` | GET | `200 {ok, database}` | 503 when the DB is unreachable |

## Environment Variables

```bash
DATABASE_URL="file:../db/custom.db"   # relative to prisma/schema.prisma
NEXT_PUBLIC_SITE_URL=http://localhost:3000   # canonical origin for metadata
```

## Testing

```bash
bun run lint          # ESLint (flat config)
bun run typecheck     # tsc --noEmit
bun run test          # Vitest unit layer (db-path contract)
bun run build         # production standalone build
bun run test:e2e      # Playwright — boots the standalone server + scratch DB
```

The e2e layer deserves a note: `tests/e2e/mobile-navigation.spec.ts` pins
the mobile menu contract AND guards the documented Tailwind v4 traps by
rasterizing the rendered pixel of the nav pill and dropdown (a bare-HSL
theme regression would collapse them to transparent).

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
| Mobile hero / menu | [docs/screenshots/04-mobile-hero.png](docs/screenshots/04-mobile-hero.png), [05-mobile-menu-open.png](docs/screenshots/05-mobile-menu-open.png) |
| Appointment flow | [docs/screenshots/09-appointment-form.png](docs/screenshots/09-appointment-form.png), [10-appointment-success.png](docs/screenshots/10-appointment-success.png) |
| Legal pages | [docs/screenshots/07-privacy-policy.png](docs/screenshots/07-privacy-policy.png), [08-accessibility-statement.png](docs/screenshots/08-accessibility-statement.png) |

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
