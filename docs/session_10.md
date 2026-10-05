# Session 10 — Body-Cap Bypass, Login Null-Body 500, Async scrypt & Robustness Completions

Continuation of `docs/session_8.md` / `docs/session_9.md`. Scope: refresh
workspace → review docs + session logs (8/9 + remediation-plan-session8) →
validate understanding against the codebase → re-audit with live reference
verification → remediate the new findings → re-verify → document → push.
The repo `skills/` folder stayed excluded from checking, testing and
compilation throughout.

## What was audited

- Workspace refreshed via `git pull` to `2b7a40a` — a docs-only commit (the
  operator's transcript paste that became `docs/session_9.md`); zero code
  delta vs the session-8 remediated `224d21e`. `node_modules` had been
  reset with the sandbox; re-provisioned via `bun install` (zero changes).
- Read AGENTS.md, CLAUDE.md, README.md, Project_Architecture_Document.md,
  health-care-clinic_SKILL.md, docs/session_8.md,
  docs/remediation-plan-session8.md, worklog.md, docs/session_9.md — then
  validated every claim against the tree. Environment intact: `.env`
  (operator credentials + `AUTH_SECRET`), `db/custom.db` + `db/e2e.db` at
  the repo root, `.env.example` matching the codebase.
- Baseline gates before any change: lint 0 / tsc clean / 65 unit / build OK
  (identical route table) / 34 e2e — all green, exactly as documented.
- `skills/code-review-and-audit` native-CLI fallback pipeline (static
  gates + `bun audit` + a fresh-eyes review dispatched as a read-only
  sub-agent — every finding re-verified empirically or line-by-line
  before acceptance).
- `skills/agent-browser` live parity probes on BOTH the reference and the
  local clone (desktop 1440×900 + mobile 390×844), including a viewport
  methodology note: agent-browser's DEFAULT viewport is 1280×577 — the
  1440×900 parity contract must be set explicitly or heights mislead
  (a 7229px artifact was observed and explained this way).
- `skills/tdd` doctrine: every new behavior got a failing test first.
- scandihaven reference repo re-reviewed (AGENTS.md): same Next.js 16 /
  React 19 / Tailwind v4 CSS-first / Vitest + Playwright family — this
  repo's patterns remain aligned.

## Key findings (full detail: docs/remediation-plan-session10.md)

The session-8 remediation held up — all gates green, live parity
byte-exact, product loop verified under an ACTIVE ambient `DATABASE_URL`
hijack. The new findings concentrated on the HTTP edge the session-8
seams had left partially open:

1. **F1 (Medium):** `POST /api/auth/login` with a JSON `null` body
   returned an unhandled **500** — `body.email` on `null` threw OUTSIDE
   the parse try/catch (verified live: 500 + TypeError in dev.log). The
   sibling appointments route had exactly this hardening since session 8;
   the login route was missed.
2. **F2 (Medium):** the 64 KiB body cap trusted only the `content-length`
   header — a **chunked** request sailed past the 413 gate and buffered
   the whole body in memory (verified live: a 70,065-byte chunked POST
   parsed to a 422 instead of 413).
3. **F3 (Medium):** `scryptSync` blocked the event loop ~30-50 ms per
   login attempt — composed with the documented direct-exposure XFF
   limitation, spoofed-key bursts starved every concurrent request.
4. Plus Low findings: west-of-server "today" rejection (timezone floor),
   zero unit coverage on the body cap, e2e limiter specs assuming a
   freshly-booted server (fixed XFF keys + `reuseExistingServer`), and
   programmatic smooth scrolling ignoring `prefers-reduced-motion`.

## Live parity evidence (reference vs clone, same session, same method)

| Metric | Reference | Clone (remediated) |
| ------ | --------- | ----- |
| Page height @1440×900 | 7490px | 7490px |
| h2 / h3 computed | 60px / 20px | identical |
| Mobile dropdown panel | 192×148 @ (178, 80), grid, r24, p8, `rgba(38,74,57,.9)`, 3 links | identical geometry; oklab-equivalent paint (documented v4 variance, e2e-rasterized) |
| Mobile menu link click | closes + `#services` lands at 0.0004998518957345971 | **identical to the pixel** |
| `<title>` | `Base44 APP` placeholder | semantic titles (recorded deviation) |
| `tel:` hrefs | uniformly `tel:+11234567890` | uniform too |
| Date input `min` / panel closed DOM / `<main>` | absent / unmounted / present | identical (parity kept) |

Product loop re-verified under the active ambient hijack: login → 200 →
form POST → 201 → row in `<repo>/db/custom.db` → dashboard renders it.

## What was remediated (all TDD — failing tests first)

- **`readJsonBody` seam (F2+F5):** stream-reads the request body with the
  64 KiB cap enforced for EVERY transport shape — content-length is only
  a fast path; the reader aborts and cancels the socket the moment the
  byte count crosses the cap. 8 new unit tests including the exact
  64 KiB boundary (`>` not `>=`) and the chunked-shape 413. Both POST
  routes rewired.
- **Login non-object body tolerance (F1):** JSON `null`/scalars degrade to
  the standard 422 field map (mirrors the appointments seam); e2e-pinned
  on both routes (null → 422, never 500).
- **Async scrypt (F3):** `promisify(scrypt)` — identical CPU burns on the
  libuv threadpool; stored format, cost parameters and the
  timing-equalization contract unchanged (DUMMY_HASH untouched). Verified
  live: 19 health polls interleaved during 5 concurrent scrypt logins —
  the event loop breathes. `hashPassword`/`verifyPassword`/
  `verifyLoginPassword` are now async; seed + tests updated.
- **Timezone tolerance (F4):** the not-in-the-past floor accepts ONE day
  of westward drift (a US patient's "today" during their evening against
  a UTC server); two-plus days old is still rejected (verified live:
  yesterday → 201, two days ago → 422).
- **Reduced-motion scrolling (F7):** new `src/lib/motion.ts`
  `scrollBehavior()` helper wired into both CTA scroll handlers (hero
  "Get started", header "Book a visit") — instant jump under
  `prefers-reduced-motion`, smooth for everyone else. e2e-pinned via
  `test.use({ reducedMotion: "reduce" })` with a position-stability
  assertion (the instant jump is synchronous; a smooth scroll would still
  be animating at the immediate read).
- **e2e hardening (F6):** the 429/413 specs derive their spoofed XFF key
  per run — a leftover `reuseExistingServer` instance on :3100 can no
  longer poison the bucket assumptions.
- **Docs (F8):** dev-mode Prisma query logging now carries an explicit
  PII note; DEPLOYMENT.md §6 documents the in-process stream cap, the
  limiter map growth bound, and the async-scrypt event-loop guarantee.

## Verification gate (final, post-remediation)

lint 0 errors · typecheck clean under TRUE strict · **76/76 unit** (65+11)
· production build OK with the IDENTICAL route table · **37/37 e2e**
(34+3: login/appointments null-body pins + reduced-motion scroll pin) ·
fresh dev boot healthy · live parity spot-checks unchanged (7490px; mobile
panel 192×148 @ (178,80); link-click closes + jumps to
0.0004998518957345971) · product loop green end-to-end under the active
ambient `DATABASE_URL` hijack · F1/F2/F4 fixes re-probed live (null → 422;
chunked 70 KiB → 413 with small chunked bodies still 201; yesterday →
201 / two-days-ago → 422) · 11 screenshots refreshed from the remediated
dev server.

## Outcome

Committed on `main` and pushed via `docs/ssh_git_wrapper_v3.py` (runbook:
`docs/how-to-git-push-using-ssh-wrapper_SKILL.md`); the operator key was
shredded after the push and the remote ref verified equal to local HEAD.
