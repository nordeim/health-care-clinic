# Remediation Plan — Session 16 (Appointment Status Management, e2e Key Determinism, Lint-Gate Strengthening & Doc-Claim Honesty)

**Date:** 2026-10-05
**Scope:** Full re-audit of the session-14 remediated tree (`55f7f08` + the
docs-only `8071d20` — the operator transcript paste that became
`docs/session_15.md`), with live re-verification against the reference site,
plus remediation of the new findings AND closure of the last documented
backlog item (appointment status management). The repo `skills/` folder is
excluded from checking, testing and compilation per the operating
instructions.
**Method:** `skills/code-review-and-audit` native-CLI fallback pipeline (static
gates + `bun audit` + a fresh-eyes full review dispatched as a read-only
sub-agent — every finding re-verified empirically or line-by-line by the
orchestrator before acceptance), `skills/agent-browser` live parity probes on
both the reference and the local clone (desktop 1440×900 + mobile 390×844),
`skills/test-driven-development` doctrine — the green 85-unit + 41-e2e suite
is the characterization net; every new behavior gets a failing test first.

---

## Part 1 — Audit Findings

### 1.1 Verified healthy (re-confirmed this session)

| # | Check | Evidence |
|---|-------|----------|
| H1 | Lint / type gate | `bun run lint` → 0 errors; `bun run typecheck` → clean under true strict |
| H2 | Unit layer | `bun run test` → 85/85 (db-path 15 + auth 19 + deps 4 + validation 27 + rate-limit 20) |
| H3 | Production build | `bun run build` → OK; route table identical to the documented one (4 static + 5 dynamic + /_not-found) |
| H4 | E2E layer | `bun run test:e2e` → 41/41 (5 spec files, single worker) |
| H5 | Environment | `.env` with `DATABASE_URL="file:../db/custom.db"` (operator credentials + AUTH_SECRET, leading-`$` escaped), `db/custom.db` + `db/e2e.db` at the repo root, `.env.example` matches the codebase; ambient `DATABASE_URL` hijack ACTIVE in the shell (the documented ADR-010 threat) — the npm-script `env -u` guards held through every probe |
| H6 | Live landing parity | Reference vs clone at 1440×900 (agent-browser, same session, same method): page height **7490px both**; h2 `60px/63px` both; h3 `20px/25px` both; all 7 section ids present both; `<main>` present both; reference `<title>` still the `Base44 APP` placeholder (recorded deviation, e2e-pinned) |
| H7 | Mobile navigation (operator's key concern) | Panel geometry **byte-exact both sides**: `192×148 @ (178, 80)`, `display: grid`, radius `24px`, padding `8px`; reference paints `rgba(38,74,57,.9)` while the clone computes the oklab equivalent (documented v4 format variance; e2e rasterizes the pixel); 3 identical links; `aria-expanded` contract on both |
| H8 | Mobile menu behavior | Link activation closes + unmounts the panel and jumps: `#services` lands at viewport top **0.421875 on BOTH sites** (same-session, same-method measurement) — identical to the pixel |
| H9 | Staff auth loop | Operator-credential login → `200` + cookie → `/dashboard` `200`; public form POST → `201` → row visible on the authenticated dashboard; logout `200` |
| H10 | Session-14 fixes | Footer legal links serve as `next/link` anchors (verified in served HTML); security headers present on `/`, `/login`, `/api/health`, the `/dashboard` 307, 404s and both POST routes (sub-agent sweep) with `X-Powered-By` gone; login email bound (300-char pattern-valid email → 422 "Email must be 254 characters or fewer."); every request-level e2e spec derives its spoofed XFF key per run (module constants, spec-unique third octets — no fixed 203.0.113.1/2/4/50/51 remain) |
| H11 | Session-2/4/6/8/10/12 fixes | Sub-agent re-verified every documented fix live where cheap (255-char email → 422; specialty 42 → 422; chunked 70KB → 413; login null body → 422; yesterday → 201 / 2-days-ago → 422; unknown vs wrong password → identical 401 at 48.9ms vs 41.4ms; cookie contract; dashboard guard; health) — zero regressions |
| H12 | Security scans | `bun audit` → the same two known dev-tooling advisories (braces via eslint-config-next, deepmerge-ts via prisma) — documented and accepted; secret-pattern scan clean in application code |
| H13 | dev.log health | Zero unhandled rejections, zero hydration errors through every probe |

### 1.2 Issues found (remediation required)

All findings verified by the orchestrator (live probe or line-by-line read)
before acceptance; none is a regression of a documented fix.

| ID | Severity | Finding | Evidence |
|----|----------|---------|----------|
| F1 | **Low (doc accuracy + coverage)** | **Framework-generated 308 trailing-slash redirects carry NO security headers.** `next.config.ts` `headers()` applies to route responses and app-level redirects but NOT to Next's internal trailing-slash normalization. The docs claim headers on "every route / every response" — overstated. | Orchestrator: `curl -sD - /privacy-policy/` → `308 → location: /privacy-policy` with only Refresh/Date/Connection/Keep-Alive/Transfer-Encoding — no nosniff/XFO/Referrer-Policy; contrast `/dashboard` → `307` WITH all three |
| F2 | **Info (test determinism)** | **The per-run XFF keys are not cross-run collision-proof as documented.** `Date.now() % 200 + 10` collides with p≈1/200 per back-to-back run pair (Δt ≡ 0 mod 200 ms) inside the 10-min limiter window under `reuseExistingServer`. Intra-run uniqueness (spec-unique third octets) holds; the comment's "nor across runs" claim is wrong. Same `Date.now() % 200` weakness in the inline limiter/413/login-limiter keys. | Code read of both spec files (module constants + 3 inline sites); arithmetic |
| F3 | **Info (lint-gate honesty)** | **Stale eslint rationale + one free rule.** `no-non-null-assertion` is OFF citing "reveal.tsx" — but reveal.tsx contains no non-null assertion today (`ref as never`); the single remaining site is `getContext("2d")!` in mobile-navigation.spec.ts:62. The rule can be ON → the gate strengthens from 13 to 14 correctness rules. | Orchestrator: `bunx eslint . --rule '{"@typescript-eslint/no-non-null-assertion":"error"}'` → exactly 1 error at mobile-navigation.spec.ts:62:21 |
| F4 | **Info (ops hygiene)** | **`dev`/`start` pipe through `tee` → the script exit code is tee's, not the server's.** Wrappers relying on exit codes see success on server crash; `/api/health` + `dev.log` remain the real signals. Document, don't restructure (pipefail wrappers would churn the documented dev workflow for near-zero value). | `package.json` read: both scripts end `… \| tee <log>` |
| F5 | **Info (secret hygiene)** | **The live staff password is printed in 4 repo docs.** `the operator credential` (verified working by the login probe) appears verbatim as the dotenv `$`-escaping example in README.md, AGENTS.md, CLAUDE.md, health-care-clinic_SKILL.md. Rotation is the operator's call; the docs stop publishing it going forward (git history is immutable on main — noted in the plan). | the credential-pattern grep → 4 doc files; login probe 200 |
| F6 | **Info (doc drift + code nits)** | **Cosmetic drift.** PAD §11 line counts stale (appointments route "~170" vs actual 82; appointment-form "~165" vs 235; auth.spec "~110" vs 227); README File Hierarchy + CLAUDE.md File Organization missing `validation.ts`/`rate-limit.ts`/`motion.ts`; README "Landing composition (9 sections)" vs 8 rendered `<section>` elements; appointment-form.tsx:9 comment typo "anative"; :121 `noValidate={false}` explicit no-op. | `wc -l` on the §11 files; `rg -c "<section"` on served HTML → 8; file reads |

### 1.3 Standing gap (documented backlog — closure scheduled this session)

| ID | Severity | Gap | Evidence |
|----|----------|-----|----------|
| G1 | **Backlog feature** | **The dashboard is read-only: staff cannot transition an appointment's state** (confirm / complete). Last open item in the PAD §10 backlog ("natural next feature" per the session-14 closing note). The reference has no dashboard at all, so this is beyond-parity surface — no parity impact; the landing page stays byte-faithful. | PAD §10 row "Dashboard is read-only"; dashboard page read (stats + table, no write path); schema read (no status field) |

### 1.4 Considered and deliberately NOT remediated (doctrine)

| Item | Decision | Rationale |
|------|----------|-----------|
| Making the 308 carry headers (middleware or `skipTrailingSlashRedirect`) | Skip | Adding middleware contradicts the documented no-middleware ADR; `skipTrailingSlashRedirect: true` would 404 the trailing-slash URLs instead of redirecting (a behavior regression). The 308 is an empty-body framework redirect with ~nil exposure — the honest fix is precise docs + an e2e characterization pin (Next changing this later gets noticed). |
| API-level transition-graph enforcement (new→confirmed→completed only) | Skip | The PATCH seam validates the STATUS VALUE only; the UI presents the linear workflow. A crafted direct-complete is a staff-only convenience, not an integrity break (single-admin system, all transitions auditable via `updatedAt`). Documented in the route comment. |
| Scrubbing the live credential from git history | Skip | Never rewrite pushed history on `main`. The docs stop carrying it going forward; rotation is the operator's call (noted in the session log). |
| `tee` exit-code masking code fix | Skip (doc note only) | F4 — see above. |
| `aria-controls` dangling + focus-to-body after menu-link activation | Keep | Documented parity behavior (the reference unmounts the panel too — probed session 8). Fixing would DEVIATE from the reference DOM/behavior contract. |
| Full CSP header | Guidance only | Documented as the reverse-proxy seam's job (DEPLOYMENT.md §6); unchanged. |

---

## Part 2 — Remediation Plan (TDD)

All changes land on `main` (no new branches). `skills/` stays out of
lint/typecheck/test/build. New behaviors get failing tests first; the full
gate re-runs after every phase.

### Phase 1 — Red tests (the TDD net)

1. **New unit seam `tests/status.test.ts`** (Red: the seam doesn't exist):
   `validateStatusUpdate` — allowlist membership ("new"/"confirmed"/"completed"
   pass); non-allowlist values, wrong case ("New"), non-string types
   (42/true/null-as-value), missing/empty status, and non-object bodies
   (null/scalars) → 422 field map; `APPOINTMENT_STATUSES` derived from
   content.ts (never hand-copied — same doctrine as
   `APPOINTMENT_SPECIALTIES`).
2. **New e2e spec `tests/e2e/appointments-status.spec.ts`** (Red: the route
   doesn't exist → 404): public form POST (per-run unique fullName + per-run
   XFF key) → login (E2E_ADMIN credentials from global-setup) → dashboard
   shows the row with a "New" badge → click "Confirm" → badge becomes
   "Confirmed" + the button becomes "Complete" → click → "Completed", no
   further action. API-level pins in the same spec: PATCH anonymous → 401;
   PATCH invalid status value → 422; PATCH unknown id → 404.
3. **landing.spec.ts header-pin extension** (characterization, expected
   green): the app-level `/dashboard` 307 redirect carries the three
   security headers (proves the covered surface), and the framework's
   trailing-slash 308 (`/privacy-policy/`) exists with `location` +
   **no** security headers (pins the documented limitation — a Next change
   that alters it gets noticed).

### Phase 2 — Appointment status management (G1, Green)

4. `src/lib/content.ts` — `appointmentStatuses` as-const tuple
   (value + label: New / Confirmed / Completed) — the single source of copy.
5. `src/lib/validation.ts` — `APPOINTMENT_STATUSES: ReadonlySet<string>`
   derived from content.ts + `validateStatusUpdate(payload)` pure seam
   (non-object tolerance, type tightening, exact-match allowlist).
6. `prisma/schema.prisma` — `Appointment` gains `status String @default("new")`
   and `updatedAt DateTime @default(now()) @updatedAt` (defaults keep
   `prisma db push` data-safe for existing rows). `bun run db:push` +
   `prisma generate` afterwards.
7. **`src/app/api/appointments/[id]/route.ts`** — `PATCH`: fixed-window
   limiter (60 / 10 min / key — staff pacing, slows bulk tampering) →
   session guard (same verifySession + admin-exists pattern as the
   dashboard; 401 generic) → `readJsonBody` (64 KiB cap, transport
   tolerance) → `validateStatusUpdate` (422 field map) → id lookup (404) →
   Prisma update → `200 {ok, id, status}` (no PII echo).
8. **Dashboard** (`src/app/dashboard/page.tsx`) — the table gains a Status
   column: badge (New = accent chip, Confirmed = primary tint, Completed =
   muted) + the next-action button rendered by a new client island
   `src/components/dashboard/status-button.tsx` ("use client": busy state,
   fetch PATCH, `router.refresh()` on success, curated inline error on
   failure — reuses the transport-error curation pattern). `findMany`
   select gains `status` + `updatedAt`. Stats cards unchanged (semantics
   documented: "New today" counts submissions).

### Phase 3 — e2e per-run key determinism (F2, Green)

9. `tests/e2e/appointment-form.spec.ts` + `tests/e2e/auth.spec.ts` — the
   run discriminator switches from `(Date.now() % 200) + 10` to
   **`process.pid`** (raw, as the fourth dot-segment): every run is a new
   process and pid recycling requires a full pid_max wrap — structurally
   unique per run (the timestamp scheme had a p≈1/200 back-to-back
   collision). The limiter keys on the raw XFF token (no IPv4 syntax
   requirement — documented in the comment). Spec-unique third octets keep
   intra-run uniqueness; the 198.51.100.x cross-file sharers sit on
   different routes (independent limiter maps). Comments rewritten to state
   exactly this.

### Phase 4 — Lint-gate strengthening (F3, Green)

10. `eslint.config.mjs` — `@typescript-eslint/no-non-null-assertion` moves
    from OFF to ON (comment updated: the gate is now 14 correctness rules);
    the single bought exception (`canvas.getContext("2d")!` in
    mobile-navigation.spec.ts — genuinely optional per the DOM API) gets a
    targeted inline disable with rationale.

### Phase 5 — Code-hygiene nits (F6 code parts, Green)

11. `src/components/site/appointment-form.tsx` — comment typo "anative" →
    "a native"; the `noValidate={false}` explicit no-op removed (React's
    default — behavior byte-identical).

### Phase 6 — Doc-claim honesty (F1, F4, F5, F6 doc parts)

12. Security-header wording everywhere (README.md feature table,
    docs/DEPLOYMENT.md, next.config.ts comment, PAD §6/§10): "every route"
    → "every route response and app-level redirect; the framework's
    internal 308 trailing-slash redirect is emitted before `headers()`
    applies — known limitation, e2e-pinned".
13. `AGENTS.md` — the commands table gains the tee note (dev/start exit
    codes reflect `tee`; rely on `/api/health` + `dev.log`).
14. The live-credential examples in README.md / AGENTS.md / CLAUDE.md /
    health-care-clinic_SKILL.md neutralized to a placeholder
    (`$Up3rS3cretPa55w0rd`-style) — the escaping lesson survives, the live
    credential stops shipping in docs.
15. PAD §11 line counts re-measured; README File Hierarchy + CLAUDE.md
    File Organization completed (validation.ts / rate-limit.ts / motion.ts
    + the new status files); README "9 sections" → the true composition
    (8 scroll sections + fixed header + footer); PAD §10 backlog row for
    status management → CLOSED; the 308 limitation added to §10.

### Phase 7 — Full verification (the TDD net)

16. `bun run lint && bun run typecheck && bun run test && bun run build &&
    bun run test:e2e` — acceptance: lint 0 under 14 ON rules, tsc clean,
    unit 85 → 85+~10 (status seam), build with the route table GAINING
    `ƒ /api/appointments/[id]` (documented), e2e 41 → 41+~5 (status spec +
    header characterization extension).
17. Live re-probes on the dev server: parity spot-checks (both sites:
    7490px; mobile panel 192×148 @ (178,80); link-click 0.421875); the
    product loop WITH status transitions via curl (login → POST → PATCH
    confirm → PATCH complete → dashboard reflects); 308/307 header shapes.

### Phase 8 — DB cleanup + screenshots

18. Purge the audit probe rows (AUDIT16 Yesterday Floor + Product Loop
    Probe S16); set realistic statuses across the retained seed rows via
    the PATCH API (double-duty live probe); re-capture the 20-screenshot
    set into `docs/screenshots/` from the dev server running the
    remediated tree (dashboard shots now show the status column).

### Phase 9 — Session docs, commit, push

19. `docs/session_16.md`; repo `worklog.md` entries; SKILL.md → v2.7.0;
    PAD `[S16]` revision + test-distribution + known-issues updates;
    README/CLAUDE/AGENTS alignment (counts, PATCH route, status feature,
    tee note, header wording). `.env.example` re-verified against the
    codebase (no env changes this session).
20. Conventional Commits message on `main`; push via
    `docs/ssh_git_wrapper_v3.py` per the runbook (operator key from the
    session brief; shredded after push; remote ref verified).

### Validation of this plan against the codebase (pre-execution)

- F1 verified: `curl -sD - /privacy-policy/` → 308 with NO security headers;
  `/dashboard` → 307 WITH them; next.config.ts read (no
  skipTrailingSlashRedirect; headers() source `/:path*`) ✔
- F2 verified: both spec files read — 6 module constants + 3 inline key
  sites all use `Date.now() % 200 + 10`; limiter maxes 5/10 read from the
  appointments route, 10/10 from login ✔; `clientKey` (rate-limit.ts:25-32)
  keys on the raw last XFF token — non-IPv4 strings are valid keys ✔
- F3 verified: `bunx eslint . --rule …no-non-null-assertion…error` → exactly
  1 error (mobile-navigation.spec.ts:62); reveal.tsx contains no `!`
  assertions (only `ref as never` at :87) ✔
- F4 verified: package.json read — both scripts end in `| tee <log>` ✔
- F5 verified: the credential-pattern grep → 4 doc hits; live login probe 200 ✔
- F6 verified: `wc -l` (route 82, form 235, auth.spec 227); served HTML has
  8 `<section>` elements; form file read (typo + noValidate no-op) ✔
- G1 verified: dashboard page read (no write path); schema read (no status
  field); PAD §10 backlog row read ✔; Next 16 dynamic route params are a
  Promise (route handler signature accounted for) ✔
- T1/T2 Red expectations checked against current behavior: the seam import
  fails today (module absent); the PATCH route 404s today ✔
- Parity safety: the status feature touches only `/dashboard` (unlinked,
  beyond-parity) + a NEW API route — the landing surface is untouched ✔
- Schema safety: both new columns carry defaults → `prisma db push` is
  data-preserving for the existing dev + e2e rows ✔
