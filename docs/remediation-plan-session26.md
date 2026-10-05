# Remediation Plan — Session 26 (E2E Time-Erosion Fix, PAD Count Residuals, Seed-State Restore, Doc-Claim Honesty)

**Date:** 2026-10-06
**Scope:** Full fresh-eyes audit of the session-24 tree (`f88ee15` + the
docs-only `7b04ac3` — the operator transcript that became
`docs/session_25.md`), with live re-verification against the reference site,
then remediation of the new findings. The repo `skills/` folder is excluded
from checking, testing and compilation per the operating instructions.
**Method:** `skills/code-review-and-audit` doctrine (static gates + a
fresh-eyes full review dispatched as a read-only sub-agent — every finding
re-verified empirically or line-by-line by the orchestrator before
acceptance), `skills/agent-browser` live parity probes on both the reference
and the local clone (desktop 1440×900 + mobile 390×844, viewport verified via
`innerWidth`/`innerHeight` before every measurement, settle-waits before
height readings), `skills/tdd` doctrine — the green 99-unit + 44-e2e suite is
the characterization net; the one test-integrity change (F4) gets a
Red/Green proof against a deliberately-broken seam before it lands.

---

## Part 1 — Audit Findings

### 1.1 Verified healthy (re-confirmed this session)

| # | Check | Evidence |
|---|-------|----------|
| H1 | Lint / type gate | `bun run lint` → 0 errors (14 correctness rules ON); `bun run typecheck` → clean under true strict |
| H2 | Unit layer | `bun run test` → 99/99 warning-free (auth 19 + db-path 19 + deps 4 + validation 27 + rate-limit 20 + status 10) |
| H3 | Production build | `bun run build` → OK; route table identical to the documented session-24 one |
| H4 | E2E layer | `bun run test:e2e` → 44/44 (53.3s, single worker) |
| H5 | Environment | Workspace re-bootstrapped from the reset state: `bun install` (424 pkgs), `.env` recreated with `DATABASE_URL="file:../db/custom.db"` (the operator-specified value) + a GENERATED 20-char `ADMIN_PASSWORD` (never printed in any tracked file — the session-22 F1 doctrine followed from the start) + generated `AUTH_SECRET`, `db/` created at the repo root, `db:push` + `db:seed` green, dev server healthy (`/api/health` → `{"ok":true,"database":"up"}`); the ambient `DATABASE_URL` hijack (`file:/home/z/my-project/db/custom.db`) is ACTIVE in the shell — re-proven this session when an ad-hoc Prisma query without `env -u` failed with SQLite error 14 (the documented ADR-010 trap); the npm-script guards held through every probe |
| H6 | Session-24 deliverables | `src/app/icon.svg` is well-formed XML AND **byte-identical to the reference's live data-URI favicon** (decoded from the reference head: fill `#264a38`, stroke `#f3ead0`, identical path data); `GET /icon.svg` → 200 `image/svg+xml` with the auto-generated link tag in served HTML; the landing.spec icon pin is sound; every 44-e2e TOTAL reference in all five living docs is correct |
| H7 | Live landing parity (desktop) | Reference vs clone at a VERIFIED 1440×900: page height **7490px both**; h2 `60px/63px/400` both; h3 `20px/25px/400` both; identical section id set |
| H8 | Mobile navigation (operator's key concern) | Panel geometry **byte-exact both sides** at a VERIFIED 390×844: `192×148 @ (178, 80)`, `display: grid`, radius `24px`, padding `8px`; reference paints `rgba(38,74,57,.9)`, clone computes the oklab equivalent (documented v4 format variance); 3 identical links (About us / Services / Insurance); `aria-expanded` contract on both |
| H9 | Mobile menu behavior | Link activation closes + unmounts the panel and jumps: `#services` at viewport top **0.421875 on BOTH sites**, `scrollY 1837` both (same-session, same-method measurement) — identical to the pixel |
| H10 | Mobile page height | Reference 12164px vs clone 12162px after full settle — the documented 2px sub-pixel drift entirely inside the contact section (unchanged since session 22) |
| H11 | Tailwind v4 trap guards (live) | Canvas-rasterized dropdown paint `[38,74,57,230]` — EXACT (no bare-HSL transparency regression, trap #1); panel is a grid (trap #4 mitigation); no trap reintroduction anywhere in the tree (sub-agent full-source sweep) |
| H12 | Full product loop + status transitions | login `200` + cookie → `/dashboard` `200` → anonymous `/dashboard` `307` → public form POST `201 {ok,id}` → PATCH confirm `200 {status:"confirmed"}` → PATCH complete `200 {status:"completed"}` → anonymous PATCH `401` → unknown id `404` → invalid status `422` → logout `200` → post-logout dashboard `307` — all under the still-active ambient hijack |
| H13 | XFF determinism scheme | Structurally re-verified: every request-level POST/PATCH across all six specs carries a pid-derived spec-unique-third-octet key; every browser-driven POST/PATCH injects one via `page.route`/`route.continue` — no request touches the "unknown" bucket |
| H14 | Security surface | Baseline security headers on every route response + app-level redirect (live-probed both edges: `/dashboard` 307 WITH headers, `/privacy-policy/` 308 WITHOUT — the documented, e2e-pinned framework limitation); no PII echo; credential hygiene holding (no realistic-looking examples in any living doc) |
| H15 | Scandihaven (tech-stack patterns) | Re-cloned and reviewed — same substrate doctrine (Next 16 + React 19 + TS strict + Tailwind v4 CSS-first + Vitest/Playwright); its Turborepo/Drizzle/Better-Auth patterns are deliberate ADR-logged divergences; no pattern this repo is missing for its single-app API-route shape (sessions 22/24 conclusion re-confirmed) |

### 1.2 Issues found (remediation required)

All 6 findings originate from the fresh-eyes sub-agent (Task 26-a) and were
**re-verified by the orchestrator** (live probe, `wc -l`, or line-by-line
read) before acceptance; none is a regression of a documented
session-2/4/6/8/10/12/14/16/18/20/22/24 fix. Zero Critical/High/Medium —
the code, security, and parity surfaces held under every probe shape tried.
The headline is a **time-eroded e2e assertion** (a test-integrity gap 13
audits never checked for: assertions whose discriminating power decays with
the calendar).

| ID | Severity | Finding | Evidence |
|----|----------|---------|----------|
| F1 | **Low (doc-claim drift)** | PAD §7.1's per-spec landing row says 12 tests; the file has 13 (the session-24 icon pin) — so the table's rows sum to 43 while the same document claims 44 e2e in three other places. The session-24 count pass updated every "44" total but missed the per-spec breakdown — the "missed-sibling-row" class (session-18 F11, session-20 F2, session-22 F3, session-24 F1). | `Project_Architecture_Document.md:673` vs `grep -cE '^\s*test\(' tests/e2e/landing.spec.ts` → **13**; per-spec reality: mobile-nav 7 + landing 13 + form 10 + legal 3 + auth 9 + status 2 = 44 |
| F2 | **Low (doc-claim drift)** | PAD §11's Validation Report row says `~334` lines; the file is 361 — stale precisely because session-24 appended 27 lines to that very file (the favicon deviation entry) while re-measuring only `scripts/seed.ts`. 8.1% — the §11 outlier (every other row is within ~7%: header 214/~200, login route 137/~130, auth.spec 276/~263, mobile-nav 178/~170, db-path 129/~135, status-button 81/~85). | `Project_Architecture_Document.md:820` vs `wc -l docs/Tailwind-V4-Validation-Report.md` → **361**; `git show f88ee15^:docs/Tailwind-V4-Validation-Report.md \| wc -l` → 334 (drift introduced by the session-24 commit itself) |
| F3 | **Low (workspace state, 3rd recurrence)** | The documented "6 realistic dashboard seed rows (2 confirmed / 2 new / 2 completed)" are absent again — `db/custom.db` holds 0 appointment rows (the fresh bootstrap's `db:push` + `db:seed` seeds only the staff account). The live dashboard renders the empty state while the committed screenshots 12/13/15 show 6 rows. The same class session-24 F4 remediated (and session 20 before it). | Read-only DB count: appointments 0, adminUsers 1; claims at PAD:28, SKILL.md:867-877, worklog Task 24 |
| F4 | **Low (test-integrity erosion — the headline)** | The e2e "impossible calendar dates" pin has eroded into tautology: its hardcoded 2025 literals are now in the past (it is 2026-10), so their JS-rollover targets (e.g. 2025-03-03) are ALSO past — the "not in the past" floor alone produces the asserted 422 even if the calendar round-trip check completely regressed. The test's title claims "no JS rollover" but it can no longer detect a rollover regression. (The UNIT seam is immune — it injects `fixedNow("2024-01-01")`, so its 2025 literals are future-relative; only the e2e layer reads the real clock.) | `tests/e2e/appointment-form.spec.ts:125-142` — `for (const preferredDate of ["2025-02-31", "2025-04-31", "2025-02-30"])` → 422 "Pick today or a future date."; `src/lib/validation.ts:156` — `if (!valid \|\| parsed < floor)` (either branch produces that message) |
| F5 | **Info (doc-claim overstatement)** | SKILL §8 claims "Forms: real `<label>` wrapping (e2e asserts getByLabel)" — only the staff login form wraps `<label>` (2); the public appointment form uses `aria-label` (5) — a valid accessible-name technique, no WCAG failure, and the form is a verbatim parity port. Purely doc accuracy. | `health-care-clinic_SKILL.md:273` vs `src/components/site/appointment-form.tsx` (5× aria-label, 0× `<label>`) + `src/components/dashboard/login-form.tsx` (2× `<label>`) |
| F6 | **Info (stale-range class)** | PAD §3.2's docs/ transcript ranges are stale by four sessions: "session_1..21.md" (reality: 1..25) and "remediation-plan-session{2..20}.md" (reality: 2..24). The deliberate-elision note covers omissions, not wrong stated ranges — the same stale-range class S18/S22 fixed for sibling rows; it recurs EVERY session by construction. | `Project_Architecture_Document.md:401,405` vs `ls docs/session_*.md docs/remediation-plan-session*.md` |

### 1.3 Considered and deliberately NOT remediated (doctrine)

| Item | Decision | Rationale |
|------|----------|-----------|
| Baking demo rows into `scripts/seed.ts` (F3 root-cause option) | Skip — restore through the PUBLIC API instead (the S20/S22/S24 method) | `tests/deps.test.ts` pins `scripts/` = `seed.ts` only, and the staff-seed contract (idempotent single-account upsert) is documented in 4 living docs; a demo-row mode would churn the dependency contract AND the docs for a workspace-state class that only recurs on reset. The public-API restore doubles as a live product-loop probe — the proven pattern. |
| Rewriting the F4 test as a unit test only | Skip — fix the e2e layer | The unit seam already covers the round-trip with injected `now` (13 cases); the e2e pin exists precisely to cover the REAL server clock + real HTTP path. The fix keeps both layers honest. |
| Re-measuring every ≤7% §11 row (F2 scope) | Skip — fix only the 8.1% outlier | The `~` convention tolerates organic drift; session-24's own precedent re-measured only the outlier (seed.ts). Header/login-route/auth.spec/mobile-nav/db-path/status-button rows are within the convention. |
| Hardcoding next-year dates (e.g. "2027-02-31") in the F4 fix | Skip — compute from the runtime clock | A hardcoded literal erodes again in ~15 months — the exact class being fixed. `new Date().getFullYear() + 1` is self-renewing: the rollover targets are always future, so ONLY the round-trip check can reject them, forever. |
| Scandihaven pattern adoption | Skip (unchanged) | Same substrate doctrine already; monorepo patterns are deliberate divergences (sessions 22/24 conclusion). |

---

## Part 2 — Remediation Plan (TDD)

All changes land on `main` (no new branches). `skills/` stays out of
lint/typecheck/test/build. The one test-integrity change (F4) gets an
explicit Red/Green proof: the test must FAIL on a deliberately-broken seam
before it is trusted to pass on the real one.

### Phase 1 — F4: restore the impossible-dates e2e pin's discriminating power (TDD)

1. **Erosion proof (RED-0):** temporarily patch `src/lib/validation.ts` —
   `isRealCalendarDate` returns `valid: true` unconditionally (simulating a
   full round-trip regression) — rebuild, and run the CURRENT e2e test
   (2025 literals) against it. Expected: it still PASSES (the past-floor
   alone rejects 2025 rollovers) — empirically proving the erosion.
2. **RED (the new test has teeth):** fix the spec to compute
   `const futureYear = new Date().getFullYear() + 1` and loop over
   `[`${futureYear}-02-31`, `${futureYear}-04-31`, `${futureYear}-02-30`]`
   (rollover targets 2027-03-03 / 2027-05-01 / 2027-03-02 are always future,
   so only the round-trip check can reject them) + update the explanatory
   comment. Run it against the SAME broken build. Expected: FAIL (the
   status is 201, not 422) — discriminating power proven.
3. **GREEN:** restore `validation.ts` verbatim, rebuild, run the new test.
   Expected: PASS. Purge any rows the RED runs persisted into `db/e2e.db`
   (the broken build 201'd the probes — unique fullName, pruned by a
   one-off script outside the repo's `scripts/` contract).
4. **Server hygiene:** kill the :3100 standalone server between the broken
   and restored runs (`reuseExistingServer` would otherwise serve the stale
   broken build).
5. Acceptance: the new test fails on the broken seam, passes on the real
   one; full e2e suite 44/44; `db/e2e.db` left with no garbage rows.

### Phase 2 — Doc-claim fixes (F1, F2, F5, F6 — doc-only)

6. **F1:** PAD §7.1 landing row `12` → `13`, parenthetical gains
   "+ SVG-favicon chrome pin". Acceptance: the six rows sum to 44; `rg
   '\| 12 \|' Project_Architecture_Document.md` no longer matches the
   landing row.
7. **F2:** PAD §11 Validation Report row `~334` → `~361`.
8. **F5:** SKILL §8 forms row reworded to the honest two-form reality:
   accessible names via `<label>` wrapping (login) and `aria-label`
   (appointment form — verbatim parity port); e2e asserts `getByLabel`
   against both.
9. **F6:** PAD §3.2's two range rows rephrased as open-ended families
   (`session_*.md`, `remediation-plan-session*.md`) — kills the
   every-session stale-range class at the root instead of bumping ranges
   this session.

### Phase 3 — F3: DB state restore (the S24 method)

10. Purge the parity-loop probe row ("Parity Loop Probe S26", id
    `cmuvsjhdj…`) via a repo Prisma temp script (the documented
    `env -u` pattern), then re-insert the 6 realistic seed rows through
    the PUBLIC API (unique XFF keys from the 198.51.117-119.x space —
    disjoint from every documented spec base 192.0.2-7.x /
    198.51.100-115.x / 203.0.113.x and from this session's probe keys
    198.51.116.x) with statuses set via the real PATCH API (2 confirmed /
    2 new / 2 completed — double-duty live probe).

### Phase 4 — Full verification (the TDD net)

11. `bun run lint && bun run typecheck && bun run test && bun run build &&
    bun run test:e2e` — acceptance: lint 0 under the 14 ON rules, tsc
    clean, 99/99 unit, build identical route table, e2e **44/44** — plus
    the **double-run proof**: a SECOND consecutive `test:e2e` within the
    10-min limiter window must ALSO be 44/44.
12. Live re-verification on the remediated tree: parity spot-checks
    (7490px desktop; mobile panel 192×148 @ (178,80); link-click
    0.421875 both); `/api/health` up; dashboard shows the 6 seed rows.

### Phase 5 — Screenshots

13. Re-capture the 20-screenshot set into `docs/screenshots/` from the dev
    server running the remediated tree (desktop hero/sections/full, mobile
    hero/menu/services, legal pages, appointment form states, login,
    dashboard desktop/mobile — `03-desktop-full.png` must measure exactly
    1440×7490; the dashboard captures show the restored 6 seed rows);
    purge the capture's submission row after (6 seed rows retained).

### Phase 6 — Session docs, commit, push

14. `docs/session_26.md`; repo `worklog.md` entries (orchestrator +
    sub-agent 26-a already recorded); SKILL.md → v2.8.4 with the [S26]
    change note (frontmatter project_state + §8 + Appendix B); PAD [S26]
    revision block; `.env.example` re-verified (no env changes this
    session — matches the codebase contract, included in the commit).
15. Conventional Commits message on `main`; push via
    `docs/ssh_git_wrapper_v3.py` per the runbook (operator key from the
    session brief; shredded after push; remote ref verified).

### Validation of this plan against the codebase (pre-execution)

- F1 verified: PAD:673 read; per-spec counts re-derived by grep
  (7+13+10+3+9+2 = 44) ✔
- F2 verified: PAD:820 read; 361 vs 334 re-measured; the drift's origin
  confirmed in the f88ee15 diff itself ✔
- F3 verified: DB enumerated read-only (0 appointments); the probe row id
  recorded ✔
- F4 verified: the spec's 2025 literals read; `validation.ts:156` confirms
  both branches share the asserted message (the fix keeps the assertion
  unchanged); the unit seam's `fixedNow` injection confirmed immune; no
  OTHER eroding date literals exist in the e2e layer (full-suite grep —
  only this one test reads the real clock with hardcoded dates) ✔
- F5 verified: aria-label/label counts re-derived (5/0 + 0/2) ✔
- F6 verified: PAD:401,405 read; reality enumerated ✔
- Key-space check for the seed-restore XFF keys (198.51.117-119.x):
  disjoint from every documented base in the six spec files
  (192.0.2-7.x, 198.51.100-106.x, 198.51.108-115.x, 203.0.113.x) and from
  this session's loop-probe keys (198.51.116.x) ✔
- Parity safety: F1/F2/F5/F6 are doc-only; F4 changes no production code
  (the validation patch exists only inside the Red/Green proof and is
  reverted verbatim — `git diff` clean before Phase 2); F3 touches only
  the untracked DB ✔
