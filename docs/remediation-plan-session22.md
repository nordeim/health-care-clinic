# Remediation Plan — Session 22 (Credential-Hygiene Closure, db-Path Decode Hardening, Doc-Claim Honesty, Parity Re-Verification)

**Date:** 2026-10-06
**Scope:** Full fresh-eyes audit of the session-20 tree (`035e97b` + the
docs-only `c908209` — the operator transcript paste that became
`docs/session_21.md`), with live re-verification against the reference site,
then remediation of the new findings. The repo `skills/` folder is excluded
from checking, testing and compilation per the operating instructions.
**Method:** `skills/code-review-and-audit` doctrine (static gates +
`bun audit` + a fresh-eyes full review dispatched as a read-only sub-agent —
every finding re-verified empirically or line-by-line by the orchestrator
before acceptance), `skills/agent-browser` live parity probes on both the
reference and the local clone (desktop 1440×900 + mobile 390×844, viewport
verified via `innerWidth`/`innerHeight` before every measurement),
`skills/test-driven-development` doctrine — the green 95-unit + 43-e2e suite
is the characterization net; every behavior change gets a failing test first.

---

## Part 1 — Audit Findings

### 1.1 Verified healthy (re-confirmed this session)

| # | Check | Evidence |
|---|-------|----------|
| H1 | Lint / type gate | `bun run lint` → 0 errors (14 correctness rules ON; `--print-config` shows the full react-hooks v7 recommended set additionally active); `bun run typecheck` → clean under true strict |
| H2 | Unit layer | `bun run test` → 95/95, warning-free on the native-ESM `vitest.config.mts` (db-path 15 + auth 19 + deps 4 + validation 27 + rate-limit 20 + status 10) |
| H3 | Production build | `bun run build` → OK; route table identical to the documented session-20 one (4 static + `/_not-found` + 5 dynamic API + `/dashboard`) |
| H4 | E2E layer | `bun run test:e2e` → 43/43 (53.8s, single worker) |
| H5 | Environment | Workspace re-bootstrapped this session (was reset): `bun install` (424 pkgs), `.env` recreated with `DATABASE_URL="file:../db/custom.db"` (the operator-specified value), `db/` created at the repo root, `db:push` + `db:seed` green, dev server healthy (`/api/health` → `{"ok":true,"database":"up"}`); the ambient `DATABASE_URL` hijack (`file:/home/z/my-project/db/custom.db`) is ACTIVE in the shell — the npm-script `env -u` guards held through every probe (re-proven when an orchestrator ad-hoc query without `env -u` failed with `Error code 14: Unable to open the database file` — exactly the documented trap, ADR-010) |
| H6 | Test infrastructure (operator ask) | `vitest.config.mts` (native ESM, `*.test.ts` only, `@` alias) and `playwright.config.ts` (single worker, shared scratch `db/e2e.db`, standalone server :3100, `reuseExistingServer: !CI`, explicit `AUTH_SECRET`) both present and verified working this session — the vitest + playwright suites the operator asked to add exist from prior sessions and are re-verified live here |
| H7 | Live landing parity (desktop) | Reference vs clone at a VERIFIED 1440×900: page height **7490px both** (the reference transiently reads 6169px mid-hydration — settle-wait before measuring); identical section id set (`top about services "" insurance providers contact faq`); h2 `60px/63px/400` both; h3 `20px/25px/400` both; `<main>` present both; reference `<title>` still the `Base44 APP` placeholder (recorded deviation, e2e-pinned) |
| H8 | Mobile navigation (operator's key concern) | Panel geometry **byte-exact both sides** at a VERIFIED 390×844: `192×148 @ (178, 80)`, `display: grid`, radius `24px`, padding `8px`; reference paints `rgba(38,74,57,.9)`, clone computes the oklab equivalent (documented v4 format variance); 3 identical links (About us / Services / Insurance); `aria-expanded` contract on both |
| H9 | Mobile menu behavior | Link activation closes + unmounts the panel and jumps: `#services` lands at viewport top **0.421875 on BOTH sites**, `scrollY 1837` both (same-session, same-method measurement) — identical to the pixel |
| H10 | Mobile page height | Reference 12164px vs clone 12162px after full settle (the reference transiently reads 8114px mid-load) — a 2px sub-pixel drift entirely inside the contact section (1834 vs 1836; every other section byte-identical: top 844 / about 993 / services 2428 / band 1285 / insurance 1107 / providers 2225 / faq 932). Recorded as an honest measurement note, not a defect: 0.016% of page height, below the imperceptibility bar the parity doctrine applies to oklab quantization |
| H11 | Tailwind v4 trap guards (live) | Canvas-rasterized paints: pill `[37,74,57,204]` (expected `[38,74,57,204]` ±1 — the documented oklab quantization), dropdown `[38,74,57,230]` exact — no bare-HSL transparency regression (trap #1); panel is a grid (trap #4 mitigation) |
| H12 | Full product loop + status transitions | login `200` + httpOnly `clinic_session` cookie → `/dashboard` `200` → public form POST `201 {ok,id}` → PATCH confirm `200 {status:"confirmed"}` → PATCH complete `200 {status:"completed"}` → dashboard renders the row; anonymous PATCH → `401`; invalid status → `422`; unknown id → `404`; anonymous `/dashboard` → `307`; logout `200`; `role="status"` live regions confirmed in the served dashboard HTML (one per row) |
| H13 | Session-20 fixes | Sub-agent + orchestrator verified: `MALFORMED_KEY = 192.0.7.${pid}` headers the malformed-payload login POST; the structural XFF grep re-proven (every request-level POST/PATCH carries an XFF header; every browser-driven write injects via `page.route`/`route.continue`); `vitest.config.mts` present; README:181/:73 rows complete |
| H14 | Security scans + dev.log | `bun audit` → exactly the two known dev-tooling advisories (braces via eslint-config-next, deepmerge-ts via prisma) — documented and accepted; security headers + no `X-Powered-By` live-verified on `/`, `/dashboard` 307, and the POST routes; dev.log zero errors / zero unhandled rejections through every probe |
| H15 | Scandihaven tech-stack review | Re-cloned and reviewed (AGENTS/PAD): same substrate doctrine (Next 16 App Router + React 19 + TS strict + Tailwind v4 CSS-first `@theme` + Vitest 5 + Playwright 1.63); its monorepo patterns (Turborepo internal packages, Drizzle/Postgres, Better-Auth, Server Actions) are deliberate ADR-logged divergences for this single-app API-route repo — no pattern missing for its shape |

### 1.2 Issues found (remediation required)

All 13 findings originate from the fresh-eyes sub-agent (Task 22-a) and were
**re-verified by the orchestrator** (live probe or line-by-line read) before
acceptance; none is a regression of a documented session-2/4/6/8/10/12/14/16/18/20
fix. Zero Critical/High/Medium — the code, security, and parity surfaces held
under every probe shape tried. The headline is a **resurrected
credential-hygiene finding** (a repeat of session-16 F5, reintroduced by this
session's own bootstrap), plus doc-claim residuals and one robustness seam.

| ID | Severity | Finding | Evidence |
|----|----------|---------|----------|
| F1 | **Low (credential hygiene)** | **The LIVE staff password equals the doc-printed example in four living docs.** The session-16 F5 "neutralization" replaced the then-live password with a NEW realistic-looking string (`$up3rS3cretPass`) — but this session's workspace bootstrap adopted that doc example as the actual `.env` value (following the prior-session bootstrap pattern), resurrecting the leak: a login-verified working credential is committed and pushed in README:241, AGENTS.md:109-110, CLAUDE.md:118, SKILL.md:299. Severity would be Medium if the GitHub remote is public (visibility unverified; treat as potentially public). | `git grep` → exactly 4 living-doc hits; `.env` value matches the literal; live login with it → `200` |
| F2 | **Low (doc staleness)** | PAD ADR-009 Consequences still says "The dashboard is a review surface only — no edit/state transitions yet (tracked in §10)" — stale since session 16; contradicts the same document's §10 row ("CLOSED in session 16"), §7.1, §11. | PAD:228-229 read vs §10:766 |
| F3 | **Low (doc completeness)** | SKILL.md §1 staff-surfaces list omits `PATCH /api/appointments/[id]`, and §5's architecture tree has the appointments `POST` line but no `[id]/route.ts` line — while the same file's `project_state` header and §20 DO list the PATCH route (the missed-sibling-row class of session-18 F5 / session-20 F2). | SKILL:50-54 + :175 read |
| F4 | **Low (doc accuracy)** | PAD §6.1 rule 6 says dates are "parsed + compared to local midnight" — the implemented rule (`toleranceFloorDate`) compares against **local midnight MINUS ONE DAY** (the session-10 west-of-server tolerance). A reader reimplementing from the PAD table would break the tolerance the unit + e2e layers pin. Live: yesterday → 201, two-days-ago → 422. | PAD:607 read; validation.ts:184-190 read; live probe |
| F5 | **Info (doc staleness)** | PAD ADR-002 heading/Decision says "four client islands" / lists 4 — the repo ships 7 (AGENTS/CLAUDE/SKILL all correctly list Header, Hero, AppointmentForm, Reveal, LoginForm, LogoutButton, StatusButton). Historical ADR whose Decision text is presently false repo-wide. | PAD:94-100 vs AGENTS:115-117 |
| F6 | **Info (stale comment)** | `src/components/dashboard/logout-button.tsx:6` — "the only interactive island on the dashboard page": false since session 16 (StatusButton is also an interactive island there). | Source read |
| F7 | **Info (doc wording)** | AGENTS.md:36-37 — "one write path (`POST /api/appointments`)": the repo ships 4 write endpoints (POST appointments, PATCH `[id]`, POST login, POST logout); the sentence means "one PUBLIC write path". | AGENTS read |
| F8 | **Info (typo)** | CLAUDE.md:90-91 — a hard line-break splits "fixed-window" into "fixed -window". | CLAUDE read |
| F9 | **Info (documented-promise nuance)** | `scripts/seed.ts` upserts by email — changing `ADMIN_EMAIL` and re-seeding leaves the PREVIOUS admin row active (no revocation path), while `.env.example` and the schema comment promise "the single staff login". | seed.ts:24-29 read |
| F10 | **Info (robustness seam)** | `src/lib/db-path.ts:93` — the module self-anchor reads `new URL(import.meta.url).pathname` WITHOUT `decodeURIComponent`: a repo path containing %-escapable characters (space, `#`, non-ASCII) fails `existsSync(self)` and silently skips the module anchor (masked in every current entry point; a latent trap for future checkouts into e.g. `~/My Projects/`). | db-path.ts:88-98 read |
| F11 | **Info (doc-vs-doc tension)** | CLAUDE.md:177-179 presents `react-hooks/set-state-in-effect` as a hard rule ("sync setState in effects is a smell"), while SKILL §6.2 + header.tsx prescribe the invoke-handler-once-in-effect pattern the rule cannot see through function indirection — one honest clarifying sentence is owed. | Both docs + `eslint --print-config` (rule active at severity 2) |
| F12 | **Info (test title overstatement)** | `tests/e2e/landing.spec.ts:132` — title says "CTA buttons smooth-scroll to the contact section" but the assertion is arrival-only (`toBeInViewport` — true for both smooth and instant); the reduced-motion twin pins the instant case. Session-18 F9 fixed the PAD's sibling wording; this title survived. | Spec read |
| F13 | **Info (doc completeness)** | PAD §3.2's docs/ subtree lists 4 of 37 entries (21 session logs, 9 remediation plans, prompts, skills-inventory.md unlisted). Possibly deliberate elision — but §3.2 was "completed" in session 18 while docs/ stayed partial. | PAD:386-394 vs `ls docs/` |

### 1.3 Considered and deliberately NOT remediated (doctrine)

| Item | Decision | Rationale |
|------|----------|-----------|
| Purging the doc literal from git history | Skip (unchanged) | Never rewrite pushed main (session-16 doctrine). The remediated literal is an obviously-invalid placeholder going forward. |
| Making seed deactivate other admin rows | Skip — document instead (F9) | A silent destructive side effect in a seed script is worse than the documented nuance; the single-admin promise holds for a fixed ADMIN_EMAIL (the documented workflow). |
| Mobile 2px contact-section drift | Skip — record as a measurement note | 2px in a 12164px page (0.016%), single section, sub-pixel rounding origin; the parity doctrine's imperceptibility bar (±1/255 quantization on colors) applies a fortiori. Desktop height and mobile panel geometry are byte-exact. |
| Dashboard filtering / CSV export | Skip — future-session candidate (unchanged) | Beyond-parity surface; no operator ask this session; scope discipline. |
| CSP / headers on the framework's 308 | Skip (unchanged) | Documented limitation + e2e characterization pin (S16 F1); middleware contradicts the no-middleware ADR. |
| `aria-controls` dangling + focus-to-body after menu-link activation | Keep (unchanged) | Documented parity behavior (the reference unmounts the panel too — probed session 8). |

---

## Part 2 — Remediation Plan (TDD)

All changes land on `main` (no new branches). `skills/` stays out of
lint/typecheck/test/build. Behavior changes get failing tests first; the full
gate re-runs after every phase.

### Phase 1 — Credential hygiene (F1) — Red first, then Green

1. **Red (the live proof of the finding):** the login probe with the
   doc-printed literal returns `200` (captured in §1.2 F1) — the leak is
   empirically confirmed before any change.
2. **Green (rotate the live credential):** `.env` `ADMIN_PASSWORD` rotates
   to a fresh generated value NOT printed anywhere; `bun run db:seed`
   upserts the new hash. Acceptance: login with the NEW value → `200`;
   login with the OLD doc literal → `401` (generic).
3. **Green (make the doc example un-adoptable):** the four doc literals
   (`README.md:241`, `AGENTS.md:109-110`, `CLAUDE.md:118`,
   `SKILL.md:299`) switch to the obviously-invalid placeholder
   `\$<your-password>` — the escaping lesson survives, no future bootstrap
   can adopt the example as a working credential (root cause of the
   resurrection: the example looked like a real strong password).
   Acceptance: `git grep` for the old literal → 0 hits in living docs; the
   live password appears in no tracked file.

### Phase 2 — db-path module-anchor decode hardening (F10) — TDD

4. **Red:** new unit tests in `tests/db-path.test.ts` for a new exported
   pure helper `moduleSelfRoot(url: string): string | null` (extracted from
   the inline anchor logic): (a) a fixture repo whose path contains a
   percent-escapable character (space) — the module URL
   `file:///<...>/esc%20dir/src/lib/db-path.ts` with the file created at
   `<...>/esc dir/src/lib/db-path.ts` — MUST return the decoded repo root
   `<...>/esc dir`; (b) a URL whose file does not exist → `null` (anchor
   skipped); (c) a non-`file:`/unparseable URL → `null`. Tests fail on
   import (the helper does not exist) — Red confirmed.
5. **Green:** implement `moduleSelfRoot` with
   `decodeURIComponent(new URL(url).pathname)` inside the existing
   try/catch shape; `candidateRoots()` anchor 2 becomes a call to it
   (behavior for non-escaped paths unchanged — the 15 existing tests are
   the characterization net). Acceptance: 95+3 unit green; the dev server
   still resolves `db/custom.db` at the repo root (`/api/health` up, a
   form POST lands in the repo DB).

### Phase 3 — Code-comment and test-title fixes (F6, F12)

6. `src/components/dashboard/logout-button.tsx:6` — drop "only" ("an
   interactive island on the dashboard page" — StatusButton shares it).
7. `tests/e2e/landing.spec.ts:132` — title "CTA buttons scroll to the
   contact section" (the assertion is arrival-only; the reduced-motion
   twin pins instant-jump). Test-file-only; no behavior change; the e2e
   suite re-runs green.

### Phase 4 — Doc-claim honesty pass (F2, F3, F4, F5, F7, F8, F9, F11, F13)

8. **PAD** (F2) ADR-009 Consequences → "status transitions shipped in
   session 16 (PATCH `/api/appointments/[id]` — see §7.1/§10)"; (F4) §6.1
   rule 6 → "parsed + compared to local midnight − 1 day (west-of-server
   tolerance — `toleranceFloorDate`)"; (F5) ADR-002 heading annotated
   "(extended to seven islands by ADR-008/009 — see AGENTS.md for the
   current list)"; (F13) §3.2 docs/ subtree gains the session-log/
   remediation-plan families + a one-line "transcripts, not architecture"
   note.
9. **SKILL.md** (F3) §1 staff surfaces += `PATCH /api/appointments/[id]`
   (session-guarded); §5 tree += the `[id]/route.ts` line.
10. **AGENTS.md** (F7) "one write path" → "one public write path … (plus
    the staff write paths: PATCH `[id]`, login, logout)".
11. **CLAUDE.md** (F8) the split "fixed -window" → "fixed-window"; (F11)
    one honest sentence at the set-state-in-effect rule noting the
    function-indirection blind spot and pointing at header.tsx as the
    sanctioned pattern.
12. **F9 documentation:** `scripts/seed.ts` gains a comment ("upserts by
    email — changing ADMIN_EMAIL leaves the previous row able to log in;
    rotate by deleting the old row") + `.env.example`'s staff note gains
    the same caveat.

### Phase 5 — Full verification (the TDD net)

13. `bun run lint && bun run typecheck && bun run test && bun run build &&
    bun run test:e2e` — acceptance: lint 0 under the 14 ON rules, tsc
    clean, 99/99 unit (95 + 4 new), build identical route table, e2e
    43/43 — plus the **double-run proof**: a SECOND consecutive
    `test:e2e` within the 10-min limiter window against the reused server
    must ALSO be 43/43.
14. Live re-verification on the remediated tree: parity spot-checks
    (7490px desktop both sites; mobile panel 192×148 @ (178,80);
    link-click 0.421875 both) + the full product loop with status
    transitions + the F1 login probes (new password 200 / old literal 401)
    + `/api/health` DB-up check proving the Phase-2 refactor kept the
    repo-root resolution.

### Phase 6 — Screenshots

15. Re-capture the 20-screenshot set into `docs/screenshots/` from the dev
    server running the remediated tree (desktop hero/sections/full, mobile
    hero/menu/services, legal pages, appointment form states, login,
    dashboard desktop/mobile — `03-desktop-full.png` must measure exactly
    1440×7490).

### Phase 7 — Session docs, commit, push

16. `docs/session_22.md`; repo `worklog.md` entries (orchestrator +
    sub-agent 22-a); SKILL.md → v2.8.2 with the [S22] change note; PAD
    [S22] revision block; `.env.example` re-verified after the F9 caveat.
17. Conventional Commits message on `main`; push via
    `docs/ssh_git_wrapper_v3.py` per the runbook (operator key from the
    session brief; shredded after push; remote ref verified).

### Validation of this plan against the codebase (pre-execution)

- F1 verified: `git grep` enumerates exactly the 4 living-doc sites (no
  transcript/test hits); `.env` literal match + live `200` captured ✔
- F2/F3/F4/F5/F7/F8/F11/F12/F13 verified: every cited line read in
  full-context this session (§1.2) ✔
- F9 verified: seed.ts upsert read; schema has no active flag ✔
- F10 verified: db-path.ts:88-98 read; `decodeURIComponent` absent; the
  helper extraction keeps `candidateRoots()`'s ordering and the existing
  try/catch semantics; test conventions follow tests/db-path.test.ts
  (mkdtemp fixtures + toPosix) ✔
- Key-space check for the seed-restore XFF keys (198.51.108-111.x):
  disjoint from every documented base in the six spec files
  (192.0.2-7.x, 198.51.100-107.x, 203.0.113.x) ✔
- Parity safety: F1 touches `.env` (untracked) + 4 doc strings; F2-F5,
  F7-F9, F11-F13 are doc/comment-only; F6 is a comment; F12 is a test
  title; F10 is a refactor of an internal anchor with the 15 existing
  tests as the characterization net — the landing surface is untouched ✔
