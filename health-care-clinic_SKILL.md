---
name: health-care-clinic
description: >
  Comprehensive engineering skill for the Green Grove Family Clinic
  codebase — a pixel-faithful Next.js 16 reconstruction of a Tailwind-v3
  Vite SPA reference, with a validated appointment backend and a
  dependency-free staff auth/dashboard extension. Captures the
  reference-parity doctrine, the six documented Tailwind v4 engine traps
  and their mitigations, the environment-determinism guards, the testing
  methodology, and every hard-won lesson from sessions 1, 2, 4, 6, 8, 10,
  12, 14, 16, 18, 20, 22, 24, 26 and 28.
version: 2.8.5
last_updated: 2026-10-06
project_state: 107 unit tests + 44 e2e tests green; appointment status management live (PATCH /api/appointments/[id], session-guarded + rate-limited 60/10min + allowlisted via the content-derived status seam; dashboard New→Confirmed→Completed); demo-seed closed at the root (session-28 F1: `SEED_DEMO=1 bun run db:seed` / `--demo` restores the 6 realistic dashboard rows — opt-in so production seeding never creates patient rows, idempotent (skip-if-exists by fullName — re-runs never duplicate or clobber real status transitions), self-renewing dates (now + offsetDays — the S26 F4 anti-erosion doctrine applied to seed data), specialties/statuses from the API's derived allowlists, every row a valid public-API payload by construction via the unit-tested src/lib/seed-demo.ts seam — the 4×-recurred workspace-reset seed-row class is dead); HTTP edge fully closed (stream-read 64 KiB cap for every transport shape incl. chunked, transport-error tolerance — client aborts degrade to 400, non-object body tolerance on all three POST/PATCH routes, async scrypt with preserved timing equalization, last-token XFF rate limiting, impossible-date rejection, email bound at 254 on BOTH routes); baseline security headers on every route response and app-level redirect (nosniff / X-Frame-Options DENY / Referrer-Policy, X-Powered-By suppressed; the framework's internal 308 trailing-slash redirect is the documented, e2e-pinned exception); env-leak guard active (env -u); lint gate honest (14 correctness rules ON, every off documented, the no-html-link-for-pages blind spot recorded); e2e per-run keys pid-derived on EVERY request incl. browser-driven POSTs/PATCHes via page.route injection AND the malformed-payload login POST (structurally collision-proof, unknown bucket never touched — the session-20 F1 closure made this literally true for every request in the suite); vitest.config.mts (native ESM load, no Vite CJS warning); db-path module-anchor decode-hardened (session-22 F10: moduleSelfRoot decodes %-escaped URLs — a repo path with spaces/#/non-ASCII no longer silently skips the anchor); credential hygiene closed (session-22 F1: doc escaping-examples are OBVIOUS PLACEHOLDERS so no bootstrap can adopt them as the live password); favicon chrome parity closed (session-24 F2: the reference's inline SVG favicon vendored verbatim as src/app/icon.svg — App Router file convention, e2e-pinned; the reference's /favicon.ico 302 fallback deliberately not replicated, platform artifact); e2e time-erosion closed (session-26 F4: the impossible-dates pin now computes future-year literals — its rollover targets are always future so only the round-trip check can reject them; the pin failed Red-first against a deliberately-broken seam, and the 2025 literals it replaced had eroded to tautology once they fell into the past)
---

# Green Grove Family Clinic — Engineering Skill

> **Purpose:** Everything a future coding agent needs to extend, debug,
> onboard to, or replicate this codebase without re-learning its traps the
> hard way. Every claim in this document is verifiable against the source
> tree; every trap has either a test or a script guarding it.

---

## §1. Project Identity & Design Philosophy

**What it is:** a production-grade, pixel-faithful clone of
`https://health-care-clinic.base44.app/` (a Vite React SPA compiled with
**Tailwind CSS v3**) rebuilt on **Next.js 16 App Router + React 19 +
TypeScript strict + Tailwind CSS v4 (CSS-first) + Prisma/SQLite**.

**The defining constraint — rendering parity under a different CSS engine:**
every visible element's computed metrics must match the reference (page
height **7490px** at 1440×900, identical heading scales, card geometry,
panel styling). Class strings are ported verbatim from the reference unless
a documented engine trap forces a change — and then the change is recorded
in `docs/Tailwind-V4-Validation-Report.md` and the PAD's ADR log.

**The doctrine in one line:** *never guess a value that can be measured;
never "clean up" a cascade asymmetry that reproduces the reference.*

**Beyond-parity extension (ADR-009):** the reference app verifiably has NO
login or dashboard (its SPA bundle's route table is exactly `/`,
`/privacy-policy`, `/accessibility-statement` + 404). This repo adds a
staff `/login` + `/dashboard` pair — scrypt + HMAC cookie auth, stats
cards, latest-100 requests table — kept **unlinked from the landing page**
so the public experience stays byte-faithful, with `robots: noindex`.

**Public surfaces:** `/` (8-section scroll narrative + fixed header +
footer), `/privacy-policy`,
`/accessibility-statement`, `POST /api/appointments`, `GET /api/health`.
**Staff surfaces:** `/login`, `/dashboard`, `POST /api/auth/login`,
`POST /api/auth/logout`, and the session-guarded
`PATCH /api/appointments/[id]` status-transition write path.

**Recorded title deviation:** the reference's `<title>` is the Base44
platform placeholder `"Base44 APP"`; this repo deliberately uses semantic
per-route titles (SEO/a11y win over a platform artifact — recorded in the
validation report, pinned by `toHaveTitle` e2e assertions).

**Favicon chrome parity (session-24 F2):** the reference serves an inline
SVG favicon (heart-rate glyph, clinic green) via `<link rel="icon"
type="image/svg+xml">`; the glyph is vendored verbatim as
`src/app/icon.svg` (App Router file convention — the link tag is
auto-generated) and e2e-pinned. The reference's `/favicon.ico` 302 →
logo.png fallback is a platform artifact serving a different image and is
deliberately not replicated (see the Validation Report deviation entry).

---

## §2. Tech Stack & Environment

| Layer | Technology | Locked version | Notes |
| ----- | ---------- | -------------- | ----- |
| Web framework | Next.js (App Router, standalone output) | `^16.1.1` (16.3.8 installed) | Turbopack dev + build |
| UI runtime | React | `^19.0.0` | Server Components by default |
| Language | TypeScript (strict) | `^5` | `tsc --noEmit` clean |
| Styling | Tailwind CSS v4, CSS-first `@theme inline` | `^4` | **NO tailwind.config.js** |
| Icons | lucide-react | `^0.525.0` | Only icon library |
| ORM / DB | Prisma + SQLite | `^6.11.1` | `db/custom.db` at repo root |
| Auth | Node built-in crypto (scrypt + HMAC-SHA256) | — | Zero auth dependencies (ADR-008) |
| Unit tests | Vitest | `^5.0.1` | `*.test.ts` only |
| E2E tests | Playwright | `^1.63.0` | `*.spec.ts`, single worker |
| Runtime | Bun | ≥ 1.1 (1.3.x) | npm-compatible |

**Environment variables (see `.env.example`):**

| Variable | Where used | Contract |
| -------- | ---------- | -------- |
| `DATABASE_URL` | Prisma + `src/lib/db-path.ts` | Relative `file:` URLs resolve against the repo owning `prisma/schema.prisma`; production uses ABSOLUTE |
| `NEXT_PUBLIC_SITE_URL` | Metadata | Canonical origin |
| `AUTH_SECRET` | `src/lib/auth.ts` | HMAC session key; required in production (signing throws); dev falls back + warns |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `scripts/seed.ts` | Seed inputs; **escape a leading `$` as `\$`** |

---

## §3. Bootstrapping & Configuration

```bash
bun install
cp .env.example .env          # then set AUTH_SECRET + ADMIN_* values
bun run db:push               # schema -> db/custom.db
bun run db:seed               # staff account upsert (scrypt-hashed)
SEED_DEMO=1 bun run db:seed   # optional: 6 demo dashboard rows (dev only —
                              # session-28 F1: opt-in, idempotent, self-renewing
                              # dates, valid API payloads by construction)
bun run dev                   # http://localhost:3000 (logs to dev.log)
```

**Verification gate (before ANY push):**

```bash
bun run lint && bun run typecheck && bun run test && bun run build
bun run test:e2e              # requires the build above
```

**Env-determinism guard (ADR-010):** the `dev`, `build`, `db:push`,
`db:migrate`, `db:reset`, `db:seed` scripts all prefix
`env -u DATABASE_URL`. Reason: process env beats dotenv — an ambient
exported `DATABASE_URL` (dev sandbox shells do this) silently redirects
writes to a database OUTSIDE the repo. The production `start` script
deliberately KEEPS ambient env (DEPLOYMENT.md §4 injects an absolute URL
there). **Do not remove the `env -u` guards.**

**Config invariants:**

- `next.config.ts`: `allowedDevOrigins: ["127.0.0.1"]` (Next 16 silently
  blocks dev chunks on that origin — symptom: unhydrated page) and
  `devIndicators: false` (clean screenshots). `outputFileTracingRoot`
  pinned to repo root for the standalone trace.
- `tsconfig.json` / `eslint.config.mjs`: both **exclude `skills/`** — the
  repo's skills folder is documentation, never compiled, linted or tested.
- `vitest.config.mts` matches `*.test.ts` only; `playwright.config.ts`
  `testDir: tests/e2e` — no double-pickup between layers. (Renamed from
  `.ts` in session-20 F4: with no `"type"` field in package.json a `.ts`
  config loads as CommonJS and Vite warns about ESM syntax; `.mts`
  loads natively — warning gone.)

---

## §4. The Design System (Code-First)

All tokens live in `src/app/globals.css` under `@theme inline`, referencing
`:root` / `.dark` custom properties. **Full `hsl()` values only** — a bare
triplet (`205 50% 96%`) silently resolves to *transparent* under
`@theme inline` (v4 Trap #1; the mobile-nav e2e spec rasterizes the nav
pill pixel specifically to guard this).

| Token | Value | Usage |
| ----- | ----- | ----- |
| `--background` | `hsl(205 50% 96%)` | Page background |
| `--foreground` / `--primary` | `hsl(151 32% 22%)` | Deep clinic green |
| `--primary-foreground` | `hsl(50 58% 88%)` | Warm sand on primary |
| `--hero-foreground` | `hsl(0 0% 100%)` | White over hero video |
| `--secondary` | `hsl(49 62% 82%)` | Footer tan |
| `--muted` / `--muted-foreground` | `hsl(203 28% 90%)` / `hsl(153 18% 35%)` | Quiet surfaces/text |
| `--accent` | `hsl(205 42% 91%)` | About rail, team cards |
| `--card` | `hsl(54 38% 98%)` | Card cream |
| `--service-gradient-top/middle/bottom` | cream → blush → gold | Services/team bands (sRGB!) |
| `--radius` | `1.25rem` | Cards use `rounded-[24px]`/`[28px]` |
| `--shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | **Pinned to v3 geometry** (Trap #5) |

**The load-bearing unlayered cascade (do not "clean up"):** globals.css
ports the reference's base rules OUTSIDE any `@layer`:
`h1–h6 { font-weight: 400 !important }`, `h2 { font-size: 3rem/3.75rem
!important; line-height: 1.05 !important }`, `h3 { font-size: 20px
!important; line-height: 1.25 !important }`. These intentionally override
type utilities (`text-7xl` on an h2 is a visual no-op — exactly like the
reference). Unlayered so `!important` utilities (`text-2xl!` on legal
pages) still win. The mobile `body, p { font-size: 14px }` rule is the
opposite: IN `@layer base` so non-important utilities beat it. The
asymmetry reproduces the reference's specificity cascade.

**Custom classes:** `.hero-readability-gradient`
(`linear-gradient(90deg,#123f5c94,#b55b2742 34%,#b55b2700 66%)`),
`.about-subtitle`, `.section-subtitle`, `.reveal` states scoped to
`@media (scripting: enabled)`, `@keyframes heartbeat` (ECG ping-pong) and
`badge-enter`.

---

## §5. Component Architecture & Patterns

```
src/app/                     routes + globals.css (the design system)
src/app/icon.svg             the reference's SVG favicon, vendored (S24 F2)
src/app/api/appointments/    POST — validation + rate limit + Prisma insert
src/app/api/appointments/[id]/ PATCH — staff status transitions (session-guarded)
src/app/api/auth/login|logout/  POST — scrypt verify + cookie set/clear
src/app/api/health/          GET — SELECT 1 probe
src/app/login|dashboard/     staff pages (noindex, unlinked from landing)
src/components/site/         13 components: one per landing section
                             + Reveal + LegalPage
src/components/dashboard/    LoginForm + LogoutButton + StatusButton
                             (client islands)
src/lib/content.ts           ALL copy, icon maps, nav contracts (as const)
src/lib/auth.ts              scrypt + HMAC session primitives (pure)
src/lib/validation.ts        appointment payload validation seam (pure)
src/lib/rate-limit.ts        clientKey + fixed-window limiter + body cap (pure)
src/lib/db.ts                Prisma singleton (globalThis in dev)
src/lib/db-path.ts           SQLite URL resolution (pure, tested)
scripts/seed.ts              db:seed staff upsert (the ONLY script — the
                             ORBITAL-era probe scripts were removed in S6);
                             opt-in SEED_DEMO=1/--demo mode restores the 6
                             demo dashboard rows (session-28 F1)
src/lib/seed-demo.ts          demo-row builder seam (pure, unit-tested —
                             self-renewing dates, derived specialties)
```

**Client-island discipline:** Server Components by default; `"use client"`
only for Header (menu + scroll-spy), Hero (rotating badge),
AppointmentForm (submit states), Reveal (observer), LoginForm,
LogoutButton and StatusButton. No global store — local `useState` only.

**Header contract (pinned by e2e):** mobile dropdown is a **GRID**, not
`space-y` (Trap #4); trigger is a real `<button>` with `aria-expanded` /
`aria-controls` / label swap; Escape and outside-pointer close; link
activation closes + native jump; breakpoints symmetrical (`hidden lg:flex`
vs `lg:hidden`). Scroll-spy marks the LAST nav-tracked section whose top
crossed mid-viewport; `pastHero` flips the logo color at
`scrollY >= innerHeight`.

**Reveal choreography (hydration-safe):** server and client render the
SAME initial `data-reveal="hidden"` markup; hiding CSS is scoped to
`@media (scripting: enabled)` so no-JS/crawler HTML is visible. Never
initialize from `typeof IntersectionObserver` — that's the exact hydration
mismatch this design avoids.

**Dashboard guard pattern:** `/dashboard` is a Server Component:
`cookies()` → `verifySession(token)` → `redirect("/login")` when invalid →
re-check the admin row exists (deleting the account revokes outstanding
cookies) → then `Promise.all` the stats queries.

---

## §6. State & Interaction Patterns (no custom hooks)

This codebase deliberately has **zero custom hooks** — interactions are
small enough to live inline. The three canonical patterns:

1. **Submit-state machine** (AppointmentForm, LoginForm):
   `"idle" | "sending" | "success" | "error"` local state; disable +
   in-flight label while requesting; terminal state replaces or annotates
   the form; failure keeps user input.
2. **Chrome-state effect** (Header): ONE passive scroll listener drives
   both `pastHero` and `activeSection`; initial state computed by invoking
   the handler once in the effect (not from `typeof window` checks — see
   Reveal note in §5).
3. **Logout island** (LogoutButton): POST logout → `router.replace` +
   `router.refresh` so the Server Component guard re-runs.

ESLint runs `react-hooks/set-state-in-effect` — restructure rather than
silence it (the Reveal component shows the accepted pattern).

---

## §7. Content Management

All user-facing copy lives in `src/lib/content.ts` as `as const` tuples:
section copy, service cards, team members, insurance partners, FAQ items,
footer facts, nav links, and the icon name → lucide component maps.
**Never inline copy edits into components** — change `content.ts`.

**Section-id contract (public API):** `#top #about #services #insurance
#providers #contact #faq` — nav links, scroll-spy thresholds, CTA scroll
targets and e2e specs all bind to these.

**Media:** vendored from the reference CDN into `public/media/`
(hero-video.mp4 11.4MB H.264, hero-poster.webp, about/contact/team webps).
No runtime external requests.

---

## §8. Accessibility Implementation

- Mobile menu: full ARIA contract (`aria-expanded`, `aria-controls`,
  label swap Open/Close, Escape restores focus to the trigger).
- FAQ: native `<details>/<summary>` with rotating plus glyph.
- Forms: accessible names via real `<label>` wrapping (the staff login
  form) and `aria-label` (the public appointment form — a verbatim parity
  port of the reference markup); e2e asserts `getByLabel` against both.
  `role=alert` errors, `aria-live` regions on success states.
- Dashboard table: `<th scope="col">` headers, `<td>` alignment.
- Focus states: v4 default ring tokens; nothing suppressed.
- `viewport-fit=cover` + `themeColor` for notched devices.
- Login/dashboard carry `robots: {index: false, follow: false}`.

---

## §9. Anti-Patterns & Common Bugs (the trap log)

The six documented Tailwind v3 → v4 engine variances — all mitigated here:

1. **Bare-HSL theme transparency:** `@theme inline` tokens referencing
   bare triplets resolve to transparent. Mitigation: full `hsl()` values
   in `:root`; e2e rasterizes the nav pill pixel as a regression guard.
2. **Palette/oklch drift:** v4 default palette converts through oklch —
   pin `--shadow-sm` to the v3 geometry; tolerate ±1/255 on
   opacity-modified colors (oklab roundtrip quantization).
3. **oklab gradient interpolation:** `bg-gradient-to-*` interpolates in
   oklab in v4. Mitigation: arbitrary sRGB form
   `bg-[linear-gradient(to_bottom,…)]` for the services/team gradients.
4. **`space-y-*` selector rewrite:** v4 uses `:where()` + margin-block-end
   with zero specificity — a child's `mt-*` WINS, changing spacing.
   Mitigation: grid/flex gaps + per-child padding for stacked UI (the
   mobile menu is a grid for exactly this reason).
5. **Shadow scale shift:** v4 inserted `shadow-xs` at v3's `shadow-sm`
   geometry. Mitigation: `--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05)` in
   `@theme inline`.
6. **Next 16 dev-origin blocking:** `127.0.0.1` origin silently loses dev
   chunks. Mitigation: `allowedDevOrigins: ["127.0.0.1"]`.

Plus the environment/process traps (both bit this project for real):

7. **Ambient env beats dotenv:** an exported `DATABASE_URL` shadows the
   repo `.env`; writes silently land outside the repo. Mitigation:
   `env -u DATABASE_URL` on dev/build/db scripts (ADR-010).
8. **dotenv `$` interpolation:** `ADMIN_PASSWORD="$<your-password>"` (a
   placeholder, never a real-looking value) resolves to `""` — the seed
   failed on this exact shape. Mitigation: escape `\$`. Session-22 F1:
   keep doc examples as obvious placeholders — a realistic-looking example
   gets adopted as the live credential by fresh bootstraps.
9. **Important-modifier syntax moved:** v3 `!text-sm` → v4 suffix
   `text-sm!`.
10. **v4 standalone `rotate`/`scale`/`translate` properties:** computed-
    style assertions must read the right property (FAQ glyph rotation is
    `rotate: 45deg`, NOT `transform`).

---

## §10. Debugging Guide

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| Nav pill / mobile menu transparent | Bare HSL triplet (Trap 1) | Restore full `hsl()` values in `:root` |
| Unhydrated page via `127.0.0.1` | Next 16 origin block | Keep `allowedDevOrigins` |
| `space-y` gaps differ from reference | Trap 4 rewrite | Grid/flex gaps or pad children |
| e2e color assertion fails on FORMAT | oklab vs rgba strings | Rasterize pixels, never string-match |
| Writes land in the wrong `custom.db` | Ambient `DATABASE_URL` | Keep `env -u` guards; check `/proc/<pid>/environ` |
| `db:seed` reports missing credentials | dotenv ate a leading `$` | Escape as `\$` in `.env` |
| e2e `getByRole("alert")` matches 2 elements | Next route announcer also has role=alert | Scope: `page.locator("form").getByRole("alert")` |
| e2e strict-mode duplicate matches | `db/e2e.db` persists rows across runs | Use unique values per run (see auth.spec.ts) |
| Login always 401 in a fresh env | Admin not seeded there | Run `bun run db:seed` (or e2e global-setup) |
| Dashboard renders but no data | Query raced a redirect? | Guard order: session → admin row → queries |

**Read `dev.log` after any dev-server work** — hydration errors and failed
API calls surface there. API failures log structured messages
(`[api/appointments] persistence failed`) and never log PII payloads.

---

## §11. Pre-Ship Checklist

```bash
bun run lint          # 0 errors
bun run typecheck     # clean (TRUE strict: noImplicitAny enforced)
bun run test          # 107/107 (db-path 19 + auth 19 + deps 4 +
                      #  validation 27 + rate-limit 20 + status 10 +
                      #  seed-demo 8)
bun run build         # OK; routes: / /login /privacy-policy /
                      # accessibility-statement static; /api/* /dashboard dynamic
bun run test:e2e      # 44/44 (6 spec files)
```

Manual smoke: mobile menu open → link click (closes + jumps) → Escape
(focus restored); appointment form happy path; login → dashboard shows the
new row; anonymous `/dashboard` → 307 to `/login`; `GET /api/health` →
`{"ok":true,"database":"up"}`.

Git: Conventional Commits, `main` only, never commit `.env` / `db/*.db` /
keys; push via `docs/ssh_git_wrapper_v3.py` (runbook:
`docs/how-to-git-push-using-ssh-wrapper_SKILL.md`).

---

## §12. Lessons Learnt (sessions 1 & 2)

1. **Measure the reference before writing markup.** Session 1's biggest
   wins came from extracting computed styles/DOM from the live site —
   the hidden unlayered heading cascade (h1–h6 forced to 400) was found
   only by measuring, and it overrode every type utility.
2. **Hydration safety is a server/client CONTRACT, not a client fix.**
   The Reveal `scripting: enabled` pattern renders identical initial
   markup on both sides.
3. **e2e colors must be rasterized, not string-compared** — v4's oklab
   computed formats make string equality a false-negative factory.
4. **An in-memory rate limiter resets with the process** — fine for this
   single-process deployment shape; wrong under horizontal scaling.
5. **A sandbox's ambient env can silently hijack dotenv** — fix entry
   points (`env -u`), not symptom files (ADR-010).
6. **dotenv interpolation is a security-adjacent footgun** — a `$`-leading
   password becomes empty WITHOUT an error; document + escape.
7. **Route-table extraction beats URL probing** — downloading the
   reference SPA bundle and reading `path:"…"` entries definitively
   settled the "is there a login?" question (there isn't).
8. **Test data accumulates in a persistent scratch DB** — unique-per-run
   values or strict-mode violations; the auth spec shows the pattern.
9. **Playwright's CJS transpiler can't resolve app aliases** — the
   global-setup seeds via `prisma db execute` + inline node:crypto rather
   than importing `@/lib/auth`.

---

## §13. Pitfalls to Avoid

- Do NOT "clean up" the unlayered heading rules or move them into
  `@layer base` — the cascade asymmetry is the parity.
- Do NOT replace the mobile menu's grid with `space-y` (Trap 4).
- Do NOT remove `env -u DATABASE_URL` from the scripts (Trap 7).
- Do NOT assert computed color strings (oklab formats) — rasterize.
- Do NOT assert hover paint in touch-emulating headless browsers (v4
  wraps `hover:` in `@media (hover: hover)`).
- Do NOT add an auth library for the single-account staff surface —
  the Node-crypto seam is ADR-008.
- Do NOT link `/login` from the landing page — public parity is the
  contract (ADR-009).
- Do NOT echo submitted PII back in API responses or log it.
- Do NOT initialize client state from `typeof window`/`typeof
  IntersectionObserver` — hydration mismatch.
- Do NOT run lint/typecheck/tests against `skills/` — excluded by config.

---

## §14. Best Practices

- Port class strings verbatim; record every forced deviation.
- Centralize copy in `content.ts`; icons via the name→component maps.
- Manual validation in route handlers (no schema library) — fixed-window
  in-memory rate limits, generic auth errors (no user enumeration),
  structured console errors without PII.
- Pure seams for anything worth testing: `db-path.ts`, `auth.ts` — no DB
  imports inside them.
- Upsert semantics for seeds (`db:seed` re-run = password rotation).
- Server Components guard privileged pages; client islands stay tiny.
- Comments explain WHY (engine traps, cascade reasoning), never WHAT.
- One passive scroll listener for all scroll-driven chrome state.

---

## §15. Coding Patterns (with code)

**Session token (src/lib/auth.ts):**

```ts
export function signSession(adminId: string, ttl = SESSION_TTL_SECONDS,
                            secret = authSecret()): string {
  const exp = Math.floor(Date.now() / 1000) + ttl;
  return `v1.${adminId}.${exp}.${createHmac("sha256", secret)
    .update(`${adminId}.${exp}`).digest("hex")}`;
}
// verify: recompute, timingSafeEqual, then exp > now
```

**DB URL resolution (src/lib/db-path.ts):**

```ts
// relative file: URLs resolve against the first anchor dir containing
// prisma/schema.prisma — mirrors the Prisma CLI rule
const schemaRoot = anchors.find((root) =>
  existsSync(path.join(root, "prisma", "schema.prisma"))) ?? last;
return `file:${path.resolve(schemaRoot, "prisma", raw)}`;
```

**Fixed-window limiter (api routes):**

```ts
const bucket = buckets.get(ip);
if (!bucket || bucket.resetAt <= now) { buckets.set(ip, {count: 1, …}); return false; }
bucket.count += 1; return bucket.count > MAX_PER_WINDOW;
```

**Rasterized color assertion (e2e):** draw the element into a canvas,
`getImageData`, compare channels with ±1 tolerance — never the computed
string.

---

## §16. Coding Anti-Patterns

- `import { db } from "@/lib/db"` inside a *pure* seam (breaks testability).
- `text-7xl` on an h2 expecting it to render 72px (unlayered base wins).
- `!text-sm` (v3 prefix syntax — v4 wants `text-sm!`).
- `bg-gradient-to-b` for parity gradients (oklab drift — use arbitrary
  sRGB `bg-[linear-gradient(…)]`).
- String-comparing `getComputedStyle().backgroundColor`.
- `typeof window` state initialization (hydration mismatch).
- Echoing request bodies in error responses.
- Distinct 401 messages for "no such user" vs "wrong password".

---

## §17. Responsive Breakpoint Reference

| Breakpoint | What changes |
| ---------- | ------------ |
| `< 640 (sm)` | `body, p { font-size: 14px }` (in `@layer base`); logo stacks two lines; hero card paragraph uses `text-sm!` |
| `≥ 640 (sm)` | h2 → 60px (`3.75rem !important`); logo inline with ` Family` |
| `< 1024 (lg)` | Hamburger + dropdown visible (`lg:hidden`); desktop nav `hidden` |
| `≥ 1024 (lg)` | Desktop pill nav flex; hamburger hidden — **exact 1023/1024 symmetry is e2e-pinned** |
| `md (≥ 768)` | CTA `min-w-36` |
| Notched devices | `viewport-fit=cover`; hero bleeds into safe areas |

---

## §18. Z-Index Layer Map

| Layer | z | Element |
| ----- | - | ------- |
| Base | 0 | page flow |
| Header | 50 | `fixed inset-x-0 top-0 z-50` site chrome |
| Mobile dropdown | (in-flow under header) | `absolute` within the pill — no extra z |
| Reveal | n/a | opacity/transform only, no stacking change |

Only `z-50` exists in the codebase — the site is intentionally flat. New
overlays should slot ABOVE 50 and be documented here.

---

## §19. Color Reference (Complete)

Theme (`:root`, light — the active mode): background `hsl(205 50% 96%)`;
foreground/primary/ring `hsl(151 32% 22%)`; primary-foreground
`hsl(50 58% 88%)`; hero-foreground `hsl(0 0% 100%)`; secondary
`hsl(49 62% 82%)`; card `hsl(54 38% 98%)`; muted `hsl(203 28% 90%)`;
muted-foreground `hsl(153 18% 35%)`; accent `hsl(205 42% 91%)`;
border/input `hsl(151 18% 78%)`; destructive `hsl(0 72% 52%)`.
Service gradient: top `hsl(48 33% 96%)`, middle `hsl(3 27% 89%)`, bottom
`hsl(41 88% 70%)`; provider-panel `hsl(0 0% 100%)`. A `.dark` token set
exists but has NO toggle (mirrors the reference exactly).
Mobile dropdown panel paints `rgb(38 74 57 / 0.9)` (foreground @ 90%).

---

## §20. TypeScript Interface Reference

```ts
// prisma/schema.prisma -> generated types
Appointment { id: cuid; fullName: string; phone: string; email: string|null;
              specialty: string; preferredDate: string|null;
              status: string (default "new"); createdAt: Date;
              updatedAt: Date }
AdminUser   { id: cuid; email: string (unique); passwordHash: string; createdAt: Date }

// src/lib/auth.ts
hashPassword(password: string): string          // "scrypt$saltHex$hashHex"
verifyPassword(password: string, stored: string): boolean
signSession(adminId: string, ttlSeconds?: number, secret?: string): string
verifySession(token: string, secret?: string): { adminId: string } | null
SESSION_COOKIE = "clinic_session"; SESSION_TTL_SECONDS = 604_800

// src/lib/db-path.ts
resolveDatabaseUrl(envUrl: string|undefined, anchors: string[]): string
standaloneRepoRoot(dir: string): string|null
moduleSelfRoot(url: string): string|null   // session-22 F10: %-decode + existsSync guard
candidateRoots(): string[]

// src/lib/content.ts — as const tuples
navLinks: readonly { href: "#about"|…; label: string }[]
services: readonly { icon; title; description }[]

// API contracts
POST /api/appointments     201 {ok:true,id} | 413 | 422 {error,fields} | 429 | 500
PATCH /api/appointments/[id] 200 {ok,id,status}+session | 401 | 404 |
                           413 | 422 {error,fields} | 429
POST /api/auth/login       200 {ok:true}+cookie | 401 {error} | 422 | 429
POST /api/auth/logout      200 {ok:true}
GET  /api/health           200 {ok,database} | 503
```

Bought exceptions to "no `any`": `ref as never` for the polymorphic Reveal
tag; `process.env as Record<…>` in env-reshaping tests.

---

## Appendix A — ADR Index

ADR-001 Next.js 16 App Router · ADR-002 RSC + client islands · ADR-003
Tailwind v4 CSS-first port (trap log) · ADR-004 Prisma/SQLite · ADR-005
manual API validation + in-memory limiting · ADR-006 hydration-safe
reveal · ADR-007 e2e trap guards · ADR-008 dependency-free scrypt+HMAC
sessions · ADR-009 staff dashboard beyond parity (unlinked) · ADR-010
`env -u` determinism guard. Full text: `Project_Architecture_Document.md`.

## Appendix B — Validation History

- **Session 1** (commit `341a908`): full reconstruction; parity verified
  (7490px page height, section metrics); 15 unit + 22 e2e green.
- **Session 2** (this revision): audit (`docs/remediation-plan-session2.md`)
  found the ambient-env DB hijack, stale `.env.example`, and the
  login/dashboard gap; remediated with ADR-008/009/010; 29 unit + 27 e2e
  green; screenshots refreshed + auth/dashboard captures added.
- **Session 4** (re-audit): live parity re-verified against the reference
  (7490px height, heading scales, mobile menu panel byte-exact at
  192×148/rgba(38,74,57,.9)); audit found only doc-level residuals —
  destructive token typo in §19 fixed, the semantic-title deviation from
  the reference's "Base44 APP" placeholder recorded in the validation
  report and pinned with `toHaveTitle` e2e assertions (28 e2e total);
  braces/deepmerge-ts advisories re-verified unfixable upstream
  (accepted dev-time risk); key screenshots refreshed.
- **Session 6** (scaffold cleanup): audit surfaced the pre-clone legacy —
  14 ORBITAL-era scripts removed from `scripts/` (kept `seed.ts`), 15
  unused scaffold dependencies removed (8× @radix-ui, cva, clsx,
  tailwind-merge, tailwindcss-animate, tw-animate-css, zustand,
  z-ai-web-dev-sdk) + the dead `components.json`, and the two committed ssh
  shims that violated the push runbook's "never commit the shim" rule.
  The removal is pinned by `tests/deps.test.ts` (dependency allowlist +
  no-creep-back + scripts-dir contract) — unit suite 29 → 33. Live parity
  re-verified byte-exact both sides before and after the cleanup; product
  loop re-verified under an active ambient `DATABASE_URL` hijack value
  (the `env -u` guards held). Cleanup proven behavior-neutral: identical
  build route table, 28/28 e2e, 9 screenshots refreshed.
- **Session 8** (HTTP-edge hardening): fresh-eyes audit found the risks the
  earlier audits hadn't surfaced — a login user-enumeration TIMING oracle
  (unknown email skipped scrypt entirely), first-token XFF rate-limit
  keying (client-controllable), the client discarding the server's 422
  field map ("check the highlighted fields" with nothing highlighted),
  impossible calendar dates passing validation via JS Date rollover
  (Feb 31 → Mar 3, persisted as garbage), reveal content lost forever on
  client-bundle failure, the heartbeat animation missing its
  reduced-motion guard, and a real tel: href parity deviation
  (contact/footer `tel:1234567890` vs the reference's uniform
  `tel:+11234567890`). Remediated via TDD with two new pure seams —
  `src/lib/validation.ts` (calendar round-trip rejection + specialty
  allowlist DERIVED from content.ts) and `src/lib/rate-limit.ts`
  (last-token XFF keying + fixed-window limiter + 64 KiB body cap) — plus
  `DUMMY_HASH`/`verifyLoginPassword` timing equalization, per-field 422
  rendering with aria wiring, the reveal self-heal timer (inline script,
  cancelled by the first Reveal mount), true TS strict (noImplicitAny,
  no ignoreBuildErrors), `metadataBase` wired to NEXT_PUBLIC_SITE_URL,
  `@types/node` declared, and an explicit playwright AUTH_SECRET. Unit
  suite 33 → 65; e2e 28 → 34 (impossible dates, 422 UI, 429 under a
  dedicated spoofed XFF key, 413 cap, enumeration parity, tel: pin).
  Live parity re-verified byte-exact on both sites; product loop green
  under the active ambient hijack; 11 screenshots refreshed (incl. the
  NEW 14-appointment-field-errors state).
- **Session 10** (edge closure + robustness): the fresh-eyes audit found
  what session 8's own hardening had left half-open — `POST
  /api/auth/login` 500'd on a JSON `null` body (property access outside
  the parse try/catch; the sibling appointments route had the guard since
  session 8), the 64 KiB body cap trusted only `content-length` so a
  CHUNKED request bypassed it entirely (verified live: a 70 KiB chunked
  POST buffered and parsed to a 422), and `scryptSync` blocked the event
  loop ~30-50 ms per login attempt (spoofed-key bursts starved every
  concurrent request). Remediated TDD-first: `readJsonBody` seam in
  `rate-limit.ts` (stream-read with hard byte cap, socket cancelled on
  breach — 8 unit tests incl. the exact 64 KiB boundary), the login
  non-object body guard (422 field map, e2e-pinned on both routes),
  `promisify(scrypt)` (identical CPU on the libuv threadpool — DUMMY_HASH
  and the timing-equalization contract untouched; verified live: health
  polls interleave during concurrent scrypt logins), a one-day
  west-of-server timezone tolerance on the not-in-the-past floor,
  `src/lib/motion.ts` `scrollBehavior()` for reduced-motion instant jumps
  in both CTA handlers, and per-run spoofed XFF keys in the limiter e2e
  specs (`reuseExistingServer` can no longer poison buckets). Unit suite
  65 → 76; e2e 34 → 37. Live parity re-verified byte-exact (mobile
  link-click 0.0004998518957345971 on BOTH sites, same session, same
  method); methodology note: agent-browser's DEFAULT viewport is
  1280×577 — set 1440×900 explicitly or heights mislead (7229px artifact
  observed and explained). 11 screenshots refreshed from the remediated
  dev server.
- **Session 12** (email bound + transport tolerance + lint-gate honesty):
  the fresh-eyes audit found the email field was the only UNBOUNDED payload
  field (a pattern-valid 60,012-char email persisted — verified live), that
  transport read errors (client aborts mid-body, ECONNRESET) escaped
  `readJsonBody` AND both routes' try/catch blocks as unhandled framework
  errors (verified live with a raw-socket abort probe), that the "lint 0"
  gate ran with ~24 rules silently disabled, and four smaller gaps (logout
  fetch without a catch, `reactStrictMode` off without rationale, the
  "Upcoming visits" stat stricter than the validation tolerance, non-string
  `specialty` silently coercing to the default, seed's dead-code
  disconnect, login's hand-copied email regex). Remediated TDD-first:
  `EMAIL_MAX_LENGTH = 254` in `validation.ts` (255 → 422, 254 → 201 — unit
  and live boundary probes), the read loop inside a try/catch (stream
  rejection → cancel best-effort → 400; the routes now always resolve),
  specialty type tightening (present-but-non-string → 422; missing/nullish
  keep the default), `upcomingVisitsFloor()` sharing
  `toleranceFloorDate()` with the preferredDate validation so the stat and
  the API can never disagree, the logout `.catch`, seed
  `process.exitCode`, the login route importing the seam's
  `EMAIL_PATTERN`, and a rewritten `eslint.config.mjs` with 13
  correctness/dep-safety rules ON (every one at 0 findings — the
  session-8/10 manual effect audits held) and every remaining off
  documented (no-undef: TS type-only globals false-positive; no-img-element:
  parity `<img>` ports; style noise). The three root-href
  `no-html-link-for-pages` hits fixed by converting to `next/link`
  (login `/#contact`, legal back-link, dashboard "View site"). New login
  limiter e2e pin: 10 × 401 then 429 under a per-run 198.51.100.x spoofed
  XFF key (disjoint from every fixed key in the file). Unit suite 76 → 85;
  e2e 37 → 38. Live parity re-verified byte-exact (mobile link-click
  0.421875 on BOTH sites, same session, same method; 7490px); 20
  screenshots refreshed (03-desktop-full is exactly 1440×7490).
- **Session 14** (footer completion + e2e cross-run keys + security
  headers + login email bound + transport-message curation): the
  fresh-eyes audit found the residuals five audits had missed — the two
  FOOTER legal links still plain `<a>` (invisible to
  `no-html-link-for-pages`, which is structurally blind to non-root
  App-Router routes: the plugin normalizes hrefs with a trailing slash the
  route regexes lack, so only root-href anchors can ever match — the
  session-12 "three real hits" claim undercounted; the blind spot is now
  recorded in the eslint config), the impossible-dates spec posting 3
  requests under a FIXED XFF key (2nd run within 10 min → 429 flake), zero
  security headers with `X-Powered-By` exposed, `next build` embedding a
  byte-identical `.env` (staff password + AUTH_SECRET) into
  `.next/standalone/.env` with no runbook warning, the login email without
  the 254 bound the appointments route enforces, a stale dev-PII
  query-log comment (Prisma 6.11 prints SQL templates with `?`
  placeholders only — bound values are NOT printed), and raw
  "Failed to fetch" engine strings surfacing in both forms. Remediated
  TDD-first (3 Red e2e tests confirmed failing): footer → `next/link`, ALL
  request-level e2e specs on per-run XFF keys (module constants with
  spec-unique third octets — collision-proof within and across runs),
  `next.config.ts` baseline headers (nosniff / X-Frame-Options DENY /
  Referrer-Policy + `poweredByHeader: false`; e2e-pinned; CSP documented
  as the proxy-seam's job), the login route importing `EMAIL_MAX_LENGTH`
  (300-char email → 422, no new oracle — fires before DB/scrypt),
  `TypeError` curation in both forms' catch blocks (e2e-pinned via
  `page.route().abort()`), the DEPLOYMENT.md artifact warning, and the
  db.ts comment correction. Unit suite 85 (no unit changes); e2e 38 → 41.
  Live parity re-verified byte-exact (mobile link-click 0.421875 BOTH
  sites; 7490px); 20 screenshots refreshed (03-desktop-full exactly
  1440×7490).
- **Session 16** (status management + e2e key determinism + lint-gate
  strengthening + doc-claim honesty): closed the last backlog item —
  appointment status transitions. The Appointment model gained
  `status` (allowlisted string, default "new") + `updatedAt`
  (`@default(now()) @updatedAt` so `prisma db push` is data-preserving);
  a session-guarded `PATCH /api/appointments/[id]` (limiter 60/10 min,
  readJsonBody cap, 404 unknown ids, value-validated through a NEW pure
  seam `validateStatusUpdate` whose allowlist is DERIVED from content.ts
  `appointmentStatuses` — the same one-source doctrine as
  APPOINTMENT_SPECIALTIES); the dashboard table gained a Status column
  (badges + a StatusButton client island that PATCHes then
  `router.refresh()`es — server state stays the source of truth, and the
  brief re-enabled window before the refresh lands is benign because the
  PATCH is idempotent). Hardening residuals: the per-run XFF keys moved
  from `Date.now() % 200` (a ~1/200 back-to-back collision — the comment
  overclaimed "collision-proof") to the raw `process.pid` as the fourth
  dot-segment (every run is a new process; pid recycling needs a full
  pid_max wrap; the limiter keys on the raw XFF token so non-IPv4
  segments are legal); `no-non-null-assertion` re-enabled (the old
  rationale cited reveal.tsx which contains NO assertion — the single
  canvas.getContext exception is inline-disabled; 14 rules ON now);
  Next's internal 308 trailing-slash redirect carries NO security headers
  (headers() applies only from route matching onward — docs corrected to
  "every route response and app-level redirect", both edges e2e-pinned);
  dev/start `tee` pipes mask exit codes (documented — judge liveness by
  /api/health + log tails); the live staff password was neutralized out
  of the four living docs (history scrubbing skipped — never rewrite
  pushed main). Unit suite 85 → 95 (status seam, 10 cases); e2e 41 → 43
  (status UI loop + PATCH edge pins). Live parity re-verified byte-exact
  (mobile link-click 0.421875 BOTH sites; 7490px); 20 screenshots
  refreshed (dashboard shots show the status column).
- **Session 18** (v2.8.0 — e2e unknown-bucket determinism + dashboard
  status annunciation + full doc-claim honesty pass): the fresh-eyes audit
  (11 findings, zero Critical/High/Medium, zero regressions) proved the
  session-16 F2 "never poison a bucket" claim was overstated for
  BROWSER-DRIVEN requests — the suite made 3 XFF-less appointments POSTs
  per run into the shared "unknown" limiter bucket (limit 5/10min), so a
  second consecutive run against a `reuseExistingServer` instance
  429-flaked auth.spec's POST (empirically proven with a double-run
  repro: run 1 green, run 2 failed at the 6th unknown-bucket POST). The
  login limiter's unknown bucket took 4 browser logins per run (a third
  consecutive run would flake at 12 > 10). Remediated TDD-first:
  EVERY browser-driven POST/PATCH now gets its pid-derived per-run key
  injected via `page.route` + `route.continue` header merge —
  appointment-form UI_KEY `198.51.106.${pid}` (the two form submits),
  auth APPOINTMENTS_UI_KEY `192.0.5.${pid}` (the page.request POST) +
  LOGIN_UI_KEY `192.0.6.${pid}` (the two browser logins),
  appointments-status LOGIN_UI_KEY `198.51.107.${pid}` (both browser
  logins) + PATCH_KEY injection on the StatusButton's browser PATCHes
  (idempotent with the API-level pins). NO request the suite makes
  touches the "unknown" bucket anymore, within or across runs — verified
  with a TRIPLE-consecutive-run proof: 43/43 × 3 against one persistent
  server inside the 10-min window. The dashboard status badge gained
  `role="status"` (implicit aria-live=polite, WCAG 4.1.3 — the
  New→Confirmed text mutation after `router.refresh()` now announces;
  Red-first e2e pin: `toHaveAttribute("role", "status")`). The doc pass:
  README/CLAUDE "13 rules"→14, "41 tests"→43, the Vitest seam row
  completed; StatusButton added to every client-island list (AGENTS,
  CLAUDE State Management, SKILL §2/§5); SKILL body drift fixed (8
  scroll sections, unit breakdown +status 10, Appointment type
  +status/updatedAt, API contracts +PATCH/413); PAD §3.2 tree completed,
  §4.1 ER gained AdminUser + status/updatedAt, §5.3 Radix claim
  corrected (removed in S6, deps.test.ts-pinned), §5.4 CTA
  reduced-motion wording, §6.1 APPOINTMENT_SPECIALTIES, §6.3 rewritten
  to the ADR-008 reality (NextAuth explicitly rejected), §8.2 env table
  completed, §9.1 +db:seed, §11 re-measured; landing.spec tel: comment
  corrected (the third link is the FAQ's, not form-success). Unit suite
  95 (unchanged); e2e 43 (1 extended assertion). Live parity re-verified
  byte-exact (7490px; mobile panel 192×148 @ (178,80); link-click
  0.421875 BOTH sites); 20 screenshots refreshed.
- **Session 20** (v2.8.1 — the last XFF-less request + config
  modernization): fresh-eyes audit (4 findings, zero
  Critical/High/Medium, zero regressions) found the residual ten prior
  audits hadn't — the session-18 "unknown bucket never touched" claim
  was still one request short of literal: auth.spec's malformed-payload
  login POST carried NO XFF header (1 XFF-less POST per run into the
  shared "unknown" login bucket, limit 10/10min → an 11th consecutive
  run inside the window against a `reuseExistingServer` instance would
  429-flake a test asserting 422; empirically proven at the API level:
  10 XFF-less POSTs → 422×10, the 11th → 429). Remediated
  TDD-first: `MALFORMED_KEY = 192.0.7.${pid}` (disjoint from every base
  in every spec) on that request — a paren-balanced structural grep now
  proves EVERY request-level POST/PATCH in the suite carries an XFF
  header, and every browser-driven site injects one via
  `page.route`/`route.continue` (or aborts before reaching the server).
  Plus: `vitest.config.ts` → `vitest.config.mts` (native ESM load; the
  Vite "ESM syntax loaded as CommonJS" deprecation warning is gone; the
  two living references updated — SKILL §3 and the playwright.config
  comment), README's Testing-block Vitest row gained the status seam +
  the Architecture E2E row gained "appointment status management"
  (session-18 F11 fixed the sibling rows, these two were missed), and
  the 6 realistic dashboard seed rows were restored after the workspace
  reset (2 confirmed / 2 new / 2 completed, set via the real PATCH API).
  Unit suite 95 (unchanged, now warning-free); e2e 43 + the
  DOUBLE-consecutive-run proof (43/43 × 2 within the 10-min window).
  Live parity re-verified byte-exact (7490px both sites at a verified
  1440×900 viewport; mobile panel 192×148 @ (178,80); link-click
  0.421875 BOTH); 20 screenshots refreshed (03-desktop-full exactly
  1440×7490).
- **Session 22** (v2.8.2 — credential-hygiene closure + db-path decode
  hardening + doc-claim honesty): fresh-eyes audit (13 findings: 4 Low,
  9 Info, zero Critical/High/Medium, zero regressions) found the residual
  eleven prior audits hadn't — the headline a RESURRECTED
  credential-hygiene leak (session-16 F5 had neutralized the
  then-live password by swapping the doc example to a new string, but
  that replacement looked like a real strong password, so fresh
  bootstraps adopted it as the actual `.env` credential — login-proven
  working this session). Remediated: the live password rotated to a
  generated value printed nowhere (old literal now 401s), and the four
  doc escaping-examples switched to the obvious placeholder
  `\$<your-password>` so no future bootstrap can re-adopt them (root
  cause fixed, not just the symptom). Plus: db-path's module self-anchor
  extracted into the tested pure seam `moduleSelfRoot` with
  `decodeURIComponent` — a repo path containing spaces/`#`/non-ASCII no
  longer silently skips the anchor (4 new unit tests, TDD Red-first);
  PAD ADR-009 consequences de-staled (status transitions shipped s16),
  PAD §6.1 rule-6 floor description corrected to midnight−1day, SKILL
  §1/§5 gained the PATCH route (the missed-sibling-row class), ADR-002
  annotated to the seven-island reality, AGENTS "one write path"
  qualified as the public one, the CLAUDE "fixed -window" typo fixed,
  the set-state-in-effect doc tension resolved honestly (header.tsx
  invoke-once pattern documented as the sanctioned exception), seed's
  email-change nuance documented (upsert-by-email leaves the old row
  active), landing.spec's over stating "smooth-scroll" title corrected,
  PAD §3.2's docs/ subtree completed with a deliberate-elision note, and
  the logout-button "only interactive island" comment de-staled. Unit
  suite 95 → 99; e2e 43 + the double-run proof re-confirmed (43/43 × 2).
  Live parity re-verified byte-exact on both sites at verified viewports
  (desktop 7490px both; mobile panel 192×148 @ (178,80) grid r24 p8;
  link-click lands #services at 0.421875 on BOTH — identical to the
  pixel; mobile page height 12162 vs 12164 = a 2px sub-pixel drift
  inside the contact section, recorded as an honest measurement note);
  pixel-rasterized trap guards green (pill [37,74,57,204] ±1 oklab,
  dropdown [38,74,57,230] exact); the full product loop with status
  transitions green under the still-active ambient DATABASE_URL hijack;
  20 screenshots refreshed (03-desktop-full exactly 1440×7490).

### Session 24 — Favicon chrome parity, PAD count residuals, script-footgun note (v2.8.3)

Fresh-eyes audit (13th; 5 findings: 2 Low, 3 Info, zero
Critical/High/Medium, zero regressions) found the one reference-visible
surface twelve prior audits never checked: the app shipped NO favicon
while the reference serves an inline SVG one (heart-rate glyph, clinic
green #264a38 + cream #f3ead0). Remediated TDD-first (Red: the new
landing.spec icon pin fails on the 404 tree; Green: the reference glyph
vendored verbatim as src/app/icon.svg — the App Router file convention
auto-generates the link tag; /icon.svg serves 200 image/svg+xml; page
height 7490px UNCHANGED, head-only chrome). The reference's /favicon.ico
302→logo.png fallback deliberately not replicated (platform artifact
serving a different image — the same recorded-deviation reasoning as the
session-4 title). Plus: the two residual "15 unit" db-path claims in PAD
ADR-004 + §3.2 corrected to 19 (the missed-sibling-row class), PAD §11's
seed.ts row re-measured (~47), AGENTS.md gained the db:migrate/db:reset
placeholder note (migrations-less repo — db:push + db:seed is the
workflow), and the 6 realistic seed rows restored through the public API
with statuses via the real PATCH API after the reset. Unit 99 (unchanged);
e2e 43 → 44 (the icon pin) with the DOUBLE-consecutive-run proof re-held
(44/44 × 2); live parity re-verified byte-exact on both sites at verified
viewports (desktop 7490px both; mobile panel 192×148 @ (178,80) grid r24
p8; link-click 0.421875 + scrollY 1837 BOTH; mobile height 12162 vs 12164
— the documented 2px contact-section drift); pixel-rasterized dropdown
[38,74,57,230] exact; the full product loop with status transitions green
under the still-active ambient DATABASE_URL hijack; 20 screenshots
refreshed (03-desktop-full exactly 1440×7490; dashboards show the restored
6 seed rows).

### Session 26 — E2E time-erosion closure, PAD count residuals, seed-state restore (v2.8.4)

Fresh-eyes audit (14th; 6 findings: 4 Low, 2 Info, zero
Critical/High/Medium, zero regressions) found a defect class thirteen prior
audits never checked for: **time-eroded e2e assertions**. The
impossible-dates pin's hardcoded 2025 literals had fallen into the past, so
their JS-rollover targets were past too — the "not in the past" floor alone
produced the asserted 422 even with the calendar round-trip check fully
broken (empirically proven: the RED-0 run — `isRealCalendarDate` forced to
`valid: true`, rebuilt, and the old test still PASSED). Remediated
TDD-first: the pin now computes `new Date().getFullYear() + 1` literals,
whose rollover targets are always future — only the round-trip check can
reject them, forever; the new pin was proven RED against the same broken
seam (201 ≠ 422 → fail) before going GREEN on the restored one (the
deliberate seam patch reverted verbatim — `git diff` clean; the RED run's
persisted garbage row purged from db/e2e.db). Plus: PAD §7.1's landing row
corrected 12 → 13 (the session-24 count pass missed the per-spec
breakdown — rows summed to 43 against the doc's own 44), PAD §11's
Validation Report row re-measured ~334 → ~361 (stale since session-24
appended 27 lines to that file without re-measuring), SKILL §8's forms row
reworded to the honest two-form reality (`<label>` wrapping on login,
`aria-label` on the appointment form — a verbatim parity port), PAD §3.2's
transcript ranges rephrased as open-ended families (kills the
every-session stale-range class at the root), and the 6 realistic seed rows
restored through the PUBLIC API (unique 198.51.117-119.x XFF keys) with
statuses via the real PATCH API (2 confirmed / 2 new / 2 completed — third
recurrence of the workspace-reset class). Unit 99 (unchanged); e2e 44
(unchanged) + the DOUBLE-consecutive-run proof re-held (44/44 × 2); live
parity re-verified byte-exact on both sites at verified viewports (desktop
7490px both; mobile panel 192×148 @ (178,80) grid r24 p8; link-click
0.421875 + scrollY 1837 BOTH; mobile height 12162 vs 12164 — the
documented 2px contact-section drift); pixel-rasterized dropdown
[38,74,57,230] exact; the full product loop with status transitions green
under the still-active ambient DATABASE_URL hijack (re-proven twice: an
ad-hoc Prisma query without `env -u` failed with SQLite error 14 exactly as
ADR-010 documents); 20 screenshots refreshed (03-desktop-full exactly
1440×7490; dashboards show the restored 6 seed rows; the capture's
submission rows purged after).

### [S28] Session 28 — demo-seed root-cause closure, screenshot index, lock metadata

The 15th fresh-eyes audit (3 findings: 1 Low, 2 Info, zero
Critical/High/Medium, zero regressions). The headline closed the
4×-recurred workspace-reset seed-row class at its ROOT: the 6 realistic
dashboard rows were absent again (S20, S24, S26, S28 — each prior session
restored them through the public API by hand, and every fresh bootstrap
erased them again). `scripts/seed.ts` gained an OPT-IN demo mode
(`SEED_DEMO=1` env or `--demo` argv — default behavior byte-identical, so
production seeding per DEPLOYMENT.md §4 never creates patient rows),
backed by the new pure seam `src/lib/seed-demo.ts` (6 rows, 2 new /
2 confirmed / 2 completed; specialties/statuses members of the API's
derived allowlists; self-renewing dates now + offsetDays — the S26 F4
anti-erosion doctrine applied to seed data; every row a valid
public-API payload BY CONSTRUCTION — the cross-seam unit test pushes each
row through validateAppointmentPayload) with IDEMPOTENT inserts
(skip-if-exists by fullName — re-runs never duplicate and never clobber
real dashboard status transitions). TDD Red-first (8 new unit cases
failing on the missing module before the seam landed; suite 99 → 107).
Plus: README's Screenshots table gained the unreferenced
06-mobile-services.png row (the 20th committed capture), and bun.lock's
root workspace name corrected orbital → health-care-clinic with an
install-stability proof (the lock stays canonical; `bun install` reports
no changes). Count-alignment pass: 99 → 107 across README/CLAUDE×2/
PAD×3/SKILL; deps pin untouched (scripts/ = seed.ts — the flag extends
the file, no second script). E2E 44/44 × 2 (double-run proof re-held);
live parity re-verified byte-exact on both sites at verified viewports
(desktop 7490px both; mobile panel 192×148 @ (178,80) grid r24 p8;
link-click 0.421875 + scrollY 1837 BOTH; pill [37,74,57,204] ±1 oklab,
dropdown [38,74,57,230] exact; mobile height 12162 vs 12164 — the
documented 2px contact drift); the full product loop with status
transitions green under the still-active ambient DATABASE_URL hijack;
20 screenshots refreshed (03-desktop-full exactly 1440×7490; dashboards
show the restored 6 seed rows; the capture's submission row purged
after).
