---
IMPORTANT: File is read fresh for every conversation. Be brief and practical.
---

# Green Grove Family Clinic (health-care-clinic)

## Core Identity & Purpose

A production-grade, pixel-faithful reconstruction of the Green Grove Family
Clinic marketing site (reference: `https://health-care-clinic.base44.app/`,
a Vite SPA compiled with Tailwind CSS v3) on a modern full-stack substrate:
**Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS v4
(CSS-first), Prisma + SQLite.** Maintained by nordeim.

The project's defining constraint is **rendering parity with the reference
under a different CSS engine** — every visible element's computed metrics
match the reference (page height 7490px at 1440×900; identical heading
scales, card geometry, and panel styling) — while adding a real, validated
appointment-request backend the reference outsources, plus a staff
login/appointments-dashboard extension (documented as beyond-parity; the
reference has no login — its route table is `/`, `/privacy-policy`,
`/accessibility-statement`).

## Foundational Principles

### Meticulous Approach (Six-Phase Workflow)

1. **ANALYZE** — Extract ground truth from the live reference (DOM classes,
   computed styles, measured geometry) before writing any markup. Never
   guess a value that can be measured.
2. **PLAN** — Map each reference section to a component; map each engine
   difference (v3→v4) to a mitigation; identify the verification gate for
   each.
3. **VALIDATE** — Confirm parity claims with numbers (computed styles,
   bounding boxes, rasterized pixels), not eyeballing.
4. **IMPLEMENT** — One component per section; copy centralized; server
   components unless interaction demands a client island.
5. **VERIFY** — Gate: `bun run lint && bun run typecheck && bun run test &&
   bun run build`, then Playwright e2e (34 tests) plus in-browser
   interaction checks at desktop and mobile widths.
6. **DOCUMENT** — Engine-variance findings go into
   `docs/Tailwind-V4-Validation-Report.md` (trap log) and ADRs in
   `Project_Architecture_Document.md`.

### Reference-Parity Doctrine

- Class strings ported verbatim from the reference unless a documented
  engine trap forces a class-form change (then the change is recorded).
- Computed-style parity is the acceptance bar: same font sizes, line
  heights, colors, radii, shadows, and bounding boxes.
- Timing-only artifacts (video frame, badge rotation phase, dev overlay)
  are exempt from parity.

## Implementation Standards

### File Organization

- `src/app/` — routes, API handlers, `globals.css` (the design system)
- `src/app/login/`, `src/app/dashboard/` — staff surfaces (not linked from
  the landing page; session-guarded)
- `src/components/site/` — one component per landing section + `Reveal`
  choreography helper + `LegalPage` shell
- `src/components/dashboard/` — `LoginForm`, `LogoutButton` client islands
- `src/lib/` — `content.ts` (all copy/icon maps), `auth.ts` (scrypt +
  HMAC session primitives), `db.ts`, `db-path.ts`
- `prisma/` — schema (Appointment + AdminUser models)
- `scripts/seed.ts` — `db:seed` staff account upsert
- `tests/e2e/` — Playwright specs; `tests/*.test.ts` — Vitest seams

### Naming Conventions

- Components: PascalCase files (`appointment-form.tsx` exports
  `AppointmentForm`)
- Content data: `as const` tuples in `content.ts`
- CSS custom properties: kebab-case matching the reference (`--hero-foreground`)

### State Management

- No global store. Server Components hold the composition; the only client
  state is local (`useState` in Header/Hero/AppointmentForm/Reveal).
- Prisma Client is a global singleton via `globalThis` (dev hot-reload
  safety).

### API Patterns

- `POST /api/appointments` — manual validation (no schema library), fixed
  -window in-memory rate limit (5 req / 10 min / IP), Prisma insert; JSON
  errors safe to display verbatim; response never echoes PII back.
- `POST /api/auth/login` / `POST /api/auth/logout` — same validation
  doctrine; generic 401 (no user enumeration); login limiter 10 / 10 min /
  IP; httpOnly SameSite=Lax session cookie signed with `AUTH_SECRET`.
- `GET /api/health` — `SELECT 1` probe; 503 when down.

## Development Workflow

```bash
bun install && bun run db:push && bun run db:seed   # setup (once)
bun run dev                       # http://localhost:3000, logs to dev.log
```

Gate before committing/pushing (in order):

```bash
bun run lint && bun run typecheck && bun run test && bun run build
bun run test:e2e                  # requires the build above
```

Env determinism: the `dev`/`build`/`db:*` scripts strip ambient
`DATABASE_URL` (`env -u`) so the repo `.env` is authoritative; production
`start` keeps ambient env (DEPLOYMENT.md §4). Dotenv gotcha: escape a
leading `$` in values (`\$Abcd1234`) or interpolation silently empties it.

Read `dev.log` (tail) after any dev-server work — hydration errors and
failed API calls surface there. `AGENTS.md` holds the condensed
non-obvious-rules list; this file holds the reasoning.

## Testing Strategy

- **Unit (Vitest):** pure seams only — the SQLite URL resolution contract
  (`tests/db-path.test.ts`, 15 cases), the staff-auth crypto contract
  (`tests/auth.test.ts`, 18 cases: scrypt round-trips, salt uniqueness,
  HMAC tamper/expiry rejection, env fallback rules, login timing
  equalization via DUMMY_HASH), the dependency contract
  (`tests/deps.test.ts`, 4 cases: runtime/dev allowlist set
  equality, no removed scaffold package creeps back, `scripts/` holds only
  `seed.ts`), the appointment validation seam (`tests/validation.test.ts`,
  18 cases: impossible-calendar-date rejection, specialty allowlist
  derived from content.ts, bounds and defaulting), and the rate-limit seam
  (`tests/rate-limit.test.ts`, 10 cases: last-token XFF keying, window
  expiry, max boundary, body cap).
- **E2E (Playwright):** five spec files — `mobile-navigation` (the
  user-facing chrome contract + Tailwind v4 trap guards), `landing`
  (section content, anchors, FAQ, CTA scroll, tel: uniformity),
  `appointment-form` (happy path + 422 validation + 422 UI field errors +
  429 + 413 + impossible dates + health), `legal-pages`, `auth` (login
  page, wrong credentials, session cookie contract incl. sameSite/Secure,
  dashboard guard, logout, full public-form→dashboard loop, enumeration
  parity). Single worker, shared scratch DB (`db/e2e.db`), standalone
  server on :3100.
- **Parity methodology:** computed-style assertions must read the right
  property per engine (v4 uses standalone `rotate`/`scale` properties);
  colors are rasterized to pixels (oklab vs rgba string formats), never
  string-compared; hover states are not assertable in touch-emulating
  headless browsers (`@media (hover: hover)` wrapping).

## Code Quality Standards

- TypeScript strict; no `any` in application code (bought exceptions:
  `ref as never` for the polymorphic Reveal tag).
- ESLint flat config (`eslint.config.mjs`) including
  `react-hooks/set-state-in-effect` — don't silence it; restructure (the
  Reveal component shows the pattern: sync setState in effects is a smell,
  initial state must be computable at render time).
- Comments explain WHY (engine traps, cascade reasoning), never WHAT.

## Git & Version Control

- Conventional Commits, atomic scopes.
- `main` only — no feature branches in this repo's workflow.
- Push to the SSH remote via `docs/ssh_git_wrapper_v3.py` (runbook:
  `docs/how-to-git-push-using-ssh-wrapper_SKILL.md`); the gate in
  "Development Workflow" above is the precondition (no hosted CI exists).
- Never commit keys, `.env`, or `db/*.db` (all gitignored).

## Error Handling & Debugging

- API routes return actionable JSON errors (`{error, fields?}`); the form
  surfaces them verbatim and keeps user input on failure.
- Console logging is structured (`[api/appointments] persistence failed`)
  and never logs PII payloads.
- Known debugging playbook entries: unhydrated page on 127.0.0.1 →
  `allowedDevOrigins` (set); transparent nav pill → bare-HSL theme
  regression (see trap log); e2e color mismatch on format → rasterize,
  don't string-match.

## Communication & Documentation

- `README.md` — user-facing overview, quick start, API, design tokens.
- `AGENTS.md` — condensed agent rules (read this first when working).
- `Project_Architecture_Document.md` — ADRs, layer model, full reference.
- `docs/Tailwind-V4-Validation-Report.md` — the v3→v4 trap log (append new
  engine-variance findings here).
- `docs/screenshots/` — captured states of the running app.

## Project-Specific Standards

### Tailwind v4 engine traps (all live in this repo)

1. Bare-HSL triplets under `@theme inline` resolve transparent — tokens are
   full `hsl()` values.
2. v4 default palette/oklab conversions drift 1–3 units — pin
   `--shadow-sm` to the v3 geometry; tolerate ±1/255 on opacity-modified
   colors.
3. `bg-gradient-to-*` interpolates in oklab — parity gradients use the
   arbitrary sRGB `bg-[linear-gradient(…)]` form.
4. `space-y-*` selector rewrite (zero-specificity `:where()`,
   margin-block-end) — stacked UI uses grid + per-child padding.
5. Important modifier moved to suffix (`text-sm!`).
6. v4 standalone `rotate`/`scale`/`translate` properties — computed-style
   assertions must read the right property.

### Section-id contract

`#top #about #services #insurance #providers #contact #faq` — nav links,
scroll-spy thresholds, CTA scroll targets, and e2e specs bind to these.

### Content discipline

All user-facing copy changes go through `src/lib/content.ts` (verbatim
reference copy today). Do not inline copy edits into components.

## Success Metrics

- Verification gate green (lint 0, tsc 0 under true strict, 65/65 unit,
  build OK, 34/34 e2e).
- Parity spot-checks: page height 7490px; services h2 60px/63px lh; h3
  20px/25px; about rows 40px; mobile menu panel 192×148, bg rgb(38 74 57
  / 0.9).
- Auth loop: public form submit → 201 → row visible on the authenticated
  dashboard; wrong credentials → generic 401; anonymous `/dashboard` →
  307 to `/login`.

## System Integration

Single deployable (Next standalone server + SQLite file). No external
services at runtime; the media under `public/media/` is vendored from the
reference CDN.
