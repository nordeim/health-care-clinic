# Remediation Plan — Session 4 (Re-Audit & Parity Re-Verification)

**Date:** 2026-10-05
**Scope:** Full re-audit of the session-2 remediated tree (`4416c37`…`3b549b1`)
with live re-verification against the reference site, plus targeted
remediation of the residual findings. The repo `skills/` folder is excluded
from checking, testing and compilation per the operating instructions.
**Method:** `skills/code-review-and-audit` native-CLI fallback pipeline
(Phases 1/2/4 run directly; Phase 3 manual matrix review),
`skills/agent-browser` for live parity probes, `skills/tdd` doctrine for the
one behavior-pinning change.

---

## Part 1 — Audit Findings

### 1.1 Verified healthy (re-confirmed this session)

| # | Check | Evidence |
|---|-------|----------|
| H1 | Lint gate | `bun run lint` → 0 errors |
| H2 | Type gate | `bun run typecheck` → clean (TS strict) |
| H3 | Unit layer | `bun run test` → 29/29 (db-path 15 + auth 14) |
| H4 | Production build | `bun run build` → OK; routes: `/`, `/login`, `/privacy-policy`, `/accessibility-statement` static; `/api/*`, `/dashboard` dynamic |
| H5 | E2E layer | `bun run test:e2e` → 27/27 (5 spec files, single worker, scratch `db/e2e.db`) |
| H6 | Live landing parity | Reference vs clone, both at 1440×900: page height **7490px both**; h2 `60px/63px w400` both; h3 `20px/25px w400` both; identical h1 copy, FAQ summaries, footer facts, CTA labels |
| H7 | **Mobile navigation (operator's key concern)** | Panel geometry **byte-exact both sides**: 192×148 @ top 80, `display: grid`, radius 24px, padding 8px, paint `rgba(38,74,57,.9)` (clone computes the equivalent `oklab(...)` string — documented v4 format variance); trigger ARIA contract (`aria-expanded`, label swap); link activation closes + native anchor jump (verified in-browser: `#services` reaches top 0, menu closed); Escape/outside-click close; 1023/1024 breakpoint symmetry — all pinned by 6 e2e specs |
| H8 | Tailwind v4 traps 1–6 | Mitigations verified in `src/app/globals.css` (full `hsl()` tokens), `@theme inline` pinned `--shadow-sm`, sRGB arbitrary gradients, grid menu (no `space-y`), suffix `!important`, `allowedDevOrigins` in `next.config.ts` |
| H9 | Env determinism | `POST /api/appointments` → 201; row verified in `<repo>/db/custom.db` (`Audit Probe Session3`); `env -u DATABASE_URL` guards present on `dev`/`build`/`db:*` scripts; no ambient `DATABASE_URL` in this session's shell |
| H10 | Staff auth loop | Browser login with the operator credentials → `/dashboard`; stats cards render; submitted row appears (Total/New today/Upcoming/Top specialty all correct); logout works; anonymous `/dashboard` → redirect (e2e-pinned) |
| H11 | Runtime hygiene | No page errors, no hydration errors in `dev.log`; `GET /api/health` → `{"ok":true,"database":"up"}` |
| H12 | Secrets | None in `src/`, `tests/`, `scripts/`; `.env` + `db/*.db` gitignored (fresh clone confirmed both absent from the tree) |
| H13 | Legal pages | `/privacy-policy` + `/accessibility-statement`: identical h1 and section headings vs reference |
| H14 | Session-2 code review | `src/lib/auth.ts`, `api/auth/login|logout`, `login/page.tsx`, `dashboard/page.tsx`, `LoginForm`, `LogoutButton`, `scripts/seed.ts`, `global-setup.ts` — all conform to the documented doctrine (generic 401, constant-time compares, no PII echo, guard order session → admin row → queries) |

### 1.2 Issues found (remediation required)

| ID | Severity | Finding | Evidence |
|----|----------|---------|----------|
| F1 | **Low (docs)** | **`health-care-clinic_SKILL.md` §19 records the wrong destructive token.** Doc says `destructive hsl(0 84% 60%)`; the code AND the live reference both say `0 72% 52%` (verified via `getComputedStyle(document.documentElement)` on the reference). Pure documentation bug — the code is correct. | `src/app/globals.css:80` vs `health-care-clinic_SKILL.md:488` |
| F2 | **Low (docs/tests)** | **The document-title deviation from the reference is real, deliberate, and undocumented — and untested.** The reference site's `<title>` is the Base44 platform placeholder `"Base44 APP"` on every route (landing + legal pages). The clone intentionally uses semantic titles (`"Green Grove Family Clinic"`, `"Privacy Policy — Green Grove Family Clinic"`, …). Per the repo's own parity doctrine ("every forced deviation is recorded"), this deviation must be recorded in the deviation log; and since no e2e spec asserts `toHaveTitle`, the decision is unpinned — a future refactor could silently regress it either way. | `agent-browser get title` on both sites; `grep toHaveTitle tests/e2e/*` → no matches |
| F3 | **Info (accepted risk, re-verified)** | The two dev-tooling advisories from session 2 (`braces <=3.0.3` via eslint-config-next; `deepmerge-ts <8.0.0` via prisma) remain **unfixable upstream**: npm's latest published `braces` is 3.0.3 itself (no patched release exists — a `resolutions: {"braces": "^3.0.4"}` override fails to resolve, verified experimentally), and prisma pins `deepmerge-ts <8`. Both are stack-exhaustion DoS in build/dev-time toolchains only — zero runtime exposure for the standalone server. Documented accepted risk, re-verified this session. | `bun audit`; `npm view braces versions` → max 3.0.3 |
| F4 | **Info** | `docs/screenshots/` holds session-2 captures. Refresh the key states (hero, mobile menu, appointment flow, login, dashboard desktop + mobile) so the docs picture the current tree. | File mtimes vs current HEAD |
| F5 | **Info** | Session bookkeeping: this session needs its log (`docs/session_4.md`), a `worklog.md` entry, and the SKILL.md validation-history append + version bump. | Repo convention (session_1/2/3.md exist) |

### 1.3 Not-a-finding (explicitly re-checked, no action)

- The operator-referenced dashboard image
  (`docs/health-care-clinic-dashboard.png`) still does not exist — not in the
  local tree and HTTP 404 on GitHub (raw + blob). The reference SPA still has
  no login/dashboard (its complete route table remains `/`,
  `/privacy-policy`, `/accessibility-statement`). The repo's staff
  `/login` + `/dashboard` extension (ADR-009), seeded with the operator
  credentials, remains the correct fulfillment of the operator's expectation —
  re-verified working end-to-end this session (H10).
- `vitest.config.ts` + `playwright.config.ts` already exist and are
  structurally correct (verified by green runs) — the "add vitest and
  playwright" instruction is satisfied by maintenance, not addition.
- `.env.example` matches the codebase (all five variables consumed;
  `db:push`/`db:seed`/`AUTH_SECRET` all real).

---

## Part 2 — Remediation Plan

All changes land on `main` (no new branches). The `skills/` folder stays out
of lint/typecheck/test/build paths (ESLint `ignores` + tsconfig `exclude` —
re-verified). Doc-only fixes need no tests; the one behavior-pinning change
lands as a new e2e assertion.

### Phase 1 — Documentation accuracy (F1, F2 record)

1. **`health-care-clinic_SKILL.md` §19** — correct the destructive token to
   `hsl(0 72% 52%)` (matches code + reference).
2. **`docs/Tailwind-V4-Validation-Report.md`** — append a "Recorded
   deviations beyond CSS parity" note: the reference's `<title>` is the
   Base44 platform placeholder `Base44 APP`; this repo deliberately uses
   semantic per-route titles. Rationale: a platform artifact is not a design
   decision to preserve; SEO/accessibility correctness wins. This closes the
   "every forced deviation is recorded" gap.

### Phase 2 — Pin the title decision with e2e assertions (F2 test)

3. **`tests/e2e/landing.spec.ts`** — add
   `await expect(page).toHaveTitle("Green Grove Family Clinic")` to the
   landing suite.
4. **`tests/e2e/legal-pages.spec.ts`** — add `toHaveTitle` assertions for
   both legal pages (`"Privacy Policy — Green Grove Family Clinic"`,
   `"Accessibility Statement — Green Grove Family Clinic"`).
   These are characterization pins (the behavior exists), so they should pass
   immediately — their value is regression protection for the recorded
   decision.

### Phase 3 — Screenshots (F4)

5. Restart the dev server clean; re-capture the key states with
   `agent-browser` into `docs/screenshots/` using the existing filename
   convention: 01-desktop-hero, 03-desktop-full, 04-mobile-hero,
   05-mobile-menu-open, 09-appointment-form, 10-appointment-success,
   11-login-desktop, 12-dashboard-desktop (with the audit rows visible),
   13-dashboard-mobile.

### Phase 4 — Session documentation (F5)

6. Create `docs/session_4.md` (this session's log).
7. Append the session-4 entry to `worklog.md`.
8. `health-care-clinic_SKILL.md`: bump to 2.1.0; append Session 4 to
   Appendix B (Validation History); refresh `project_state` header line.
9. Touch-ups: README testing section (27 → 29 e2e count after Phase 2 adds
   the title pins), AGENTS.md testing-quirks line if counts change, PAD
   revision block entry for session 4.

### Phase 5 — Gate, commit, push

10. Full verification gate:
    `bun run lint && bun run typecheck && bun run test && bun run build && bun run test:e2e`
11. `git add` the changed files (never `.env`, `db/*.db`, `dev.log`,
    `server.log`); Conventional Commits message; commit on `main`.
12. Push via `docs/ssh_git_wrapper_v3.py` per
    `docs/how-to-git-push-using-ssh-wrapper_SKILL.md` (operator key from the
    session brief; shredded after push; remote ref verified).

### Validation of this plan against the codebase (pre-execution)

- `src/app/globals.css:80` says `--destructive: hsl(0 72% 52%)` ✔ (F1 target)
- `health-care-clinic_SKILL.md` §19 lists the wrong value ✔ (F1 target)
- No `toHaveTitle` in any spec ✔ (F2 target — `grep -r toHaveTitle tests/` empty)
- `tests/e2e/landing.spec.ts` + `tests/e2e/legal-pages.spec.ts` exist with
  suites to extend ✔
- `docs/Tailwind-V4-Validation-Report.md` exists ✔ (F2 record target)
- Screenshot filenames 01–13 in `docs/screenshots/` ✔ (F4 targets)
- `docs/session_4.md` does not exist yet ✔ (F5 target — no clobber)
- Push runbook + wrapper exist in `docs/` ✔ (Phase 5)
