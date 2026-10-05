# Remediation Plan — Session 10 (Body-Cap Bypass, Login Null-Body 500, Async scrypt & Robustness Completions)

**Date:** 2026-10-05
**Scope:** Full re-audit of the session-8 remediated tree (`224d21e`…`2b7a40a`;
the latter is docs-only — the operator transcript paste that became
`docs/session_9.md`), with live re-verification against the reference site,
plus remediation of the new findings. The repo `skills/` folder is excluded
from checking, testing and compilation per the operating instructions.
**Method:** `skills/code-review-and-audit` native-CLI fallback pipeline
(static gates + `bun audit` + fresh-eyes full review dispatched as a
read-only sub-agent), `skills/agent-browser` live parity probes on both the
reference and the local clone (desktop 1440×900 + mobile 390×844),
`skills/test-driven-development` doctrine — the green 65-unit + 34-e2e suite
is the characterization net; every new behavior gets a failing test first.

---

## Part 1 — Audit Findings

### 1.1 Verified healthy (re-confirmed this session)

| # | Check | Evidence |
|---|-------|----------|
| H1 | Lint / type gate | `bun run lint` → 0 errors; `bun run typecheck` → clean under true strict |
| H2 | Unit layer | `bun run test` → 65/65 (db-path 15 + auth 18 + deps 4 + validation 18 + rate-limit 10) |
| H3 | Production build | `bun run build` → OK; route table identical to the documented one (4 static + 5 dynamic + /_not-found) |
| H4 | E2E layer | `bun run test:e2e` → 34/34 (5 spec files, single worker) |
| H5 | Environment | `.env` = `DATABASE_URL="file:../db/custom.db"` + operator credentials + `AUTH_SECRET`; `.env.example` matches the codebase; `db/` at repo root with `custom.db` + `e2e.db`; `node_modules` re-provisioned after sandbox reset (`bun install`, zero changes) |
| H6 | Live landing parity | Reference vs clone at 1440×900: page height **7490px both**; h2 `60px` both; h3 `20px` both; all 7 section ids present both; `<main>` present both; date input has **no `min`** both; `tel:` hrefs uniformly `tel:+11234567890` both; reference `<title>` still the `Base44 APP` placeholder (recorded deviation, e2e-pinned). NB: agent-browser's *default* viewport is 1280×577 — the 1440×900 contract must be set explicitly (`agent-browser set viewport 1440 900`) or heights mislead (7229px artifact observed and explained) |
| H7 | Mobile navigation (operator's key concern) | Panel geometry **byte-exact both sides**: `192×148 @ (178, 80)`, `display: grid`, radius `24px`, padding `8px`, reference paints `rgba(38,74,57,.9)` while the clone computes the oklab equivalent (documented v4 format variance; e2e rasterizes the pixel); trigger ARIA contract on both; panel unmounted when closed on both; 3 identical links |
| H8 | Mobile menu behavior | Link activation closes + jumps: `#services` lands at viewport top **0.0004998518957345971 on BOTH sites** (same-session, same-method measurement — the only valid parity comparison). Escape closes and unmounts the panel on the clone |
| H9 | Env determinism | Ambient `DATABASE_URL=file:/home/z/my-project/db/custom.db` still ACTIVE in the shell; the `/home/z/my-project/db/` hijack location does not even exist on disk — every write landed in `<repo>/db/custom.db` (probe row verified). The `env -u` guards held under the exact threat they exist for |
| H10 | Staff auth loop | Operator-credential login → `200` + cookie → `/dashboard` `200` renders stats + probe rows; public form POST → `201` → row visible on the authenticated dashboard |
| H11 | Reveal choreography | 8 `[data-reveal]` elements, hidden-below-viewport count correct; the layout's 9s self-heal timer correctly cancelled at first Reveal mount (`window.__revealFallback` undefined after hydration) |
| H12 | Security scans | Secret-pattern scan (excl. `skills/`): zero hits in application code; zero `eval`/`innerHTML`; `child_process` only in the e2e global-setup (schema push — intentional); zero TODO/FIXME |
| H13 | `bun audit` | Same two known dev-tooling advisories (`braces` via eslint-config-next, `deepmerge-ts` via prisma) — re-verified unfixable upstream, accepted dev-time risk |
| H14 | Tech-stack reference | scandihaven repo re-reviewed (AGENTS.md): same Next.js 16 / React 19 / Tailwind v4 CSS-first / Vitest + Playwright / ESLint 9 flat / tsc --noEmit family — this repo's patterns remain aligned |

### 1.2 Issues found (remediation required)

All Medium findings were verified empirically this session before acceptance:

| ID | Severity | Finding | Evidence |
|----|----------|---------|----------|
| F1 | **Medium (correctness)** | **Login route 500s on a JSON `null` body.** `login/route.ts:59` reads `body.email` after `(await request.json()) as typeof body` — `null` is valid JSON, the cast is compile-time only, and property access on `null` throws OUTSIDE the try/catch (which only wraps `request.json()`). `POST /api/auth/login -d 'null'` → **500** (verified live; TypeError in dev.log), while the sibling appointments route returns a 422 field map for the exact same input (session-8 fixed it there — `validation.ts:82-85` — but the login route was missed). Arrays/strings/numbers box safely; only `null` throws. | live curl probe this session |
| F2 | **Medium (security/DoS)** | **The 64 KiB body cap is bypassable via `Transfer-Encoding: chunked`.** `bodyTooLarge` trusts only the `content-length` header; a chunked request (no content-length) sails past the 413 gate and `request.json()` buffers the entire body in memory — the route's own comment describes the vector the cap exists to close. Verified live: a 70,065-byte chunked POST returned **422** (full body parsed!) instead of 413; a well-behaved content-length POST of the same size correctly 413s. Oversized chunked bodies are an unbounded memory-exhaustion vector. | live chunked probe this session |
| F3 | **Medium (DoS)** | **Synchronous scrypt blocks the event loop ~30-50 ms per login attempt.** `auth.ts:92` calls `scryptSync` — every login (both failure paths AND success) stalls ALL concurrent requests. Composed with the documented direct-exposure XFF-spoofing limitation (fresh bucket per fabricated key), an attacker starves the process: unlimited keys × 30-50 ms of blocking CPU each. Even legitimate bursts serialize: 10 failed logins ≈ 300-500 ms of dead event loop. The timing-equalization contract does NOT require sync — async scrypt burns identical CPU on the libuv threadpool. | code read (`scryptSync` import + call); floor test pins ~30 ms |
| F4 | **Low (UX)** | **"Pick today or a future date" rejects *today* for patients west of the server's timezone.** The browser date input yields the patient's LOCAL calendar date; `validation.ts:117-118` compares against the SERVER's local midnight. A US patient (UTC−5…−8) booking during their evening submits their "today" that is already the server's "yesterday" → wrongly rejected. | code read; timezone arithmetic |
| F5 | **Low (test quality)** | **`bodyTooLarge`/`MAX_BODY_BYTES` have zero unit coverage** — the 10 rate-limit tests cover `clientKey` + `createRateLimiter` only; the cap is pinned only e2e and only on the honest content-length path (which is exactly why F2 went unnoticed). | `tests/` grep |
| F6 | **Low (flake)** | **e2e limiter specs assume a freshly-booted server.** The 429 spec posts 5×201 under fixed XFF `203.0.113.99`; with `reuseExistingServer: !CI`, an operator-left server on :3100 carries in-memory bucket state across runs → the first POST 429s and the 201 assertion fails confusingly. Cross-RUN persistence, not cross-spec. | spec read + playwright.config read |
| F7 | **Low (a11y)** | **Programmatic smooth scrolling ignores `prefers-reduced-motion`.** Session 8's WCAG sweep covered video/heartbeat/badge — but both `scrollIntoView({ behavior: "smooth" })` calls (`hero.tsx:56`, `header.tsx:98`) animate regardless of the preference. Not coverable by a CSS media guard (it's a JS API argument). | code read |
| F8 | **Info (ops/PII)** | Dev-mode Prisma `log: ['query']` prints bound parameters (patient PII) to the dev console. Dev-only, single-operator; worth an explicit data-handling comment. | `db.ts:27` |

### 1.3 Considered and deliberately NOT remediated (doctrine)

| Item | Decision | Rationale |
|------|----------|-----------|
| Content-type 415 gate on both POST routes (CSRF-via-text/plain hardening) | Skip | Single-admin system + SameSite=Lax cookie makes the vector impact ~nil; a 415 gate adds a new failure mode for content-type-rewriting proxies. Recorded here for a future hardening pass if the threat model grows. |
| Server-side session revocation (logout/token invalidation) | Skip | Inherent to the documented dependency-free stateless-token design (PAD ADR-008); the dashboard's `findUnique` guard already covers the delete-user case. |
| Login form "sending"-state wedge on navigation failure | Skip | Cosmetic; unreachable in practice (cookie is set by the same response that triggers navigation). |
| A few frames of hero video before the reduced-motion pause lands | Skip | Post-hydration DOM-only effect by design (hydration safety trumps a 1-2 frame flash; no CSS-only path can pause a video). |
| Differential timing test (`\|t(null) − t(real)\| < 5ms`) | Skip | Both paths call the SAME `verifyPassword` with the SAME `SCRYPT_COST` constant — equal cost is guaranteed by construction; a wall-clock differential test would add flake without adding guarantees. The ≥10 ms floor pin stays. |
| `global-setup.ts`'s own scryptSync copy | Keep | Documented constraint: Playwright's CJS transpiler + bun-only module types prevent importing the app's ESM auth module; the duplication is commented on both sides and format-pinned by tests. |
| Enabling the ~20 disabled ESLint safety rules / `reactStrictMode` | Skip (this session) | Every effect's cleanup and deps were manually re-verified clean this session (hero interval, media listener, header listeners, reveal observer, limiter interval); enabling rules would surface pre-existing style noise and expand scope beyond the remediation charter. |
| Bucket-map size bound under key-rotation flood | Document | The sweeper bounds growth per window; flooding rates (~1700 rps sustained to reach 1M keys) dwarf the per-request parsing costs that would fall over first. DEPLOYMENT.md §6 gains a note; the acute vector is F3 (sync scrypt), which IS fixed. |
| `noValidate={false}` no-op prop | Keep | Deliberate parity marker documented in the form's comment. |

---

## Part 2 — Remediation Plan (TDD)

All changes land on `main` (no new branches). `skills/` stays out of
lint/typecheck/test/build. New behaviors get failing tests first; the full
gate re-runs after every phase.

### Phase 1 — Stream-based body cap: `readJsonBody` seam (F2, F5) — TDD

1. **Red:** extend `tests/rate-limit.test.ts` with a `readJsonBody` block:
   valid JSON with content-length → `{ok:true, value}`; body WITHOUT
   content-length (a `ReadableStream`) under the cap → ok; chunked-style
   stream body OVER the cap → `{ok:false, status:413}`; content-length over
   cap → 413 without reading; **exactly at the 64 KiB boundary → ok** (`>`
   not `>=`); invalid JSON text → `{ok:false, status:400}`; `null` JSON
   parses fine → `{ok:true, value:null}` (the route layer guards non-objects
   — Phase 2); no body at all → 400.
2. **Green:** `src/lib/rate-limit.ts` gains `readJsonBody(request)`:
   content-length fast path (the existing `bodyTooLarge`), then
   `request.body.getReader()` accumulation with a hard byte cap (cancel the
   reader on breach — releases the socket), concat + `JSON.parse`. `Request`
   construction in unit tests uses real streams — no mocking layer.
3. Rewire both POST routes to `readJsonBody`; the per-route 413 message
   strings stay verbatim; the old `request.json()` try/catch and the
   standalone `bodyTooLarge` route calls are replaced (413-before-parse now
   holds for EVERY transport shape, chunked included).

### Phase 2 — Login non-object body tolerance (F1) — TDD

4. **Red:** `tests/e2e/auth.spec.ts` gains a pin: `POST /api/auth/login`
   with JSON body `null` → **422** with the field map (never 500); same for
   a scalar body (`42`). `tests/e2e/appointment-form.spec.ts` gains the
   mirror pin for `/api/appointments` (null body → 422 field map).
5. **Green:** the login route guards the parsed value —
   `typeof value === "object" && value !== null` → record, else `{}` — the
   email/password checks then produce the 422 field map. Mirrors the
   appointments seam's documented tolerance exactly.

### Phase 3 — Async scrypt (F3) — TDD

6. **Red:** `tests/auth.test.ts` gains a contract test:
   `verifyLoginPassword(…)` returns a Promise (fails against the sync
   implementation), and `await` resolves `false` for the null-hash path.
7. **Green:** `src/lib/auth.ts` — `promisify(scrypt)`;
   `hashPassword`/`verifyPassword`/`verifyLoginPassword` become async with
   unchanged stored format, cost parameters and timing-equalization
   semantics (identical CPU burned on both failure paths — now on the libuv
   threadpool, so the event loop breathes). Callers updated: login route
   (`await`), `scripts/seed.ts` (`await` inside the already-async `main`),
   and the existing 18 auth tests become `await`-based with their
   assertions unchanged. `DUMMY_HASH` is untouched (a precomputed hash —
   verification cost is identical).

### Phase 4 — Timezone tolerance for "today" (F4) — TDD

8. **Red:** `tests/validation.test.ts` gains: a preferredDate one day
   before the server's today is ACCEPTED (the west-of-server patient's
   "today"); two days before is still REJECTED. The existing
   "rejects a date in the past" test (74 years back) keeps passing
   unchanged.
9. **Green:** `validation.ts` — the not-in-the-past floor becomes
   "server-local midnight minus one day", with a comment explaining the
   UTC-west tolerance; the stale-request guard still rejects anything
   older.

### Phase 5 — Reduced-motion-aware scrolling (F7) — TDD

10. **Red:** `tests/e2e/landing.spec.ts` gains a
    `test.use({ reducedMotion: "reduce" })` block: clicking the hero "Get
    started" CTA lands the viewport at `#contact` IMMEDIATELY (scrollY at
    target within 2px right after the click resolves) — fails against the
    always-smooth implementation.
11. **Green:** a tiny shared helper (matchMedia check →
    `behavior: "auto" | "smooth"`) used by both `hero.tsx`
    (`scrollToContact`) and `header.tsx` (`scrollToContact`). DOM-only,
    inside event handlers — zero hydration impact; everyone else keeps the
    reference's smooth behavior.

### Phase 6 — e2e limiter cross-run hardening (F6)

12. `tests/e2e/appointment-form.spec.ts`: the 429 and 413 specs derive
    their spoofed XFF key per run (e.g. `203.0.113.${(Date.now() % 200) +
    10}`) — a leftover server on :3100 can no longer poison the bucket
    assumptions. Comment updated to state the per-run guarantee.

### Phase 7 — Documentation touch-ups (F8 + DEPLOYMENT)

13. `src/lib/db.ts`: comment on the dev query-log PII tradeoff.
14. `docs/DEPLOYMENT.md` §6: one-paragraph note — the body cap is enforced
    in-process for every transport shape as of this session (stream-based);
    the limiter map is swept per window; direct exposure still requires the
    documented proxy.

### Phase 8 — Full verification (the TDD net)

15. `bun run lint && bun run typecheck && bun run test && bun run build &&
    bun run test:e2e` — acceptance: lint 0, tsc clean, unit suite green at
    its new count, build with the IDENTICAL route table, e2e green at its
    new count.
16. Fresh dev-server boot; live parity spot-checks on both sites (desktop
    7490px; mobile panel 192×148; link-click closes + jumps) + the product
    loop under the active ambient `DATABASE_URL` hijack + re-probe the F1/F2
    fixes live (null body → 422; chunked over-cap → 413).

### Phase 9 — Screenshots

17. Re-capture the 11-screenshot set into `docs/screenshots/` (existing
    filename convention) from the dev server running the remediated tree.

### Phase 10 — Session docs, commit, push

18. `docs/session_10.md`; repo `worklog.md` entry; SKILL.md → v2.4.0;
    PAD `[S10]` revision + test tables + known issues; README/CLAUDE/
    AGENTS count updates. `.env.example` re-verified against the codebase
    (no new env vars this session).
19. Conventional Commits message on `main`; push via
    `docs/ssh_git_wrapper_v3.py` per the runbook (operator key from the
    session brief; shredded after push; remote ref verified).

### Validation of this plan against the codebase (pre-execution)

- F1 verified live this session: login + `null` body → 500; appointments +
  `null` → 422 ✔
- F2 verified live this session: 70 KiB chunked POST → 422 (cap bypassed);
  same size with content-length → 413 ✔
- F3 verified by direct read: `scryptSync` at `auth.ts:5,92`; callers =
  login route, seed.ts, auth tests ✔
- F4 arithmetic verified; existing past-date test uses a 74-year-old date —
  unaffected by a 1-day floor change ✔
- F6 spec text read (`203.0.113.99` fixed key) + `reuseExistingServer:
  !process.env.CI` confirmed in playwright.config.ts ✔
- F7 both `scrollIntoView({behavior:"smooth"})` call sites read
  (hero.tsx:56, header.tsx:98) ✔
- No e2e spec asserts smooth-scroll *duration* (the landing CTA test waits
  for arrival, not animation) — behavior swap is safe ✔
- seed.ts `main()` is already async — `await hashPassword` drops in ✔
