# Remediation Plan — Session 20 (Last XFF-less e2e Request Closure, Vitest Config Modernization, Doc Residuals & Seed Restoration)

**Date:** 2026-10-05
**Scope:** Full re-audit of the session-18 tree (`e494d1c` + the
docs-only `af5b493` — the operator transcript paste that became
`docs/session_19.md`), with live re-verification against the reference
site, then remediation of the new findings. The repo `skills/` folder is
excluded from checking, testing and compilation per the operating
instructions.
**Method:** `skills/code-review-and-audit` doctrine (static gates +
`bun audit` + a fresh-eyes full review dispatched as a read-only
sub-agent — every finding re-verified empirically or line-by-line by
the orchestrator before acceptance), `skills/agent-browser` live parity
probes on both the reference and the local clone (desktop 1440×900 +
mobile 390×844), `skills/test-driven-development` doctrine — the green
95-unit + 43-e2e suite is the characterization net; every behavior
change gets a failing test first.

---

## Part 1 — Audit Findings

### 1.1 Verified healthy (re-confirmed this session)

| # | Check | Evidence |
|---|-------|----------|
| H1 | Lint / type gate | `bun run lint` → 0 errors (14 correctness rules ON); `bun run typecheck` → clean under true strict |
| H2 | Unit layer | `bun run test` → 95/95 (db-path 15 + auth 19 + deps 4 + validation 27 + rate-limit 20 + status 10) |
| H3 | Production build | `bun run build` → OK; route table identical to the documented session-18 one (4 static + `/_not-found` + 5 dynamic API + `/dashboard`) |
| H4 | E2E layer | `bun run test:e2e` → 43/43 (appointment-form 10 + appointments-status 2 + auth 9 + landing 12 + legal-pages 3 + mobile-navigation 7; 53s, single worker) |
| H5 | Environment | Fresh workspace bootstrap this session (workspace was reset): `bun install` (424 pkgs), `.env` recreated (`DATABASE_URL="file:../db/custom.db"` + operator credentials + `AUTH_SECRET`, leading-`$` escaped), `db/custom.db` pushed + seeded at the repo root, dev server healthy (`/api/health` → `{"ok":true,"database":"up"}`); the ambient `DATABASE_URL` hijack (`file:/home/z/my-project/db/custom.db`) is ACTIVE in the shell — the npm-script `env -u` guards held through every probe |
| H6 | Live landing parity | Reference vs clone at 1440×900 (agent-browser, same session, same method, viewport verified via `innerWidth/innerHeight` before every measurement): page height **7490px both**; h2 `60px/63px/400` both; h3 `20px/25px/400` both; 8 `<section>` elements with the identical id set both; `<main>` present both; reference `<title>` still the `Base44 APP` placeholder (recorded deviation, e2e-pinned) |
| H7 | Mobile navigation (operator's key concern) | Panel geometry **byte-exact both sides**: `192×148 @ (178, 80)`, `display: grid`, radius `24px`, padding `8px`; reference paints `rgba(38,74,57,.9)` while the clone computes the oklab equivalent (documented v4 format variance; e2e rasterizes the pixel); 3 identical links (About us / Services / Insurance); `aria-expanded` contract on both |
| H8 | Mobile menu behavior | Link activation closes + unmounts the panel and jumps: `#services` lands at viewport top **0.421875 on BOTH sites** (same-session, same-method measurement) — identical to the pixel |
| H9 | Staff auth loop + status transitions | Login `200` + httpOnly cookie → `/dashboard` `200` → public form POST `201` → PATCH confirm `200 {status:"confirmed"}` → PATCH complete `200 {status:"completed"}` → dashboard renders the row with the Completed badge + `role="status"` live region; anonymous PATCH → `401`; unknown id → `404`; invalid status → `422` |
| H10 | Session-18 fixes | Sub-agent + orchestrator verified: `role="status"` on the badge (dashboard/page.tsx:258-266 + Red-first e2e pin); `UI_KEY 198.51.106.x` on the two appointment-form browser submits; `APPOINTMENTS_UI_KEY 192.0.5.x` + `LOGIN_UI_KEY 192.0.6.x` in auth.spec; `LOGIN_UI_KEY 198.51.107.x` + `PATCH_KEY` injection in appointments-status; landing.spec.ts:158 comment corrected to FAQ |
| H11 | Security scans | `bun audit` → exactly the same two known dev-tooling advisories (braces via eslint-config-next, deepmerge-ts via prisma) — documented and accepted; security headers + no `X-Powered-By` live-verified on `/`, `/dashboard` 307, 404, and both POST routes; the framework-308 limitation re-confirmed (no headers, e2e-pinned) |
| H12 | dev.log health | Zero errors, zero unhandled rejections, zero hydration warnings through every probe |
| H13 | Scandihaven tech-stack review | `AGENTS.md`/`CLAUDE.md`/`Project_Architecture_Document.md`/`scandihaven_SKILL.md` reviewed — same substrate doctrine (Next 16 App Router + React 19 + TS strict + Tailwind v4 CSS-first + Vitest/Playwright); no pattern this repo is missing for its (single-app, API-route) shape — ADRs already document the deliberate divergences |

### 1.2 Issues found (remediation required)

All findings verified by the orchestrator (live probe or line-by-line
read) before acceptance; none is a regression of a documented fix. No
Critical/High/Medium — the code, security, and parity surfaces held
under every probe shape tried; the findings are one last test-determinism
residual, two doc residuals, an environment-state note, and one tooling
modernization.

| ID | Severity | Finding | Evidence |
|----|----------|---------|----------|
| F1 | **Low (test determinism + doc-claim accuracy)** | **`tests/e2e/auth.spec.ts:148-151` — the "login rejects a malformed payload with a field map" test posts to `/api/auth/login` with NO XFF header — the ONLY request in the entire suite that still lands in a shared limiter bucket ("unknown").** The login limiter counts BEFORE validation (`src/app/api/auth/login/route.ts` — `rateLimited(clientKey(request))` is the first statement) and `clientKey()` degrades to `"unknown"` without XFF/x-real-ip. With the login limit of 10/10-min and 1 XFF-less login POST per run, the **11th consecutive run inside one 10-minute window** against a `reuseExistingServer` instance receives 429 where the test asserts 422 → flake. This contradicts the session-18 claims "no request the suite makes touches the shared 'unknown' limiter bucket … within or across runs" (AGENTS.md testing-quirks, CLAUDE.md testing section, SKILL.md frontmatter). Same defect class session-18 F8 closed — the fix moved the login flake horizon from 3 runs to 10 runs, but the docs again claim "never". | auth.spec.ts:148-151 read (no `headers` on the request.post); login route limiter ordering read; rate-limit.ts clientKey read; playwright.config.ts `reuseExistingServer: !process.env.CI` |
| F2 | **Info (doc completeness)** | README.md:181 — the Testing-block Vitest row still enumerates only 5 seams ("db-path + auth + deps + validation + rate-limit"), omitting the **status** seam (session-18 F11 fixed the :72 Architecture row but missed :181). README.md:73 — the Architecture E2E row lists 5 surfaces and omits the 6th spec file (**appointments-status**). | README reads vs the 6 unit files + 6 spec files |
| F3 | **Info (environment state, no repo defect)** | `db/custom.db` holds **0 appointment rows** — the workspace was reset before this session (fresh `db:push` + `db:seed`), so session-18's documented "6 realistic seed rows retained" state no longer exists. The dashboard renders its empty state until rows are recreated. | Read-only `bun:sqlite` count probe |
| F4 | **Info (tooling modernization)** | Every `bun run test` prints a Vite deprecation warning: *"ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"`"*. Cosmetic, zero gate impact; disappears by renaming `vitest.config.ts` → `vitest.config.mts` (the repo has no `"type"` field, so `.ts` configs load as CJS). Two living references to the filename must move with it: `health-care-clinic_SKILL.md:122` and the `playwright.config.ts:10` comment. | Warning text captured from a live run; grep for filename references |

### 1.3 Considered and deliberately NOT remediated (doctrine)

| Item | Decision | Rationale |
|------|----------|-----------|
| Transition-graph enforcement on PATCH | Skip (unchanged) | Documented session-16 decision: the seam validates the VALUE only; staff may jump states legitimately; `updatedAt` stamps the audit trail. |
| Purging credentials from git history | Skip (unchanged) | Never rewrite pushed main; docs stopped carrying the literal in S16/S18. |
| CSP / full security headers on the framework's 308 | Skip (unchanged) | Documented limitation + e2e characterization pin (S16 F1); middleware contradicts the no-middleware ADR. |
| Dashboard filtering / CSV export | Skip — future-session candidate (unchanged) | Beyond-parity surface; no operator ask this session; the audit found no feature gap. Scope discipline. |
| `aria-controls` dangling + focus-to-body after menu-link activation | Keep (unchanged) | Documented parity behavior (the reference unmounts the panel too — probed session 8). Fixing would DEVIATE from the reference DOM/behavior contract. |
| 11-run e2e repro as the F1 Red test | Red at the API level instead | An 11-consecutive-e2e-run proof takes ~10 minutes and re-triggers the exact limiter window it diagnoses; the API-level double-check (11 XFF-less POSTs → 429 on #11) plus the line-level spec read proves the same poisoning with less flake theater. The post-fix grep proof (zero XFF-less request-level POSTs/PATCHes across the suite) is the structural acceptance. |

---

## Part 2 — Remediation Plan (TDD)

All changes land on `main` (no new branches). `skills/` stays out of
lint/typecheck/test/build. Behavior changes get failing tests first; the
full gate re-runs after every phase.

### Phase 1 — Red evidence (the TDD net)

1. **F1 Red (API-level):** against the running dev server, issue 11
   consecutive XFF-less `POST /api/auth/login` requests (the exact shape
   auth.spec.ts:149 makes — `{email:"not-an-email", password:""}`) and
   observe the poisoning: attempts 1..10 → 422, attempt 11 → **429**
   (the login limiter's "unknown" bucket exhausted — the same bucket the
   e2e suite's one XFF-less request feeds). This empirically pins the
   residual the session-18 claim overcovered. (The dev server's unknown
   bucket self-expires in 10 min; the e2e server is separately keyed.)

### Phase 2 — The last per-run key (F1, Green)

2. **`tests/e2e/auth.spec.ts`** — new module constant
   `MALFORMED_KEY = `192.0.7.${process.pid}`` (next in the file's
   192.0.2-6.x sequence, spec-unique third octet, pid-derived — same
   doctrine as every other key in the file; 192.0.7.x is disjoint from
   every base in every spec: this file uses 192.0.2-6.x + 198.51.100.x,
   appointment-form uses 198.51.101-103.x + 198.51.106.x +
   203.0.113.x/198.51.100.x inline, appointments-status uses
   198.51.104-105.x + 198.51.107.x). The malformed-payload test's
   `request.post` gains `headers: { "X-Forwarded-For": MALFORMED_KEY }`.
   The file's key comment block documents the session-20 closure —
   after this change the claim "no request the suite makes touches the
   'unknown' bucket" is exactly true for EVERY request, request-level
   AND browser-driven.
3. **Structural acceptance (grep):** across all six spec files, every
   `request.post`/`request.patch`/`page.route` POST/PATCH site either
   carries an explicit XFF header, injects one via route.continue, or
   aborts before reaching the server — zero XFF-less writes remain.

### Phase 3 — Vitest config modernization (F4, Green)

4. **`git mv vitest.config.ts vitest.config.mts`** — same content (ESM
   syntax now loads natively; the deprecation warning disappears).
   Update the two living references: `health-care-clinic_SKILL.md:122`
   and the `playwright.config.ts:10` comment (`vitest.config.mts`).
   Historical `docs/session_*.md` transcripts stay untouched (immutable
   records). Acceptance: `bun run test` → 95/95 with NO deprecation
   warning in the output.

### Phase 4 — README residuals (F2, Green)

5. **README.md:181** — Testing-block Vitest row gains the status seam:
   "db-path + auth + deps + validation + rate-limit + status seams".
   **README.md:73** — Architecture E2E row gains the 6th surface:
   "Landing, mobile nav, form, legal pages, auth loop, appointment
   status management".

### Phase 5 — Seed rows restored (F3)

6. Purge this session's probe row ("Parity Loop Probe S20"); recreate
   the documented realistic state: 6 seed rows via the public API
   (unique spoofed XFF keys, varied specialties/phones/dates) with
   statuses set through the real PATCH API (2 confirmed / 2 new /
   2 completed — double-duty live probe of the exact surface the
   dashboard screenshots show).

### Phase 6 — Full verification (the TDD net)

7. `bun run lint && bun run typecheck && bun run test && bun run build
   && bun run test:e2e` — acceptance: lint 0 under the 14 ON rules,
   tsc clean, 95/95 unit (no Vite warning), build identical route
   table, e2e 43/43 — plus the **double-run proof**: a SECOND
   consecutive `test:e2e` within the 10-min window against the reused
   server must ALSO be 43/43 (the practical F1 acceptance; the
   structural grep from Phase 2 covers the 11-run horizon the
   double-run cannot reach in reasonable time).
8. Live parity re-verification on the remediated tree (7490px both;
   mobile panel 192×148 @ (178,80); link-click 0.421875 both) + the
   full product loop with status transitions.

### Phase 7 — Screenshots

9. Re-capture the 20-screenshot set into `docs/screenshots/` from the
   dev server running the remediated tree (desktop hero/sections/full,
   mobile hero/menu/services, legal pages, appointment form states,
   login, dashboard desktop/mobile — `03-desktop-full.png` must measure
   exactly 1440×7490).

### Phase 8 — Session docs, commit, push

10. `docs/session_20.md`; repo `worklog.md` entries (orchestrator +
    sub-agent 20-a); SKILL.md → v2.8.1 with the [S20] change note
    (frontmatter project_state line + the vitest.config.mts rename +
    the F1 closure); PAD `[S20]` revision block; `.env.example`
    re-verified (no env changes this session).
11. Conventional Commits message on `main`; push via
    `docs/ssh_git_wrapper_v3.py` per the runbook (operator key from
    the session brief; shredded after push; remote ref verified).

### Validation of this plan against the codebase (pre-execution)

- F1 verified: auth.spec.ts:148-151 read — the request.post carries NO
  headers argument (every sibling test in the file passes one); the
  login route's limiter runs before body validation; `clientKey()`
  returns "unknown" for XFF-less requests ✔
- F2 verified: README:181 + README:73 read against the 6 unit files and
  6 spec files ✔
- F3 verified: live read-only DB count = 0 rows (the audit's bun:sqlite
  probe) ✔
- F4 verified: the warning text captured from a live `bun run test`;
  `vitest.config.ts` references enumerated (SKILL.md:122,
  playwright.config.ts:10 — the only living-doc mentions; PAD §3.2 tree
  does not list it by name; historical session_*.md transcripts are
  immutable records) ✔
- Key-space collision check for MALFORMED_KEY 192.0.7.x: grep of every
  XFF constant across the six spec files — no existing 192.0.7 base ✔
- TDD Red expectation checked: the API-level 11-POST proof targets the
  documented limiter contract (10/10-min), not an implementation detail ✔
- Parity safety: F1 touches ONLY a test file; F4 renames a config file
  (outside `src/`); F2/F3 touch docs and data — the landing surface is
  untouched ✔
