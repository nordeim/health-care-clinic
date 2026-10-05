# AGENTS.md

Compact instruction file for AI coding agents working in this repo.
Every line answers: "would an agent likely miss this without help?"

## Commands

| Task | Command |
| ---- | ------- |
| Install | `bun install` (then `bun pm trust --all` if postinstalls were blocked) |
| Dev server | `bun run dev` → http://localhost:3000 (writes `dev.log`) |
| Lint | `bun run lint` |
| Typecheck | `bun run typecheck` |
| Unit tests | `bun run test` (Vitest, `*.test.ts` only) |
| E2E tests | `bun run build && bun run test:e2e` (Playwright; boots the standalone server on :3100 with its own scratch DB) |
| DB schema | `bun run db:push` (Prisma; SQLite at `db/custom.db`) |
| Seed staff login | `bun run db:seed` (ADMIN_EMAIL/ADMIN_PASSWORD from `.env`) |
| Production | `bun run build && bun .next/standalone/server.js` |

**Verification gate (run before any push):**
`bun run lint && bun run typecheck && bun run test && bun run build`
— there is no hosted CI; this local gate is the only gate.

**Single-file test runs:**
`bunx vitest run tests/db-path.test.ts` · `bunx playwright test tests/e2e/mobile-navigation.spec.ts`

## What this codebase is

Pixel-faithful clone of `https://health-care-clinic.base44.app/` (a
Tailwind-v3 Vite SPA) rebuilt on **Next.js 16 App Router + Tailwind CSS
v4 + Prisma/SQLite**. Landing page + two legal pages + one write path
(`POST /api/appointments`). The reference itself has NO login or dashboard
(its route table is `/`, `/privacy-policy`, `/accessibility-statement`);
the staff `/login` + `/dashboard` pair is a documented extension beyond
parity — kept UNLINKED from the landing page so the public experience
stays byte-faithful. All marketing copy lives in
`src/lib/content.ts` — change it there, never inline in components.

## Non-obvious rules (the parts agents get wrong)

1. **Tailwind v4 is CSS-first.** There is NO `tailwind.config.js`. Tokens
   live in `src/app/globals.css` under `@theme inline`, referencing
   `:root`/`.dark` variables. Those variables MUST be full `hsl(...)`
   color values — a bare triplet (`205 50% 96%`) silently resolves to
   *transparent* under `@theme inline` (documented v4 trap; the mobile nav
   e2e spec rasterizes the rendered pixel specifically to guard this).
2. **The unlayered heading rules in globals.css are load-bearing.** The
   reference site forces `h1–h6 { font-weight: 400 !important }`,
   `h2 { font-size: 3rem/3.75rem !important; line-height: 1.05 !important }`,
   `h3 { font-size: 20px !important; line-height: 1.25 !important }`, and
   `body,p { font-size: 14px }` under 640px. These intentionally override
   the type utilities (`text-7xl` on an h2 is a visual no-op, exactly like
   the reference). They are UNLAYERED on purpose so that `!important`
   utilities (the legal pages' `text-2xl!`) still win — keep them out of
   `@layer base`. The mobile `body,p` rule is the opposite: it lives IN
   `@layer base` so non-important utilities beat it. Do not "clean this
   up"; the asymmetry reproduces the reference's specificity cascade.
3. **v3 → v4 syntax deltas already applied:** important modifiers are
   suffix (`text-sm!`, not `!text-sm`); the services/team gradients use
   the arbitrary sRGB form `bg-[linear-gradient(to_bottom,…)]` because
   v4's `bg-linear-to-*` interpolates in oklab; `--shadow-sm` is pinned
   to the v3 geometry in `@theme inline`.
4. **Opacity modifiers compute as `oklab(...)`.** `bg-foreground/80`
   paints identically to v3's `hsl(var(--foreground)/0.8)` but the
   computed-style STRING differs. Never string-assert computed colors —
   rasterize a pixel through a canvas instead (see
   `tests/e2e/mobile-navigation.spec.ts`), and expect a ±1/255
   quantization drift from the oklab roundtrip.
5. **The mobile menu dropdown is a GRID, not `space-y`.** v4 rewrote the
   `space-y-*` selector (`:where()`, margin-block-end, zero specificity),
   which changes spacing whenever a child carries `mt-*`/`mb-*`. Keep
   grid/flex gaps with per-child padding for stacked UI.
6. **`next.config.ts`:** `allowedDevOrigins: ["127.0.0.1"]` exists because
   Next 16 silently blocks dev chunks on the 127.0.0.1 origin
   (symptom: unhydrated page, native form GET fallbacks). Keep it.
   `devIndicators: false` keeps screenshots clean.
7. **`Reveal` choreography:** server and client render the SAME initial
   `data-reveal="hidden"` markup (hydration safety); the hiding CSS is
   scoped to `@media (scripting: enabled)` so no-JS/crawler HTML is
   always visible. Don't initialize the reveal state from
   `typeof IntersectionObserver` — that's the exact hydration mismatch
   this design avoids.
8. **DB path resolution is a tested contract** (`src/lib/db-path.ts`,
   `tests/db-path.test.ts`): relative `file:` URLs resolve against the
   repo that owns `prisma/schema.prisma`. The dev environment may surface
   a parent-directory `.env` or an ambient exported `DATABASE_URL` (bun
   walks up; shell env beats `.env` files) — that is exactly why the
   `dev`/`build`/`db:*` npm scripts prefix `env -u DATABASE_URL`: the
   repo `.env` stays authoritative. `start` (production standalone)
   intentionally KEEPS ambient env per `docs/DEPLOYMENT.md` §4. Do not
   remove the `env -u` guards — a stray exported variable silently
   redirects writes to a database outside the repo.
9. **Staff auth is dependency-free by design** (`src/lib/auth.ts`, pinned
   by `tests/auth.test.ts`): scrypt password hashing + HMAC-SHA256 session
   tokens from Node's crypto module — no external auth library. `AUTH_SECRET`
   is required in production (signing throws without it); dev falls back to
   a constant with a console warning. The login route returns a GENERIC 401
   (never reveal whether the email exists) and rate-limits 10/10min/IP.
   `/dashboard` guards itself as a Server Component (redirect to `/login`);
   no middleware exists — don't add one without updating the ADR log.
10. **dotenv `$` interpolation gotcha:** a value starting with `$` in `.env`
    (e.g. `ADMIN_PASSWORD="$Abcd1234"`) resolves to `""` — escape it as
    `\$`. This bit the seed script once; the troubleshooting table in
    README records it.

## Conventions

- Server Components by default; `"use client"` only for Header (menu +
  scroll-spy state), Hero (rotating badge), AppointmentForm (submit
  states), Reveal (observer), LoginForm and LogoutButton (auth islands).
- Content (copy, icon maps, nav links) lives in `src/lib/content.ts` —
  single source of truth, `as const` tuples. The appointment validation
  seam (`src/lib/validation.ts`) DERIVES its specialty allowlist from
  that list — never hand-copy service names into a second place.
- Rate limiting + body caps live in `src/lib/rate-limit.ts`: the limiter
  keys on the LAST `X-Forwarded-For` token (the proxy-appended address);
  bodies over 64 KiB get a 413 before parsing. The login route ALWAYS
  burns scrypt (`verifyLoginPassword` + DUMMY_HASH in `src/lib/auth.ts`)
  — never short-circuit around it, or the timing-enumeration oracle
  returns.
- Section ids are a public contract: `#top #about #services #insurance
  #providers #contact #faq` — the nav, scroll-spy, CTAs and e2e specs all
  depend on them.
- Lucide icons only; size classes match the reference (`h-4 w-4` circles,
  `h-5 w-5` footer/trigger, `h-6 w-6` FAQ/footer logo).
- Commit style: Conventional Commits, atomic commits, never commit
  secrets or keys (the SSH push runbook is `docs/how-to-git-push-using-ssh-wrapper_SKILL.md`).

## Testing quirks

- Playwright's `globalSetup` pushes the schema to `db/e2e.db` and seeds the
  e2e staff account (E2E_ADMIN_EMAIL/PASSWORD exported from global-setup.ts);
  specs run single-worker (shared SQLite file). `test:e2e` requires a prior
  `bun run build` (standalone server).
- The appointment happy-path test deliberately does NOT assert the
  in-flight "Sending…" state — it races a fast local API.
- Headless hover checks are unreliable: v4 wraps `hover:` variants in
  `@media (hover: hover)`. Assert computed geometry, not hover paint.
- `db/e2e.db` PERSISTS between runs (only the schema is re-pushed) — rows
  accumulate. e2e specs that reference submitted rows must use unique
  values per run (see auth.spec.ts) or they trip Playwright strict mode.
- Next's route announcer carries `role=alert`; scope alert assertions to
  the form (`page.locator("form").getByRole("alert")`).
- The login happy-path never asserts the in-flight "Signing in…" label —
  same fast-local-API race as the appointment form.
