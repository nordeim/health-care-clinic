---
name: health-care-clinic
description: >
  Comprehensive engineering skill for the Green Grove Family Clinic
  codebase — a pixel-faithful Next.js 16 reconstruction of a Tailwind-v3
  Vite SPA reference, with a validated appointment backend and a
  dependency-free staff auth/dashboard extension. Captures the
  reference-parity doctrine, the six documented Tailwind v4 engine traps
  and their mitigations, the environment-determinism guards, the testing
  methodology, and every hard-won lesson from sessions 1 and 2.
version: 2.0.0
last_updated: 2026-10-05
project_state: 29 unit tests + 27 e2e tests green; env-leak guard active (env -u)
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

**Public surfaces:** `/` (9-section scroll narrative), `/privacy-policy`,
`/accessibility-statement`, `POST /api/appointments`, `GET /api/health`.
**Staff surfaces:** `/login`, `/dashboard`, `POST /api/auth/login`,
`POST /api/auth/logout`.

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
- `vitest.config.ts` matches `*.test.ts` only; `playwright.config.ts`
  `testDir: tests/e2e` — no double-pickup between layers.

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
src/app/api/appointments/    POST — validation + rate limit + Prisma insert
src/app/api/auth/login|logout/  POST — scrypt verify + cookie set/clear
src/app/api/health/          GET — SELECT 1 probe
src/app/login|dashboard/     staff pages (noindex, unlinked from landing)
src/components/site/         13 components: one per landing section
                             + Reveal + LegalPage
src/components/dashboard/    LoginForm + LogoutButton (client islands)
src/lib/content.ts           ALL copy, icon maps, nav contracts (as const)
src/lib/auth.ts              scrypt + HMAC session primitives (pure)
src/lib/db.ts                Prisma singleton (globalThis in dev)
src/lib/db-path.ts           SQLite URL resolution (pure, tested)
scripts/seed.ts              db:seed staff upsert
```

**Client-island discipline:** Server Components by default; `"use client"`
only for Header (menu + scroll-spy), Hero (rotating badge),
AppointmentForm (submit states), Reveal (observer), LoginForm and
LogoutButton. No global store — local `useState` only.

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
- Forms: real `<label>` wrapping (e2e asserts `getByLabel`), `role=alert`
  errors, `aria-live` regions on success states.
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
8. **dotenv `$` interpolation:** `ADMIN_PASSWORD="$Abcd1234"` resolves to
   `""` — the seed failed on this exact value. Mitigation: escape `\$`.
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
bun run typecheck     # clean
bun run test          # 29/29 (db-path 15 + auth 14)
bun run build         # OK; routes: / /login /privacy-policy /
                      # accessibility-statement static; /api/* /dashboard dynamic
bun run test:e2e      # 27/27 (5 spec files)
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
border/input `hsl(151 18% 78%)`; destructive `hsl(0 84% 60%)`.
Service gradient: top `hsl(48 33% 96%)`, middle `hsl(3 27% 89%)`, bottom
`hsl(41 88% 70%)`; provider-panel `hsl(0 0% 100%)`. A `.dark` token set
exists but has NO toggle (mirrors the reference exactly).
Mobile dropdown panel paints `rgb(38 74 57 / 0.9)` (foreground @ 90%).

---

## §20. TypeScript Interface Reference

```ts
// prisma/schema.prisma -> generated types
Appointment { id: cuid; fullName: string; phone: string; email: string|null;
              specialty: string; preferredDate: string|null; createdAt: Date }
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
candidateRoots(): string[]

// src/lib/content.ts — as const tuples
navLinks: readonly { href: "#about"|…; label: string }[]
services: readonly { icon; title; description }[]

// API contracts
POST /api/appointments  201 {ok:true,id} | 422 {error,fields} | 429 | 500
POST /api/auth/login    200 {ok:true}+cookie | 401 {error} | 422 | 429
POST /api/auth/logout   200 {ok:true}
GET  /api/health        200 {ok,database} | 503
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
