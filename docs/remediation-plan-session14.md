# Remediation Plan — Session 14 (Footer Link Completion, e2e Cross-Run Keys, Security Headers, Login Email Bound & Transport-Message Curation)

**Date:** 2026-10-05
**Scope:** Full re-audit of the session-12 remediated tree (`8b52c73` + the docs-only
`fcd6a33` — the operator transcript paste that became `docs/session_13.md`), with
live re-verification against the reference site, plus remediation of the new
findings. The repo `skills/` folder is excluded from checking, testing and
compilation per the operating instructions.
**Method:** `skills/code-review-and-audit` native-CLI fallback pipeline (static
gates + `bun audit` + a fresh-eyes full review dispatched as a read-only
sub-agent — every finding re-verified empirically or line-by-line by the
orchestrator before acceptance), `skills/agent-browser` live parity probes on
both the reference and the local clone (desktop 1440×900 + mobile 390×844),
`skills/test-driven-development` doctrine — the green 85-unit + 38-e2e suite
is the characterization net; every new behavior gets a failing test first.

---

## Part 1 — Audit Findings

### 1.1 Verified healthy (re-confirmed this session)

| # | Check | Evidence |
|---|-------|----------|
| H1 | Lint / type gate | `bun run lint` → 0 errors under the strengthened session-12 ruleset; `bun run typecheck` → clean under true strict |
| H2 | Unit layer | `bun run test` → 85/85 (db-path 15 + auth 19 + deps 4 + validation 27 + rate-limit 20) |
| H3 | Production build | `bun run build` → OK; route table identical to the documented one (4 static + 5 dynamic + /_not-found) |
| H4 | E2E layer | `bun run test:e2e` → 38/38 (5 spec files, single worker) |
| H5 | Environment | `.env` with `DATABASE_URL="file:../db/custom.db"` (operator credentials + AUTH_SECRET, leading-`$` escaped), `db/custom.db` + `db/e2e.db` at the repo root, `.env.example` matches the codebase; ambient `DATABASE_URL` hijack ACTIVE in the shell (the documented ADR-010 threat) — the npm-script `env -u` guards held through every probe |
| H6 | Live landing parity | Reference vs clone at 1440×900 (agent-browser, same session, same method): page height **7490px both**; h2 `60px/63px` both; h3 `20px` both; all 7 section ids present both; `<main>` present both; date input **no `min`** both; reference `<title>` still the `Base44 APP` placeholder (recorded deviation, e2e-pinned) |
| H7 | Mobile navigation (operator's key concern) | Panel geometry **byte-exact both sides**: `192×148 @ (178, 80)`, `display: grid`, radius `24px`, padding `8px`; reference paints `rgba(38,74,57,.9)` while the clone computes the oklab equivalent (documented v4 format variance; e2e rasterizes the pixel); 3 identical links; `aria-expanded` contract on both |
| H8 | Mobile menu behavior | Link activation closes + unmounts the panel and jumps: `#services` lands at viewport top **0.421875 on BOTH sites** (same-session, same-method measurement) — identical to the pixel |
| H9 | Staff auth loop | Operator-credential login → `200` + cookie → `/dashboard` `200`; public form POST → `201` → row visible on the authenticated dashboard |
| H10 | Session-12 fixes regression check | 255-char email → **422** "Email must be 254 characters or fewer."; `{"specialty":42}` → **422** "Choose a specialty from the list." (both re-probed live by the orchestrator); sub-agent additionally re-proved the email boundary (254 → 201), the transport-error tolerance (mid-body abort → no unhandled error, no dev.log error line), the upcoming-visits floor (dashboard stat includes the tolerated yesterday row), the login-limiter e2e pin, and the timing equalization (unknown-email vs wrong-password: 48.8 ms vs 52.7 ms — both burn scrypt) |
| H11 | Session-2/4/6/8/10 fixes | Sub-agent re-verified every documented fix (cookie contract + flags, XFF last-token keying, chunked 413, login null-body 422, timezone tolerance yesterday-201/2-days-422, dependency contract, title pins, tel: uniformity) — zero regressions |
| H12 | Security scans | `bun audit` → the same two known dev-tooling advisories (braces via eslint-config-next, deepmerge-ts via prisma) — documented and accepted; secret-pattern scan clean in application code |
| H13 | dev.log health | Zero unhandled rejections, zero hydration errors through every probe |

### 1.2 Issues found (remediation required)

All findings verified by the orchestrator (live probe or line-by-line read)
before acceptance; none is a regression of a documented fix.

| ID | Severity | Finding | Evidence |
|----|----------|---------|----------|
| F1 | **Low (consistency)** | **The two footer legal links still ship as plain `<a href>` MPA navigations** (`footer.tsx:49,52` — `/privacy-policy`, `/accessibility-statement`) — inconsistent with session-12's three `next/link` conversions, and invisible to the enabled `no-html-link-for-pages` rule: the plugin normalizes the href with a trailing slash (`/privacy-policy/`) while app-route regexes are built without one (`^/privacy-policy$`), so **only root-href anchors can ever match**. The session-12 "three real hits" claim was true-as-the-rule-sees-it but undercounted — there were five. | footer.tsx read by the orchestrator; plugin behavior proven by the sub-agent via a `/tmp` node probe executing the plugin's own `getUrlFromAppDirectory` |
| F2 | **Low (test robustness)** | **The impossible-dates e2e spec posts 3 requests under a FIXED XFF key (`203.0.113.2`, appointments max = 5/10 min)** — with `reuseExistingServer` and an operator-left server on :3100, a second suite run within 10 min pushes the bucket to 6 → the 3rd probe returns 429 → the `expect(422)` fails. Same fragility class as documented session-10 F6, whose per-run-key fix covered only the limiter/413 specs. Weaker siblings on fixed keys: `203.0.113.1` (1 req/run) and `.4` (1 req/run) in appointment-form.spec; `203.0.113.50` (2 req/run) and `.51` (1 req/run) in auth.spec under the login limiter's max of 10. | appointment-form.spec.ts:86 read by the orchestrator; limiter code (`bucket.count > max`) read |
| F3 | **Low (hardening)** | **No standard security headers on any response** — no `X-Content-Type-Options: nosniff`, no `X-Frame-Options`/`frame-ancestors`, no `Referrer-Policy`, no CSP; `X-Powered-By: Next.js` exposed. No reflection endpoints exist (all rendering React-escaped) so direct exploitability is low, but this is baseline hardening for a public healthcare site, achievable inside Next itself (`headers()` + `poweredByHeader: false`) without touching the parity surface. | `curl -D - /` by the orchestrator — full header set captured, none present |
| F4 | **Low (deployment hygiene)** | **`next build` embeds a byte-identical copy of the repo `.env` — including `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`AUTH_SECRET` — at `.next/standalone/.env`.** Gitignored, but `docs/DEPLOYMENT.md` never warns: an operator shipping the standalone folder per §2/§4 exports the staff password inside the artifact, and the embedded values take effect at runtime unless ambient env overrides them. | `cmp .env .next/standalone/.env` → identical (orchestrator) |
| F5 | **Info (contract consistency)** | **The login email has no length bound while the appointments route caps at 254** (`login/route.ts:74` — pattern-only check). Nothing persisted, no enumeration oracle (401 either way), but the seam exports `EMAIL_MAX_LENGTH` and only one of its two consumers honors it. | route read by the orchestrator; sub-agent live-probed a 300-char pattern-valid email → 401 in 48.9 ms (full scrypt ran) |
| F6 | **Info (doc accuracy)** | **The dev PII query-log warning in `db.ts` is stale for Prisma 6.11** — `log: ['query']` emits SQL templates with `?` placeholders only; **zero bound parameters** reach dev.log. The comment overstates exposure (conservative direction, but doc-vs-code drift). | orchestrator grep over dev.log after live inserts/selects: 21 `prisma:query` lines, 0 matches for probe names/phones/emails |
| F7 | **Info (UX contract)** | **Transport-level fetch failures surface the raw browser message verbatim** ("Failed to fetch" in Chromium; engine-specific elsewhere) in both forms' alert regions — outside the curated API-message contract both forms otherwise maintain. | appointment-form.tsx:74-81 / login-form.tsx:62-69 read by the orchestrator |

### 1.3 Considered and deliberately NOT remediated (doctrine)

| Item | Decision | Rationale |
|------|----------|-----------|
| `aria-controls` dangling + focus-to-body after menu-link activation (sub-agent A14-7) | Keep | The dangling reference is already documented in the PAD known-issues table (cosmetic axe flag; the reference unmounts the panel too — probed session 8); focus falling to `body` when the focused link unmounts is the same parity behavior. Fixing it would DEVIATE from the reference DOM/behavior contract. |
| Full CSP header | Guidance only | The reveal self-heal is an inline `<script>` (session-8 ADR) — a strict CSP needs hash/nonce plumbing that is fragile against build churn; the deployment shape mandates a reverse proxy (DEPLOYMENT.md §6) which is the correct seam for a full CSP. The cheap, verifiable baseline (nosniff / frame / referrer / no X-Powered-By) lands in Next itself; CSP guidance goes to DEPLOYMENT.md. |
| `reactStrictMode` | Already documented | Session-12 F5 recorded the rationale comment; nothing new to add. |
| Footer `<a href="#top">` and `tel:` anchors | Keep as-is | Same-document anchor + external scheme — not App-Router pages; `next/link` adds nothing. The rule (and the audit) correctly ignore them. |
| Enum spec timing assertions under a shared per-run key | Keep shared | The enumeration-parity spec NEEDS both requests under one bucket is irrelevant — what matters is both requests hit the same route; the timing comparison is between response times, not limiter states. A per-run key preserves that while killing the cross-run drift. |

---

## Part 2 — Remediation Plan (TDD)

All changes land on `main` (no new branches). `skills/` stays out of
lint/typecheck/test/build. New behaviors get failing tests first; the full
gate re-runs after every phase.

### Phase 1 — Red tests (the TDD net)

1. `tests/e2e/auth.spec.ts` gains: a 300-char pattern-valid email with a
   valid-format password → **422** with `fields.email` = "Email must be 254
   characters or fewer." (today: 401 — the pattern accepts it, no length
   branch exists). [F5]
2. `tests/e2e/landing.spec.ts` gains a response-header pin: `GET /` carries
   `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
   `Referrer-Policy: strict-origin-when-cross-origin`, and does NOT carry
   `X-Powered-By`. (today: none present). [F3]
3. `tests/e2e/appointment-form.spec.ts` gains: with
   `page.route("**/api/appointments", r => r.abort())`, submitting a valid
   form shows the curated connection-failure message — not the raw engine
   string ("Failed to fetch"). [F7]

### Phase 2 — Footer legal links → `next/link` (F1)

4. `footer.tsx` — the two legal anchors convert to `next/link` (identical
   rendered markup, client-side navigation — same conversion pattern as
   session-12's three). The existing legal-pages e2e spec
   ("footer legal links reach both pages from the landing page") is the
   characterization net.
5. `eslint.config.mjs` — the `no-html-link-for-pages` entry gains the
   blind-spot note: the plugin's href normalization appends a trailing slash
   that app-route regexes lack, so only root-href anchors can match; the
   footer conversions were audit-found, not rule-found.

### Phase 3 — Per-run XFF keys for every request-level spec (F2)

6. `appointment-form.spec.ts` — module-level per-run keys with distinct
   third octets (198.51.100/101/102-style constant discrimination, run tag
   from `Date.now()`), replacing the fixed `203.0.113.1` (happy path),
   `203.0.113.4` (non-object body) and `203.0.113.2` (impossible dates ×3).
   The existing inline per-run keys (limiter 429, 413) stay untouched —
   disjoint ranges guarantee no intra-file collision.
7. `auth.spec.ts` — same conversion for the fixed `203.0.113.51`
   (non-object body) and `203.0.113.50` (enumeration parity, 2 reqs share
   the spec's key) using the 192.0.2.x range — disjoint from the login
   limiter pin's 198.51.100.x.

### Phase 4 — Baseline security headers (F3)

8. `next.config.ts` — `poweredByHeader: false` + an `headers()` entry
   applying to all routes: `X-Content-Type-Options: nosniff`,
   `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
   Comments record WHY each is safe for this app (no framing consumers, no
   referrer-dependent features, MIME sniffing irrelevant but free to close).
   Response headers are invisible to rendering — zero parity impact.

### Phase 5 — Login email length bound (F5)

9. `login/route.ts` — import `EMAIL_MAX_LENGTH` from the validation seam;
   the email branch gains `else if (email.length > EMAIL_MAX_LENGTH)` →
   `errors.email = "Email must be 254 characters or fewer."` (identical
   message to the appointments route). The 422 fires BEFORE any scrypt/db
   work — no new oracle: the sender already knows the email they sent is
   too long, and the malformed-email 422 already short-circuits identically.
   The contract comment updates.

### Phase 6 — Curated transport-failure messages (F7)

10. `appointment-form.tsx` + `login-form.tsx` — the catch maps
    `error instanceof TypeError` (fetch's network-failure shape) to a
    curated message ("We couldn't reach the server. Please check your
    connection and try again." / "Sign-in is unreachable right now. Please
    check your connection and try again."); every other Error keeps
    `error.message` (already curated: API body messages or "Request failed
    (status)").

### Phase 7 — Doc corrections (F4, F6)

11. `docs/DEPLOYMENT.md` — a prominent warning in the artifact-shipping
    section: `next build` copies `.env` into `.next/standalone/.env`
    (secrets travel with the artifact); strip it before shipping or treat
    the artifact as secret-bearing and rotate. Cross-reference §6 for CSP
    guidance at the proxy seam.
12. `src/lib/db.ts` — the dev-log comment corrects to Prisma 6.11 reality:
    query logs print SQL templates with `?` placeholders; bound parameters
    are NOT printed. Keep the "don't pipe dev.log into shared systems"
    guidance (defense in depth).

### Phase 8 — Full verification (the TDD net)

13. `bun run lint && bun run typecheck && bun run test && bun run build &&
    bun run test:e2e` — acceptance: lint 0, tsc clean, 85 unit (no unit
    changes — all new pins are e2e-level), build with the IDENTICAL route
    table, e2e green at its new count (38 → 41: +1 login email bound, +1
    security headers, +1 transport-failure message).
14. Fresh dev-server parity spot-checks on both sites (desktop 7490px;
    mobile panel 192×148 @ (178,80); link-click closes + jumps to the
    identical scroll offset) + the product loop under the active ambient
    `DATABASE_URL` hijack + live re-probe of F5 (300-char login email → 422).

### Phase 9 — DB cleanup + screenshots

15. Purge the audit probe rows (2 × AUDIT14 + the orchestrator's
    "Parity Loop Probe S14" row); re-seed realistic rows for the
    screenshots; re-capture the 20-screenshot set into `docs/screenshots/`
    (existing filename convention) from the dev server running the
    remediated tree.

### Phase 10 — Session docs, commit, push

16. `docs/session_14.md`; repo `worklog.md` entries; SKILL.md → v2.6.0;
    PAD `[S14]` revision + known-issues updates; README/CLAUDE/AGENTS count
    updates + the footer-link/lint-blind-spot and security-header notes.
    `.env.example` re-verified against the codebase (no env changes this
    session).
17. Conventional Commits message on `main`; push via
    `docs/ssh_git_wrapper_v3.py` per the runbook (operator key from the
    session brief; shredded after push; remote ref verified).

### Validation of this plan against the codebase (pre-execution)

- F1 verified: `footer.tsx:49,52` read — two plain `<a href="/…">` anchors ✔;
  the three session-12 conversions live in login-form.tsx / legal-page.tsx /
  dashboard page ✔ (git show 8b52c73 file list)
- F2 verified: `appointment-form.spec.ts:53,70,86` + `auth.spec.ts:119,140`
  read — five fixed keys, request counts per run: 1/1/3 and 1/2 ✔; limiter
  maxes 5 (appointments) / 10 (login) read from the routes ✔
- F3 verified: `curl -D - /` — no security headers, `X-Powered-By: Next.js`
  present ✔; next.config.ts read (no headers() block exists) ✔
- F4 verified: `cmp .env .next/standalone/.env` → identical ✔; DEPLOYMENT.md
  has no warning ✔
- F5 verified: `login/route.ts:74` — pattern-only email check ✔;
  `validation.ts` exports `EMAIL_MAX_LENGTH` ✔ (the import target exists)
- F6 verified: dev.log grep — 21 prisma:query lines, zero bound values ✔
- F7 verified: both forms' catch blocks read — `error.message` surfaces the
  raw TypeError string ✔
- T1-T3 Red expectations checked against current behavior: 300-char email →
  401 (sub-agent live), headers absent (orchestrator live), abort → "Failed
  to fetch" (engine string, will be curated) ✔
- The F1 conversion cannot break parity: `next/link` renders an identical
  `<a>` with the same class/href; the legal-pages e2e pins the navigation ✔
- The F3 headers cannot break parity: response headers are not part of the
  rendering contract; no e2e asserts their absence ✔
