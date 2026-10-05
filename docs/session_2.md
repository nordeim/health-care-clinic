# Session 2 — Audit, Remediation & Staff Dashboard

Continuation of `docs/session_1.md`. Scope: refresh workspace → review docs
+ session logs → audit the codebase (repo `skills/` excluded from
checking/testing/compilation) → remediate → verify → document → push.

## What was audited

- Workspace refreshed to `b2a2d2b` ("update session log" — docs only, no
  code changes since `341a908`).
- Read AGENTS.md, CLAUDE.md, README.md, Project_Architecture_Document.md,
  docs/session_1.md, worklog.md — then validated the claims against the
  tree: all gates green as documented (lint 0 / tsc clean / 15 unit /
  build OK / 22 e2e).
- Ran the `skills/code-review-and-audit` tiered pipeline (native CLI
  fallback): dependency audit, secrets scan, config review, manual
  quality review of every source file.

## Key findings (full detail: docs/remediation-plan-session2.md)

1. **F1 (Critical):** an ambient exported `DATABASE_URL` (absolute path,
   parent workspace) shadowed the repo `.env` — process env beats dotenv.
   Empirical proof: a dev-server appointment POST landed in
   `/home/z/my-project/db/custom.db`, not the repo DB.
2. **F2 (High):** `.env.example` still described the OLD app ("ORBITAL"),
   documented a non-existent `db:seed` and an unconsumed `AUTH_SECRET`.
3. **F3 (Medium):** vitest.config.ts comment listed the old app's seams.
4. **F4 (Medium):** the operator brief expects a login + dashboard. The
   reference app verifiably has neither — its SPA bundle's route table is
   exactly `/`, `/privacy-policy`, `/accessibility-statement` (+404), and
   `docs/health-care-clinic-dashboard.png` does not exist on GitHub.
   **Decision (authorized best judgment):** build the staff login +
   appointments dashboard as a documented beyond-parity extension
   (ADR-009), seeded with the operator-supplied credentials.
5. **F5 (Low):** two high-severity advisories in dev-tooling transitive
   deps (`braces` via eslint-config-next, `deepmerge-ts` via prisma) —
   dev-time only, accepted risk.

## What was remediated (TDD)

- **Env determinism (ADR-010):** `dev`/`build`/`db:push`/`db:migrate`/
  `db:reset` (+ new `db:seed`) scripts prefix `env -u DATABASE_URL`;
  production `start` deliberately keeps ambient env. Verified: new
  appointments now land in `<repo>/db/custom.db` while the parent DB is
  untouched.
- **Staff auth (ADR-008):** `src/lib/auth.ts` — scrypt password hashing
  (per-hash salt, constant-time verify) + HMAC-SHA256 session tokens
  (`AUTH_SECRET`; required in production, dev fallback warns). Prisma
  `AdminUser` model; `POST /api/auth/login` (generic 401 — no user
  enumeration; 10/10min/IP limiter; httpOnly SameSite=Lax cookie) and
  `POST /api/auth/logout`.
- **Staff surfaces (ADR-009):** `/login` (client form, site design
  system, error state) and `/dashboard` (session-guarded Server
  Component: stats cards — total / new today / upcoming / top specialty —
  plus the latest-100 requests table, View-site link, logout). Both
  unlinked from the landing page and `noindex`.
- **Seeding:** `scripts/seed.ts` + `bun run db:seed` (upsert = password
  rotation). Found + documented the dotenv `$`-interpolation trap
  (`ADMIN_PASSWORD="\$Abcd1234"`).
- **.env.example** rewritten to match the real codebase (F2);
  **vitest.config.ts** comment corrected (F3).

## Testing (TDD: red → green at every step)

- New unit layer: `tests/auth.test.ts` — 14 cases (scrypt round-trips,
  salt uniqueness, malformed-hash rejection, HMAC tamper/expiry/secret
  rejection, env fallback rules). **29/29 unit total.**
- New e2e layer: `tests/e2e/auth.spec.ts` — 5 cases (login page render;
  wrong credentials → generic error + no cookie; anonymous `/dashboard`
  → redirect; full loop public-form → dashboard visibility → logout →
  guard re-check; 422 field map). Global-setup now seeds the e2e staff
  account. **27/27 e2e total.**
- Full gate green: lint 0 / tsc clean / 29 unit / build OK / 27 e2e.

## In-browser verification (agent-browser)

- Mobile navigation re-verified on the remediated build at 390×844:
  panel 192×148, radius 24px, grid layout; open/close glyph + ARIA swap;
  link click closes + jumps to `#services` (section top = 0); Escape
  closes + restores focus to the trigger.
- Login → dashboard flow exercised with the operator credentials via the
  real UI (fill → sign in → stats + table render with the live
  submission → sign out → anonymous `/dashboard` bounces to `/login`).
- VLM visual review of the new screenshots: clean, consistent, no
  glitches.

## Screenshots (docs/screenshots/)

New: `11-login-desktop.png`, `12-dashboard-desktop.png`,
`13-dashboard-mobile.png`. Refreshed on the remediated build:
`04-mobile-hero.png`, `05-mobile-menu-open.png`.

## Documentation alignment

README (features/API/env/screenshots/troubleshooting), AGENTS (commands,
rules 8–10, testing quirks), CLAUDE (identity, file org, API patterns,
testing strategy, success metrics), PAD (v1.1.0 — ADR-008/009/010,
topology, known issues, key files), DEPLOYMENT.md (env-var table, seed
step, cookie/proxy notes). New: `health-care-clinic_SKILL.md` (20-section
distilled skill), `docs/remediation-plan-session2.md`.

## Outcome

Committed to `main` and pushed via the SSH wrapper
(`docs/ssh_git_wrapper_v3.py`, runbook
`docs/how-to-git-push-using-ssh-wrapper_SKILL.md`); remote verified at
the pushed SHA, operator key shredded after push per the runbook.
