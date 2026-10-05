# Remediation Plan — Session 2 (Codebase Audit & Enhancement)

**Date:** 2026-10-05
**Scope:** Full audit of the session-1 clone (`341a908`…`b2a2d2b`) plus targeted
remediation. The repo `skills/` folder is excluded from checking, testing and
compilation per the operating instructions.
**Method:** `skills/code-review-and-audit` tiered pipeline (native CLI fallback
protocol), `skills/tdd` for remediation changes, in-browser verification via
`skills/agent-browser` patterns.

---

## Part 1 — Audit Findings

### 1.1 Verified healthy (no action required)

| # | Check | Evidence |
|---|-------|----------|
| H1 | Lint gate | `bun run lint` → 0 errors (flat ESLint config, incl. `react-hooks/set-state-in-effect`) |
| H2 | Type gate | `bun run typecheck` → clean (TS strict) |
| H3 | Unit layer | `bun run test` → 15/15 (`tests/db-path.test.ts`) |
| H4 | Production build | `bun run build` → OK; routes: `/`, `/privacy-policy`, `/accessibility-statement` (static), `/api/appointments`, `/api/health` (dynamic) |
| H5 | E2E layer | `bun run test:e2e` → 22/22 incl. mobile-navigation contract + Tailwind v4 trap guards (rasterized-pixel color checks) |
| H6 | Mobile navigation | Grid (not `space-y`) dropdown — v4 Trap #4 neutralized; ARIA contract, Escape/outside-click, link-activation close, 1023/1024 breakpoint symmetry all e2e-pinned |
| H7 | Tailwind v4 traps 1–6 | All mitigated in `src/app/globals.css` + `next.config.ts` (full `hsl()` tokens, pinned `--shadow-sm`, sRGB arbitrary gradients, suffix `!important`, `allowedDevOrigins`, rasterize-don't-string-match testing doctrine) |
| H8 | Secrets hygiene | No hardcoded secrets in `src/`/`tests/`/`scripts/`; `.env`, `db/*.db`, `*.pem`, `*.key` gitignored; verified via `git ls-files` |
| H9 | Landing parity | Page height 7490px @1440×900, heading scales, card geometry — verified in session 1, spot-checked this session |

### 1.2 Issues found (remediation required)

| ID | Severity | Finding | Evidence |
|----|----------|---------|----------|
| F1 | **Critical** | **Runtime DB resolution is hijacked by an ambient `DATABASE_URL` env var.** The dev sandbox shell exports `DATABASE_URL=file:/home/z/my-project/db/custom.db` (an absolute path OUTSIDE the repo). Process env beats `.env` files, so `bun run dev` / `bun run db:push` write to the PARENT workspace database, violating the requirement that the repo-root `db/` folder be authoritative. Empirical proof: a POST to `/api/appointments` on the dev server inserted `Audit Probe` into `/home/z/my-project/db/custom.db`, NOT `<repo>/db/custom.db`. | `/proc/<pid>/environ` of the running `next-server`; row present in parent DB, absent in repo DB |
| F2 | **High** | **`.env.example` is stale — it documents the OLD app.** Header says "ORBITAL — environment configuration"; documents `AUTH_SECRET` (nothing consumed it), `bun run db:seed` (script did not exist), and "sitemap.xml, and robots.txt" (neither existed). Violates the requirement for a working `.env.example` that matches the codebase. | `.env.example` lines 1–32 vs `package.json` scripts |
| F3 | **Medium** | **vitest.config.ts comment lists the old app's test seams** ("router, clarify questions, plan sanitizer, check-in mapping") — doc rot that misleads agents. | `vitest.config.ts` header comment |
| F4 | **Medium** | **The user-facing instruction expects a login + dashboard; neither the reference app nor the clone has one.** Verified against the reference: `/login`, `/dashboard`, `/admin`, `/signin`, `/auth` all render the SPA's 404 page, and the reference bundle's complete route table is exactly `["/", "/privacy-policy", "/accessibility-statement", "*", "/engine.io"]`. The referenced dashboard image (`docs/health-care-clinic-dashboard.png`) does not exist on GitHub (HTTP 404) and is not in the local tree. **Decision (per authorized best judgment):** implement a staff login + appointments dashboard as a documented *enhancement beyond the reference*, styled with the site's own design system, seeded with the credentials supplied by the operator. This completes the product loop (public form → validated API → SQLite persistence → staff review) and matches the operator's stated expectation of logging in to see a dashboard. | Reference route table extracted from `assets/index-BvhhD2M5.js`; `curl -sI` on the GitHub image URL → 404 |
| F5 | **Low** | 2 high-severity advisories in dev-tooling transitive deps: `braces` (via `eslint-config-next`) and `deepmerge-ts` (via `prisma`). Both are build/dev-time only — no runtime exposure. No fixed versions published upstream yet. **Accepted risk, documented.** | `bun audit` |
| F6 | **Low** | Docs (README/AGENTS/CLAUDE/PAD) do not yet describe: the env-determinism fix, the auth/dashboard feature, the `db:seed` script, the new env vars. They must be updated after remediation (alignment requirement). | Doc review |
| F7 | **Info** | Sandbox workspace artifacts from session 1 exist OUTSIDE the repo: `/home/z/my-project/.env` (absolute parent DB URL — now renamed `.env.session1-backup`) and `/home/z/my-project/db/custom.db`. Not committed; documented here so future sessions don't mistake them for repo state. | `ls /home/z/my-project` |

### 1.3 Test-suite status (requested check)

Vitest and Playwright suites already exist and pass (15 unit + 22 e2e). Gaps:
- No coverage for auth (feature did not exist) — new specs added in Phase 2.
- `playwright.config.ts` and `vitest.config.ts` are structurally correct
  (single-worker SQLite sharing, `*.test.ts` vs `*.spec.ts` split) — kept,
  only the stale vitest comment is corrected.

---

## Part 2 — Remediation Plan (TDD)

Each code change lands with tests first where applicable. The repo `skills/`
folder stays out of lint/typecheck/test/build paths (it already is: ESLint
`ignores`, tsconfig `exclude` — re-verified during execution).

### Phase 1 — Database determinism (F1, F2, F3)

1. **package.json script hardening** — prefix `dev`, `build`, `db:push`,
   `db:generate`, `db:migrate`, `db:reset` with `env -u DATABASE_URL` so an
   ambient shell value can never shadow the repo `.env`. `start` (production
   standalone) intentionally KEEPS ambient env — the deployment contract
   (`docs/DEPLOYMENT.md` §4) sets `DATABASE_URL` explicitly in production.
2. **Rewrite `.env.example`** to match the real codebase: header for this app,
   `DATABASE_URL` with the resolution contract, `NEXT_PUBLIC_SITE_URL`,
   `AUTH_SECRET` (now actually consumed by the session layer), `ADMIN_EMAIL` /
   `ADMIN_PASSWORD` (seed inputs; local `.env` carries the operator-supplied
   credentials, never committed).
3. **vitest.config.ts** — replace the stale seam list with this app's seams.
4. **Verification:** restart dev server via `bun run dev`; POST an appointment;
   assert the row lands in `<repo>/db/custom.db` and the parent DB gains
   nothing.

### Phase 2 — Staff login + appointments dashboard (F4) — TDD

**Schema** (`prisma/schema.prisma`): add `AdminUser { id, email @unique,
passwordHash, createdAt }`; keep `Appointment` untouched.

**Pure seam** `src/lib/auth.ts` (unit-tested before any UI):
- `hashPassword` / `verifyPassword` — Node `scrypt` with per-hash random salt,
  constant-time verify.
- `signSession(adminId, ttl)` / `verifySession(token)` — HMAC-SHA256 over
  `adminId.exp`, `AUTH_SECRET` from env (dev fallback constant + console
  warning; production requires it).
- Cookie name/expiry constants shared by route + page.

**API** (manual validation, same doctrine as `/api/appointments`):
- `POST /api/auth/login` — trim/lowercase email, verify credentials, set
  httpOnly `SameSite=Lax` session cookie (7d), 401 on bad credentials with a
  generic message, per-IP fixed-window limiter (10 / 10 min).
- `POST /api/auth/logout` — clear cookie.

**UI** (site design system: DM Sans, cream `bg-background`, clinic green
`primary`, `rounded-[24px]` cards, underline inputs matching the appointment
form):
- `/login` — client form card; error state; redirect to `/dashboard` on
  success; **not linked from the landing page** (preserves reference parity —
  direct URL only, like the reference's own unlinked routes).
- `/dashboard` — server component; cookie → session verify → `redirect`
  to `/login` when invalid; stats cards (total requests, new today, upcoming
  preferred dates, top specialty) + latest-100 appointments table (responsive);
  "View site" link + logout.

**Seeding** — `scripts/seed.ts` + `bun run db:seed`: upsert the admin from
`ADMIN_EMAIL`/`ADMIN_PASSWORD` (defaults documented in `.env.example`). The
operator-supplied credentials go into the local `.env` only.

**Tests (written first, then implementation):**
- `tests/auth.test.ts` (Vitest): hash/verify roundtrip; wrong password fails;
  session sign/verify roundtrip; tampered token fails; expired token fails.
- `tests/e2e/auth.spec.ts` (Playwright): login page renders + a11y basics;
  wrong credentials → error, no cookie; correct credentials → dashboard with
  seeded data visible; `/dashboard` without session → redirect to `/login`;
  logout → cookie cleared, back to login.
- `tests/e2e/global-setup.ts` extended: seed an e2e admin into `db/e2e.db`.

### Phase 3 — Documentation alignment (F6)

- README: features table + architecture diagram + API table + env vars +
  screenshots index gain the auth/dashboard entries; quick start gains
  `db:seed`.
- AGENTS: command table (`db:seed`), new non-obvious rules (env `-u`
  rationale — "don't remove it"; auth seam; login not linked from landing).
- CLAUDE: testing strategy updated (new unit + e2e layers); success metrics
  renumbered.
- PAD: ADR-008 (cookie session auth via HMAC, no external auth lib), ADR-009
  (staff dashboard beyond the reference — rationale), ADR-010 (env-determinism
  `env -u` guard); topology diagram + known-issues updated.
- `docs/DEPLOYMENT.md`: env-var table gains `AUTH_SECRET`, admin seeding step.

### Phase 4 — Screenshots + full gate

- Restart dev server on the remediated codebase; capture NEW screenshots:
  `11-login-desktop.png`, `12-dashboard-desktop.png`,
  `13-dashboard-mobile.png`, plus refresh `04/05` (mobile hero + menu) to
  prove the mobile nav still works post-remediation.
- Full verification gate: `lint && typecheck && test && build && test:e2e`
  (expected: 0 / 0 / 15+7 unit / build OK / 22+5 e2e).

### Phase 5 — Commit + push

- Conventional Commits on `main` only (no new branches).
- `docs/health-care-clinic_SKILL.md` distilled via `skills/distill-codebase-skill`
  + `skills/to-distill-project-into-skill`.
- `docs/session_2.md` session log; `worklog.md` appended.
- Push via `docs/ssh_git_wrapper_v3.py` (runbook:
  `docs/how-to-git-push-using-ssh-wrapper_SKILL.md`) with the operator-supplied
  deploy key; key shredded after push per runbook.

---

## Part 3 — Plan-vs-codebase alignment review (pre-execution)

| Plan item | Codebase anchor (verified) | Aligned |
|-----------|---------------------------|---------|
| `env -u` script hardening | `package.json` scripts `dev/build/db:*` exist exactly as listed; `start` uses standalone server + ambient env (DEPLOYMENT.md §4) | ✅ |
| `.env.example` rewrite | current file verified stale (F2); nothing in code reads `AUTH_SECRET` today — Phase 2 introduces the consumer, so the example stays truthful *after* Phase 2 lands | ✅ (ordering: Phase 1 writes it, Phase 2 makes it live) |
| `AdminUser` model | `prisma/schema.prisma` single `Appointment` model; `db push` idempotent; e2e global-setup re-pushes scratch DB — extension is additive | ✅ |
| auth pure seam | `src/lib/` currently `content.ts`, `db.ts`, `db-path.ts` — no auth module exists; vitest include pattern picks up `tests/auth.test.ts` | ✅ |
| login/dashboard routes | `src/app/` has no such routes; section-id contract untouched (landing unchanged) | ✅ |
| unlinked login | reference has no login link; landing header/footer unchanged | ✅ |
| e2e single-worker SQLite | `playwright.config.ts` `workers: 1`, shared `db/e2e.db` — login spec fits the model (seeded admin, isolated DB) | ✅ |
| screenshots | `docs/screenshots/` currently 15 files, naming scheme `NN-slug.png` — new files follow it | ✅ |
| skills exclusion | ESLint flat config + tsconfig exclude `skills/`; Playwright testDir `tests/e2e` — no path crosses `skills/` | ✅ |

**Execution order is dependency-safe:** Phase 1 (env determinism) must land
BEFORE the empirical DB-location verification in Phase 4, and Phase 2's
schema change requires Phase 1's db scripts to target the repo DB so the seed
lands in the right file.
