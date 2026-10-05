# Remediation Plan — Session 12 (Email-Field Bound, Transport-Error Handling, Lint-Gate Honesty & Contract Tightening)

**Date:** 2026-10-05
**Scope:** Full re-audit of the session-10 remediated tree (`134b9c6` + docs-only
`d11c8a3` — the operator transcript paste that became `docs/session_11.md`),
with live re-verification against the reference site, plus remediation of the
new findings. The repo `skills/` folder is excluded from checking, testing and
compilation per the operating instructions.
**Method:** `skills/code-review-and-audit` native-CLI fallback pipeline (static
gates + `bun audit` + a fresh-eyes full review dispatched as a read-only
sub-agent — every finding re-verified empirically or line-by-line by the
orchestrator before acceptance), `skills/agent-browser` live parity probes on
both the reference and the local clone (desktop 1440×900 + mobile 390×844),
`skills/test-driven-development` doctrine — the green 76-unit + 37-e2e suite
is the characterization net; every new behavior gets a failing test first.

---

## Part 1 — Audit Findings

### 1.1 Verified healthy (re-confirmed this session)

| # | Check | Evidence |
|---|-------|----------|
| H1 | Lint / type gate | `bun run lint` → 0 errors; `bun run typecheck` → clean under true strict |
| H2 | Unit layer | `bun run test` → 76/76 (db-path 15 + auth 19 + deps 4 + validation 20 + rate-limit 18) |
| H3 | Production build | `bun run build` → OK; route table identical to the documented one (4 static + 5 dynamic + /_not-found) |
| H4 | E2E layer | `bun run test:e2e` → 37/37 (5 spec files, single worker) |
| H5 | Environment | Rebuilt after sandbox reset: `.env` (operator credentials + generated `AUTH_SECRET`, the leading-`$` operator password escaped per the dotenv gotcha) + `bun install` (424 pkgs) + `db:push`/`db:seed` → `db/custom.db` at repo root; `.env.example` matches the codebase |
| H6 | Live landing parity | Reference vs clone at 1440×900 (agent-browser, same session, same method): page height **7490px both**; h2 `60px/63px` both; h3 `20px` both; all 7 section ids present both; `<main>` present both; date input **no `min`** both; reference `<title>` still the `Base44 APP` placeholder (recorded deviation, e2e-pinned); 0 hydration errors on the clone |
| H7 | Mobile navigation (operator's key concern) | Panel geometry **byte-exact both sides**: `192×148 @ (178, 80)`, `display: grid`, radius `24px`, padding `8px`; reference paints `rgba(38,74,57,.9)` while the clone computes the oklab equivalent (documented v4 format variance; e2e rasterizes the pixel); 3 identical links (About us / Services / Insurance); ARIA contract (`aria-expanded`) on both |
| H8 | Mobile menu behavior | Link activation closes + jumps: `#services` lands at viewport top **0.421875 on BOTH sites** (same-session, same-method measurement) — identical to the pixel; panel unmounts when closed on both |
| H9 | Env determinism | Ambient `DATABASE_URL=file:/home/z/my-project/db/custom.db` ACTIVE in the shell; `/home/z/my-project/db/` does not exist on disk — dev-server writes landed in `<repo>/db/custom.db` (probe row verified). The orchestrator's own un-guarded `bun -e` DB inspect was redirected by the ambient value (Prisma Error 14) — the exact threat ADR-010 documents; re-ran with `env -u` successfully. The npm-script guards held |
| H10 | Staff auth loop | Operator-credential login → `200` + cookie → `/dashboard` `200`; public form POST (valid specialty) → `201` → row visible on the authenticated dashboard |
| H11 | Session-10 fixes regression check | Chunked 70 KiB POST → **413** (cap holds for every transport shape); login + JSON `null` body → **422 field map** (never 500); appointments + `null` → **422 field map**; timezone tolerance live-verified (yesterday row persisted, 2-days-ago rejected per prior session) |
| H12 | Security scans | Secret-pattern scan (excl. `skills/`): zero hits in application code; zero `eval`/`innerHTML` outside the constant reveal-fallback script; zero TODO/FIXME; XSS re-verified live by the audit sub-agent (`<script>`/`<img onerror>`/`<svg onload>` payloads in fullName render fully escaped — React text children only) |
| H13 | `bun audit` | Same two known dev-tooling advisories (`braces` via eslint-config-next, `deepmerge-ts` via prisma) — re-verified unfixable upstream, accepted dev-time risk |
| H14 | readJsonBody edge matrix (sub-agent, live + unit) | `body === null` → 400; content-length lies large → 413 fast path; chunked oversized → 413; exact 65,536 accepted / 65,537 → 413; empty body → 400; unparseable → 400; JSON `null` parses through |

### 1.2 Issues found (remediation required)

All findings verified by the orchestrator (live probe or line-by-line read)
before acceptance; none is a regression of a documented fix.

| ID | Severity | Finding | Evidence |
|----|----------|---------|----------|
| F1 | **Medium (security/data-quality)** | **The email field is the only unbounded payload field.** `fullName` is capped 3–120, `phone` 7–32, `specialty` allowlisted, `preferredDate` format-checked — but `email` gets only the pattern test (`validation.ts:102-105`) with **no maximum length**. The 64 KiB body cap is the only ceiling, so a single persisted row can carry a ~64 KiB email (the local-part `a`×60000 passes the loose pattern). Verified live: a 60,106-byte payload → **201**, 60,012-char email persisted and rendered in the dashboard table (~200× amplification over a normal row). | live curl probe this session |
| F2 | **Low (robustness)** | **Transport-level read errors escape `readJsonBody` unhandled.** `rate-limit.ts:119` `await reader.read()` rejects on client abort / socket reset (ECONNRESET); the throw propagates through both routes' call sites (`appointments/route.ts:43`, `login/route.ts:48` — both OUTSIDE the routes' try/catch blocks, which only guard the DB section) → Next framework-level unhandled error and a misleading `POST ... 200` access-log line. Verified live: chunked POST aborted mid-body → `⨯ Error: aborted { code: 'ECONNRESET' }` in dev.log. | live raw-socket probe this session |
| F3 | **Low (tooling honesty)** | **The "lint 0" verification gate runs with ~24 rules disabled** (`eslint.config.mjs:12-44`), including `@typescript-eslint/no-explicit-any`, `no-unused-vars`, `no-undef`, `no-unreachable`, `react-hooks/exhaustive-deps`, `react-hooks/purity`. Docs (CLAUDE.md, AGENTS.md) present `bun run lint` as a gate without disclosing the suppression block — the gate's assurance is materially weaker than advertised. | config read |
| F4 | **Low (error handling)** | **`LogoutButton.onLogout` has no catch** — `try { await fetch(...) } finally { ... }` (`logout-button.tsx:14-23`): a network failure rejects the async handler's promise → unhandled promise rejection. Navigation still happens via the finally, so user impact is nil, but the rejection noise is real. | code read |
| F5 | **Info (config hygiene)** | `reactStrictMode: false` (`next.config.ts:13`) — the only flag in the file without a rationale comment (each neighboring flag carries one). | code read |
| F6 | **Info (semantics)** | **Dashboard "Upcoming visits" stat is stricter than the validation tolerance.** The seam deliberately accepts "yesterday" (west-of-server patient's today, session-10 F4), but the stat counts `preferredDate >= server-today` (`dashboard/page.tsx:71-73`) — a tolerated row is persisted as valid yet excluded from the stat it belongs to. | code read |
| F7 | **Info (contract consistency)** | **A non-string `specialty` silently coerces to the default** (`validation.ts:107`: `asTrimmedString(record.specialty) ?? "Primary Care"`): `{"specialty": 42}` → **201 saved as "Primary Care"** instead of a 422. Inconsistent with the fullName/phone handling (non-string → 422 field error). Same shape for `preferredDate` (non-string treated as "not provided" — defensible for an optional field; specialty defaults silently for a TYPE error). | code read + live probe by the audit sub-agent |
| F8 | **Info (seed robustness)** | `scripts/seed.ts:32-37`: `process.exit(1)` inside `.catch(...)` terminates the process **before** the chained `.finally(() => db.$disconnect())` runs — the disconnect is dead code on the failure path. Harmless (process exit closes handles) but the construct is misleading. | code read |
| F9 | **Info (DRY drift risk)** | The email regex is duplicated as an inline literal in the login route (`login/route.ts:73`) rather than shared with the validation seam's `EMAIL_PATTERN` — the repo's own "derived, never hand-copied" doctrine argues against the copy. | code read |

### 1.3 Test gaps identified (close alongside the fixes)

| ID | Gap |
|----|-----|
| T1 | `request.body === null` → 400 branch (`rate-limit.ts:110-114`) has no unit pin |
| T2 | The transport-error path (F2) has no test at all — it is currently an unhandled throw |
| T3 | No email length pin exists (naturally — the bound doesn't exist yet; lands with F1) |
| T4 | The login limiter (10 / 10 min) has **no route-level e2e pin** — only the appointments limiter (5 / 10 min) is pinned |
| T5 | Dashboard stats have zero coverage, including their timezone semantics (F6) |

### 1.4 Considered and deliberately NOT remediated (doctrine)

| Item | Decision | Rationale |
|------|----------|-----------|
| Enabling `reactStrictMode` | Document instead | Dev-runtime double-invoke changes behavior the parity doctrine pins (reveal choreography, badge timing); every effect's cleanup/deps was re-verified clean by the session-10 audit AND this session's sub-agent. A comment stating the rationale (matched to every other flag in the file) is the honest, verifiable fix; flipping the flag is not verifiable without re-running the full parity matrix for dev-only benefit. |
| UI-level 429 rendering spec (drive the browser form into the limiter) | Skip | The 429 JSON contract is e2e-pinned on the appointments route and both forms render API errors verbatim (pinned); driving the browser into a 429 adds ~11 form submissions of runtime to assert a code path already covered end-to-end at the API layer. |
| Logout failure-path e2e (network sabotage) | Skip | Disproportionate to a cosmetic catch; the F4 fix makes the path inert. |
| Non-string `preferredDate` → 422 | Keep current | An optional field treating a type error as "not provided" is defensible and matches the form's optional semantics; tightening it would 422 payloads the reference-era API accepted. Specialty (F7) is tightened because a WRONG TYPE on a defaulted field silently fabricates data. |
| Extracting the whole dashboard query layer for unit tests | Minimal extraction only | Only the floor-date computation (the timezone-sensitive part, F6) is extracted as a pure function; the Prisma queries themselves are integration-shaped and already covered by the e2e dashboard assertions. |
| Re-enabling ALL disabled ESLint rules | Enable the high-value subset | Style-noisy rules (`no-console`, `no-irregular-whitespace`, `prefer-const`, …) stay off but each deliberate off gains a one-line rationale comment — the gate becomes honest instead of silently wide. |
| Cleaning the dev DB of audit probe rows | Do before screenshots | The rows (60 KiB emails, XSS payloads) are audit artifacts in a gitignored dev DB — removed before the screenshot pass so the dashboard shows realistic data. |

---

## Part 2 — Remediation Plan (TDD)

All changes land on `main` (no new branches). `skills/` stays out of
lint/typecheck/test/build. New behaviors get failing tests first; the full
gate re-runs after every phase.

### Phase 1 — Email maximum length (F1, T3) — TDD

1. **Red:** `tests/validation.test.ts` gains: a 255-char pattern-valid email →
   422 with a `fields.email` length message; a 254-char email → accepted
   (boundary); the existing malformed-email test unchanged.
2. **Green:** `validation.ts` — the email branch gains
   `else if (email.length > 254)` with the message "Email must be 254
   characters or fewer." (254 = RFC 5321 practical forward-path limit). The
   docstring contract comment updates to record the bound.
3. **Live re-probe:** the 60 KiB email payload from the audit → **422**.

### Phase 2 — Transport-error tolerance in `readJsonBody` (F2, T2) — TDD

4. **Red:** `tests/rate-limit.test.ts` gains: a `ReadableStream` body that
   emits one chunk then `controller.error(...)`s → `readJsonBody` RESOLVES
   `{ok:false, status:400}` (today the promise rejects). Plus T1's pin: a
   bodyless POST Request (no body init) → `{ok:false, status:400}`.
5. **Green:** `rate-limit.ts` — the read loop moves inside a try/catch; on a
   transport error the reader is cancelled best-effort and the seam returns
   the 400 result. The routes need NO changes (their call sites now resolve
   instead of throwing); the docstring records the abort semantics.
6. **Live re-probe:** the mid-body-abort raw socket from the audit → no new
   `⨯ Error: aborted` line in dev.log tail (the socket still dies — the
   client hung up — but the route itself resolves a 400 without an unhandled
   framework error).

### Phase 3 — Specialty type tightening (F7) — TDD

7. **Red:** `tests/validation.test.ts` gains: `{specialty: 42}` → 422 with
   `fields.specialty`; `{specialty: undefined}` / `{specialty: ""}` keep
   defaulting to "Primary Care" (defaulting behavior pinned unchanged).
8. **Green:** `validation.ts` — a present-but-non-string `specialty` becomes
   a 422 before the defaulting expression; the default only applies to
   missing/nullish/empty values.

### Phase 4 — Upcoming-visits floor aligned with the tolerance (F6, T5) — TDD

9. **Red:** `tests/validation.test.ts` gains a `upcomingVisitsFloor` block:
   for a fixed `now`, the floor is the ISO date of server-yesterday (one day
   westward — exactly the validation tolerance), formatted YYYY-MM-DD.
10. **Green:** `validation.ts` exports `upcomingVisitsFloor(now: Date):
    string` (pure, unit-pinned); `dashboard/page.tsx` replaces its local
    `todayIsoDate()` upcoming filter with the imported floor. The stat now
    counts every row the API deems valid (today-or-future plus the tolerated
    yesterday), with a comment cross-referencing the tolerance rationale.

### Phase 5 — Small robustness/DRY fixes (F4, F8, F9)

11. `logout-button.tsx` — `.catch(() => {})` on the logout fetch (the finally
    still navigates; the rejection noise disappears).
12. `scripts/seed.ts` — the catch sets `process.exitCode = 1` instead of
    `process.exit(1)` so the chained `finally` disconnect actually runs; the
    observable exit code stays 1.
13. `validation.ts` exports `EMAIL_PATTERN`; the login route imports it,
    deleting the hand-copied literal (F9 drift risk gone). The pattern's
    semantics are identical (asserted by an existing validation test plus a
    new login-side pin is unnecessary — the login e2e already pins the 422
    shape for malformed emails).

### Phase 6 — Lint-gate honesty (F3) + config comment (F5)

14. `eslint.config.mjs` — re-enable the high-value correctness rules and run
    the gate: `no-unreachable`, `no-redeclare`, `no-fallthrough`,
    `no-case-declarations`, `no-undef`, `@typescript-eslint/no-unused-vars`
    (with `_`-prefixed ignore), `@typescript-eslint/no-explicit-any`,
    `react-hooks/exhaustive-deps`, `react-hooks/purity`. Any surfaced finding
    is fixed in code (expected: none-to-few — two prior sessions manually
    re-verified the effect hygiene). Rules that stay off each gain a
    one-line rationale comment so the file reads as a deliberate allowlist,
    not a blanket suppression.
15. `next.config.ts` — `reactStrictMode: false` gains its rationale comment
    (parity-pinned dev behavior; effect hygiene verified per-session instead).

### Phase 7 — Login limiter e2e pin (T4)

16. `tests/e2e/auth.spec.ts` gains a spec: with a per-run spoofed XFF key
    (`203.0.113.${(Date.now() % 200) + 10}` — the session-10 F6 hardening
    pattern), 10 wrong-password POSTs → 401 each; the 11th → **429**. The
    spec documents the 10/10-min contract the login route advertises.

### Phase 8 — Full verification (the TDD net)

17. `bun run lint && bun run typecheck && bun run test && bun run build &&
    bun run test:e2e` — acceptance: lint 0 (under the strengthened ruleset),
    tsc clean, unit suite green at its new count (76 → 82+: +3 email pins,
    +2 transport/bodyless pins, +2 specialty pins, +2 floor pins, plus any
    login-limiter unit pin), build with the IDENTICAL route table, e2e green
    at its new count (37 → 38).
18. Fresh dev-server parity spot-checks on both sites (desktop 7490px; mobile
    panel 192×148 @ (178,80); link-click closes + jumps to the identical
    scroll offset) + the product loop under the active ambient
    `DATABASE_URL` hijack + live re-probes of F1 (60 KiB email → 422) and F2
    (mid-body abort → no unhandled error).

### Phase 9 — Screenshots

19. Clean the dev DB of audit probe rows (XSS payloads / 60 KiB emails);
    re-capture the 11-screenshot set into `docs/screenshots/` (existing
    filename convention) from the dev server running the remediated tree.

### Phase 10 — Session docs, commit, push

20. `docs/session_12.md`; repo `worklog.md` entry; SKILL.md → v2.5.0; PAD
    `[S12]` revision + test tables + known-issues; README/CLAUDE/AGENTS
    count updates + the lint-gate disclosure. `.env.example` re-verified
    against the codebase (no new env vars this session).
21. Conventional Commits message on `main`; push via
    `docs/ssh_git_wrapper_v3.py` per the runbook (operator key from the
    session brief; shredded after push; remote ref verified).

### Validation of this plan against the codebase (pre-execution)

- F1 verified live this session: 60,106-byte payload → 201 with a 60,012-char
  email persisted ✔ (`validation.ts:102-105` read — no length branch exists)
- F2 verified live this session: mid-body abort → `⨯ Error: aborted { code:
  'ECONNRESET' }` in dev.log; both call sites (`appointments/route.ts:43`,
  `login/route.ts:48`) read — both outside any try/catch ✔
- F3 read (`eslint.config.mjs:12-44` — 24 disabled rules) ✔
- F4 read (`logout-button.tsx:14-23` — no catch) ✔
- F5 read (`next.config.ts:13` — only un-commented flag) ✔
- F6 read (`dashboard/page.tsx:63-73` vs `validation.ts:122-125`) ✔
- F7 read (`validation.ts:107`) + sub-agent live probe (42 → 201 "Primary
  Care") ✔
- F8 read (`scripts/seed.ts:32-37`) ✔
- F9 read (`login/route.ts:73` inline regex vs `validation.ts:47`) ✔
- T1/T2: `tests/rate-limit.test.ts` read — no bodyless-Request or
  rejecting-stream case exists ✔
- T4: `tests/e2e/auth.spec.ts` + `appointment-form.spec.ts` read — 429 pin
  exists ONLY on the appointments route ✔
- The existing "coerces non-string field values" validation test uses no
  `specialty` key — the F7 tightening cannot collide with it ✔
- The F1 bound (254) cannot break the reference-parity form: the browser
  email input is type=email and human-scale; the API bound only rejects
  abuse-shaped payloads the reference never accepted either (its hosted form
  sink had its own validation) ✔
