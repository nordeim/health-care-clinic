# Remediation Plan — Session 18 (e2e Unknown-Bucket Determinism, Dashboard Status Annunciation & Full Doc-Claim Honesty Pass)

**Date:** 2026-10-05
**Scope:** Full re-audit of the session-16 remediated tree (`9e63e5f` + the
docs-only `ba7d4d1` — the operator transcript paste that became
`docs/session_17.md`), with live re-verification against the reference site,
then remediation of the new findings. The repo `skills/` folder is excluded
from checking, testing and compilation per the operating instructions.
**Method:** `skills/code-review-and-audit` pipeline (static gates + `bun
audit` + a fresh-eyes full review dispatched as a read-only sub-agent —
every finding re-verified empirically or line-by-line by the orchestrator
before acceptance), `skills/agent-browser` live parity probes on both the
reference and the local clone (desktop 1440×900 + mobile 390×844),
`skills/test-driven-development` doctrine — the green 95-unit + 43-e2e suite
is the characterization net; every behavior change gets a failing test first.

---

## Part 1 — Audit Findings

### 1.1 Verified healthy (re-confirmed this session)

| # | Check | Evidence |
|---|-------|----------|
| H1 | Lint / type gate | `bun run lint` → 0 errors (14 correctness rules ON); `bun run typecheck` → clean under true strict |
| H2 | Unit layer | `bun run test` → 95/95 (db-path 15 + auth 19 + deps 4 + validation 27 + rate-limit 20 + status 10) |
| H3 | Production build | `bun run build` → OK; route table identical to the documented session-16 one (4 static + `/_not-found` + 5 dynamic + `/api/appointments/[id]`) |
| H4 | E2E layer | `bun run test:e2e` → 43/43 (6 spec files, single worker, 53s) |
| H5 | Environment | `.env` with `DATABASE_URL="file:../db/custom.db"` (operator credentials + `AUTH_SECRET`, leading-`$` escaped), `db/custom.db` + `db/e2e.db` at the repo root, `.env.example` matches the codebase; ambient `DATABASE_URL` hijack ACTIVE in the shell (`file:/home/z/my-project/db/custom.db`) — the npm-script `env -u` guards held through every probe |
| H6 | Live landing parity | Reference vs clone at 1440×900 (agent-browser, same session, same method): page height **7490px both**; h2 `60px/63px` both; h3 `20px/25px` both; all 7 section ids present both; `<main>` present both; reference `<title>` still the `Base44 APP` placeholder (recorded deviation, e2e-pinned) |
| H7 | Mobile navigation (operator's key concern) | Panel geometry **byte-exact both sides**: `192×148 @ (178, 80)`, `display: grid`, radius `24px`, padding `8px`; reference paints `rgba(38,74,57,.9)` while the clone computes the oklab equivalent (documented v4 format variance; e2e rasterizes the pixel); 3 identical links; `aria-expanded` contract on both |
| H8 | Mobile menu behavior | Link activation closes + unmounts the panel and jumps: `#services` lands at viewport top **0.421875 on BOTH sites** (same-session, same-method measurement) — identical to the pixel |
| H9 | Staff auth loop + status transitions | Login `200` + cookie → `/dashboard` `200` → public form POST `201` → PATCH confirm `200 {status:"confirmed"}` → PATCH complete `200 {status:"completed"}` → dashboard renders "Parity Loop Probe S18" with the Completed badge; anonymous PATCH → `401`; logout `200` |
| H10 | Session-16 fixes | Sub-agent live-verified: PATCH 401/422/404 edges; 308 trailing-slash carries NO security headers (documented limitation) vs the 307 app-level redirect WITH them (both e2e-pinned); login 300-char pattern-valid email → 422 "Email must be 254 characters or fewer."; headers + no `X-Powered-By` on every probed route; 13 pid-derived XFF key sites across the three request-level spec files |
| H11 | Session-2/4/6/8/10/12/14 fixes | Sub-agent re-verified live: 255-char email → 422; specialty 42 → 422; chunked 70KB → 413; login null body → 422 field map; yesterday → 201 / 2-days-ago → 422; unknown vs wrong password → identical 401 at 49ms vs 40ms; cookie contract; dashboard guard 307; health 200; `GET /api/appointments/[id]` → 405 — zero regressions |
| H12 | Security scans | `bun audit` → the same two known dev-tooling advisories (braces via eslint-config-next, deepmerge-ts via prisma) — documented and accepted |
| H13 | dev.log health | Zero errors, zero unhandled rejections, zero hydration errors through every probe |

### 1.2 Issues found (remediation required)

All findings verified by the orchestrator (live probe or line-by-line read)
before acceptance; none is a regression of a documented fix. No
Critical/High/Medium — the code, security, and parity surfaces held under
every probe shape tried; the findings are test determinism, one a11y gap on
the beyond-parity surface, and doc-claim drift.

| ID | Severity | Finding | Evidence |
|----|----------|---------|----------|
| F1 | **Low (doc accuracy)** | README.md:179 says "**13** correctness rules ON" — the gate has been 14 since session-16 F3 (AGENTS.md:17, PAD, SKILL.md all say 14). | README read + eslint.config.mjs:29 count |
| F2 | **Low (doc accuracy)** | CLAUDE.md:236-237 Success Metrics: "**13** correctness rules ON" vs actual 14. | CLAUDE.md read |
| F3 | **Low (doc accuracy)** | CLAUDE.md:39 Six-Phase VERIFY: "Playwright e2e (**41 tests**)" vs 43 — contradicting CLAUDE.md:238 ("43/43 e2e") in the same file. | CLAUDE.md read + spec count (10+2+9+12+3+7=43) |
| F4 | **Low (doc completeness)** | The client-island lists omit **StatusButton** (session-16's own new island): AGENTS.md:115-117 ("use client" only for Header/Hero/AppointmentForm/Reveal/LoginForm/LogoutButton), CLAUDE.md:82-83 (State Management: `useState` in Header/Hero/AppointmentForm/Reveal — omits all three dashboard islands), health-care-clinic_SKILL.md:177,188-191. | File reads; `src/components/dashboard/status-button.tsx` is a `"use client"` island with local state |
| F5 | **Low (doc drift)** | SKILL.md v2.7.0 body staleness: :50 "`/` (**9-section** scroll narrative)" — live HTML has **8** `<section>` elements (README was fixed in S16, SKILL wasn't); :330 unit breakdown lists 85 worth of components ("db-path 15 + auth 19 + deps 4 + validation 27 + rate-limit 20") missing "+ status 10"; :510 Appointment type missing `status` + `updatedAt`; :531 API contracts missing `PATCH /api/appointments/[id]` (and 413 on POST). | SKILL.md reads + live section count + schema read |
| F6 | **Low (doc drift, some misleading)** | PAD sections beyond §1/§2/§7/§10/§11 were never refreshed across sessions: **§3.2 tree** missing `api/appointments/[id]/route.ts`, `status-button.tsx`, `validation.ts`, `rate-limit.ts`, `motion.ts`, 3 test files + stale counts ("auth.test.ts ← 14" vs 19, "e2e/ ← 28 tests" vs 43, "screenshots/ ← 15" vs 20); **§4.1** ER diagram omits `status`/`updatedAt` AND the `AdminUser` entity, and still says "Single table `appointments`" vs §2's "two tables" (self-contradiction); **§5.3** "Radix deps remain installed but unused" — **FALSE** (removed session 6; `tests/deps.test.ts` pins the allowlist); **§6.3** "None — the site has no accounts by design… put it behind the scaffold's NextAuth option" — **contradicts ADR-008 in the same document** (staff auth exists since S2; NextAuth explicitly rejected); §6.1 cites `ALLOWED_SPECIALTIES` (actual export: `APPOINTMENT_SPECIALTIES`); §5.4 describes the CTA reduced-motion as "browser-controlled" (explicit instant-jump since S10, e2e-pinned); §8.2 env table omits AUTH_SECRET/ADMIN_EMAIL/ADMIN_PASSWORD; §9.1 setup omits `db:seed`. | PAD reads vs code/schema/deps.test.ts |
| F7 | **Info (doc drift)** | PAD §11 residual stale line counts the S16 re-measure missed: reveal.tsx "~70" vs **94**; auth.ts "~120" vs **150**; content.ts "~190" vs **206**; Validation Report "~310" vs **334**. | `wc -l` on the four files |
| F8 | **Low (test determinism)** | **The "a reuseExistingServer instance can never poison another run's limiter bucket" claim (AGENTS.md:160-162, CLAUDE.md:157-159) is overstated for BROWSER-DRIVEN requests.** The suite makes 3 XFF-less appointments POSTs per run (appointment-form happy-path + 422-UI browser submits, auth.spec:66 `page.request.post`) — all land in the shared **"unknown"** bucket (limit 5/10min) → run 2's 6th POST (auth.spec:75, expecting 201) **429-flakes** under `reuseExistingServer` (true locally). Login limiter unknown bucket: 4 browser logins/run vs 10 — trips on a 3rd consecutive run. PATCH unknown bucket: 2 StatusButton fetches/run vs 60 — 30 runs. The session-16 F2 pid fix covered only the spoofed-key requests. | Live proof on :3000: 6 XFF-less POSTs → `422,422,422,422,422,429`; spec reads counting the 9 browser-driven POST/PATCH sites; playwright.config.ts `reuseExistingServer: !process.env.CI` |
| F9 | **Info (stale comment)** | landing.spec.ts:158 — "contact + footer + form-success context" for the third `tel:` link; the form-success state never renders in this spec (the third live link is the FAQ's). | Spec read + live link count (exactly 3 `tel:+11234567890`) |
| F10 | **Info (a11y, beyond-parity surface)** | Dashboard status changes (badge New→Confirmed) are not announced to assistive tech — no `role="status"`/`aria-live` (WCAG 4.1.3 Status Messages); the StatusButton's error path already carries `role="alert"`. | dashboard/page.tsx:252-259 read (badge span has no live semantics) |
| F11 | **Info (doc completeness)** | README.md:72 Architecture table: "Vitest … Pure seams (db-path resolution, auth crypto)" — incomplete vs the actual five seams + status (the Key-Features row :51 has the full list). | README read |

### 1.3 Considered and deliberately NOT remediated (doctrine)

| Item | Decision | Rationale |
|------|----------|-----------|
| Transition-graph enforcement on PATCH (new→confirmed→completed) | Skip (unchanged) | Documented session-16 decision: the seam validates the VALUE only; staff may jump states legitimately; `updatedAt` stamps the audit trail. |
| Purging the credential from git history | Skip (unchanged) | Never rewrite pushed main; docs stopped carrying it in S16. |
| CSP / full security headers on the framework's 308 | Skip (unchanged) | Documented limitation + e2e characterization pin (S16 F1); middleware contradicts the no-middleware ADR. |
| Dashboard filtering / CSV export | Skip — candidate for a future session | Beyond-parity surface; the PAD §10 backlog is EMPTY after S16's G1 closure. No operator ask this session; scope discipline (the audit found no feature gap). Recorded as the suggested next step in the session log. |
| `aria-controls` dangling + focus-to-body after menu-link activation | Keep (unchanged) | Documented parity behavior (the reference unmounts the panel too — probed session 8). Fixing would DEVIATE from the reference DOM/behavior contract. |

---

## Part 2 — Remediation Plan (TDD)

All changes land on `main` (no new branches). `skills/` stays out of
lint/typecheck/test/build. Behavior changes get failing tests first; the
full gate re-runs after every phase.

### Phase 1 — Red tests (the TDD net)

1. **Double-run e2e flake repro (F8 Red evidence):** run the e2e suite
   twice back-to-back against the same `reuseExistingServer` instance —
   run 2 must fail at auth.spec:75 (`expect(submit.status()).toBe(201)`
   receives 429: the 6th XFF-less POST into the exhausted "unknown"
   bucket). This empirically pins the poisoning the docs overclaimed
   against. (Test-order arithmetic: appointment-form happy-path=4th,
   422-UI=5th unknown-bucket POSTs of the 10-min window; auth.spec:66's
   POST is the 6th.)
2. **A11y Red (F10):** extend `tests/e2e/appointments-status.spec.ts`
   test 1 with `await expect(row.getByText("New", { exact: true
   })).toHaveAttribute("role", "status")` — fails today (the badge span
   carries no role).

### Phase 2 — e2e per-run key coverage for EVERY request (F8, Green)

3. **`tests/e2e/appointment-form.spec.ts`** — new module constant
   `UI_KEY = 198.51.106.${process.pid}` (spec-unique third octet,
   pid-derived — same doctrine as the existing keys). The two
   browser-driven form tests (happy path, 422-UI) register
   `page.route("**/api/appointments", route => route.continue({headers:
   {...route.request().headers(), "X-Forwarded-For": UI_KEY}}))` before
   submitting — the browser POSTs leave the shared "unknown" bucket. The
   network-failure test keeps `route.abort()` (never reaches the limiter).
   The key comment block documents the closure.
4. **`tests/e2e/auth.spec.ts`** — new constants
   `APPOINTMENTS_UI_KEY = 192.0.5.${process.pid}` and
   `LOGIN_UI_KEY = 192.0.6.${process.pid}`. The :66 `page.request.post`
   gains the explicit XFF header (request-level — unambiguous). The two
   browser login tests (wrong-credentials, login→dashboard loop) register
   `page.route("**/api/auth/login", …continue with LOGIN_UI_KEY)` — the
   browser login POSTs leave the login limiter's unknown bucket. Logout
   has no limiter (verified) — no injection needed.
5. **`tests/e2e/appointments-status.spec.ts`** — new constant
   `LOGIN_UI_KEY = 198.51.107.${process.pid}`; both tests' browser logins
   get the `**/api/auth/login` route injection; test 1 additionally routes
   `**/api/appointments/*` injecting the EXISTING `PATCH_KEY` so the two
   StatusButton browser PATCHes carry the per-run key too (idempotent with
   the API-level PATCH calls — same key either way). After this phase
   EVERY request the suite makes — request-level AND browser-driven —
   carries a pid-derived per-run key: the AGENTS/CLAUME claim becomes
   exactly true, and the double-run repro from Phase 1 goes green twice.
   All new third octets (106/107, 192.0.5/6) are disjoint from every
   existing base (198.51.100-105, 203.0.113, 192.0.2-4).

### Phase 3 — Dashboard status annunciation (F10, Green)

6. **`src/app/dashboard/page.tsx`** — the status badge span gains
   `role="status"` (implicit `aria-live="polite"`): after
   `router.refresh()` only the mutated badge text announces (React
   reconciles rows in place keyed by appointment id — one announcement,
   exactly the WCAG 4.1.3 contract). Beyond-parity surface — zero parity
   impact.

### Phase 4 — Comment + claim honesty (F8 docs part, F9)

7. **`AGENTS.md:160-162` + `CLAUDE.md` testing-quirks** — the determinism
   claim updated to state the full truth: every request-level spec derives
   per-run keys AND every browser-driven POST/PATCH gets its per-run key
   injected via `page.route` — no request the suite makes touches the
   shared "unknown" bucket, within or across runs.
8. **`tests/e2e/landing.spec.ts:158`** — comment corrected to "contact +
   footer + FAQ context".

### Phase 5 — Doc-claim honesty pass (F1-F7, F11)

9. README.md: :179 `13→14`; :72 Vitest row completed (validation +
   rate-limit + status seams + the dependency pin).
10. CLAUDE.md: :39 `41→43`; :236-237 `13→14`; :82-83 State Management
    completed (Header/Hero/AppointmentForm/Reveal + LoginForm/
    LogoutButton/StatusButton dashboard islands); the client-island
    convention line gains StatusButton.
11. AGENTS.md: client-island list gains StatusButton.
12. health-care-clinic_SKILL.md: :50 "9-section"→8 scroll sections;
    :330 breakdown "+ status 10"; :510 Appointment type gains `status` +
    `updatedAt`; :531 API contracts gain `PATCH /api/appointments/[id]`
    (+413 on POST); :177/:188-191 client-island lists gain StatusButton;
    version → v2.8.0 with the [S18] change note.
13. Project_Architecture_Document.md: §3.2 tree completed (validation /
    rate-limit / motion / status-button / [id] route / status+rate-limit
    unit files / appointments-status spec; counts 19 unit-auth, 43 e2e, 20
    screenshots); §4.1 ER completed (AdminUser entity + Appointment
    status/updatedAt + the "two tables" truth); §5.3 Radix sentence
    corrected (removed in session 6, pinned by deps.test.ts); §5.4 CTA
    reduced-motion wording (instant jump, e2e-pinned since S10); §6.1
    `ALLOWED_SPECIALTIES`→`APPOINTMENT_SPECIALTIES` (derived, exported by
    validation.ts); §6.3 rewritten to the ADR-008 reality (dependency-free
    scrypt + HMAC staff auth; NextAuth explicitly rejected); §8.2 env
    table completed (AUTH_SECRET / ADMIN_EMAIL / ADMIN_PASSWORD); §9.1
    quick start gains `db:seed`; §11 line counts re-measured (reveal 94,
    auth 150, content 206, report 334); [S18] revision block.

### Phase 6 — Full verification (the TDD net)

14. `bun run lint && bun run typecheck && bun run test && bun run build &&
    bun run test:e2e` — acceptance: lint 0 under 14 ON rules, tsc clean,
    95/95 unit, build identical route table, **e2e 43/43** — then the
    double-run proof: a SECOND consecutive `test:e2e` within the 10-min
    window against the reused server must ALSO be 43/43 (the F8
    acceptance: the flake is gone, not just undetected).

### Phase 7 — DB cleanup + screenshots

15. Purge the audit + loop probe rows (AUDIT18 Status Loop Probe
    `cmuv4chse0000rc46j4ecrm2e`, AUDIT18 Yesterday Floor
    `cmuv4d7fn0001rc46kmll823y`, Parity Loop Probe S18
    `cmuv4zv2b0002rc469waabe39`); re-capture the 20-screenshot set into
    `docs/screenshots/` from the dev server running the remediated tree.

### Phase 8 — Session docs, commit, push

16. `docs/session_18.md`; repo `worklog.md` entries (orchestrator +
    sub-agent); SKILL.md → v2.8.0; PAD `[S18]` revision; `.env.example`
    re-verified (no env changes this session).
17. Conventional Commits message on `main`; push via
    `docs/ssh_git_wrapper_v3.py` per the runbook (operator key from the
    session brief; shredded after push; remote ref verified).

### Validation of this plan against the codebase (pre-execution)

- F1-F3 verified: README:179 / CLAUDE:39,236-237 read against the
  eslint.config.mjs rule count (14) and the spec-derived e2e count (43) ✔
- F4 verified: AGENTS.md:115-117 + CLAUDE.md:82-83 + SKILL.md island lists
  read; status-button.tsx is a `"use client"` island ✔
- F5 verified: SKILL.md:50/330/510/531 read; live section count = 8;
  schema has status + updatedAt; PATCH route exists ✔
- F6 verified: PAD §3.2/§4.1/§5.3/§5.4/§6.1/§6.3/§8.2/§9.1 read;
  deps.test.ts pins the dependency allowlist (no Radix); ADR-008 documents
  the auth decision; validation.ts exports APPOINTMENT_SPECIALTIES ✔
- F7 verified: `wc -l` reveal.tsx 94 / auth.ts 150 / content.ts 206 /
  Tailwind-V4-Validation-Report.md 334 vs the §11 approximations ✔
- F8 verified: the 9 browser-driven POST/PATCH sites enumerated
  (appointment-form :54/:125 — the :196 abort never reaches the server;
  auth :41/:81/:66; appointments-status :41/:75/:47/:51); limiter maxes
  read from the routes (5 / 10 / 60); live proof 6 XFF-less POSTs → 429
  on the 6th; `reuseExistingServer: !process.env.CI` read ✔
- F9 verified: landing.spec.ts:154-162 read; exactly 3 live tel: links ✔
- F10 verified: dashboard/page.tsx:252-259 — the badge span carries no
  live-region semantics; the error path in status-button.tsx:75 has
  `role="alert"` ✔
- F11 verified: README.md:71-73 read ✔
- TDD Red expectations checked: the double-run failure point (auth.spec:75)
  is order-deterministic (files alphabetical, in-file declaration order);
  the aria Red assertion targets an attribute that does not exist today ✔
- Parity safety: F8 touches ONLY test files; F10 touches only
  `/dashboard` (unlinked, beyond-parity) — the landing surface is
  untouched ✔
