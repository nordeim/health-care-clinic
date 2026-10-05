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
(`POST /api/appointments`). All marketing copy lives in
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
   a parent-directory `.env` (bun walks up); both locations resolve to a
   valid, schema-pushed DB, so don't "fix" one path by breaking the other.

## Conventions

- Server Components by default; `"use client"` only for Header (menu +
  scroll-spy state), Hero (rotating badge), AppointmentForm (submit
  states), Reveal (observer).
- Content (copy, icon maps, nav links) lives in `src/lib/content.ts` —
  single source of truth, `as const` tuples.
- Section ids are a public contract: `#top #about #services #insurance
  #providers #contact #faq` — the nav, scroll-spy, CTAs and e2e specs all
  depend on them.
- Lucide icons only; size classes match the reference (`h-4 w-4` circles,
  `h-5 w-5` footer/trigger, `h-6 w-6` FAQ/footer logo).
- Commit style: Conventional Commits, atomic commits, never commit
  secrets or keys (the SSH push runbook is `docs/how-to-git-push-using-ssh-wrapper_SKILL.md`).

## Testing quirks

- Playwright's `globalSetup` pushes the schema to `db/e2e.db`; specs run
  single-worker (shared SQLite file). `test:e2e` requires a prior
  `bun run build` (standalone server).
- The appointment happy-path test deliberately does NOT assert the
  in-flight "Sending…" state — it races a fast local API.
- Headless hover checks are unreliable: v4 wraps `hover:` variants in
  `@media (hover: hover)`. Assert computed geometry, not hover paint.
