# Session 12 — Email Bound, Transport-Error Tolerance, Lint-Gate Honesty & Contract Tightening

Continuation of `docs/session_10.md` / `docs/session_11.md`. Scope: refresh
workspace → review docs + session logs (10/11 + remediation-plan-session10) →
validate understanding against the codebase → re-audit with live reference
verification → remediate the new findings → re-verify → document → push.
The repo `skills/` folder stayed excluded from checking, testing and
compilation throughout.

## What was audited

- Workspace was reset with the sandbox; re-cloned to `d11c8a3` (the
  session-10 remediated tree `134b9c6` + the docs-only operator transcript
  paste that became `docs/session_11.md`). Environment rebuilt from scratch:
  `.env` (operator credentials + generated `AUTH_SECRET`, the leading-`$`
  operator password escaped per the dotenv gotcha), `bun install` (424
  packages), `db:push` + `db:seed` → `db/custom.db` at the repo root.
- Read AGENTS.md, CLAUDE.md, README.md, Project_Architecture_Document.md,
  health-care-clinic_SKILL.md, docs/session_10.md,
  docs/remediation-plan-session10.md, worklog.md, docs/session_11.md — then
  validated every claim against the tree.
- Baseline gates before any change: lint 0 / tsc clean / 76 unit / build OK
  (identical route table) / 37 e2e — all green, exactly as documented.
- `skills/code-review-and-audit` native-CLI fallback pipeline (static gates +
  `bun audit` + a fresh-eyes full review dispatched as a read-only
  sub-agent — every finding re-verified empirically or line-by-line by the
  orchestrator before acceptance).
- `skills/agent-browser` live parity probes on BOTH the reference and the
  local clone (desktop 1440×900 + mobile 390×844; the 1440×900 contract set
  explicitly — the default viewport is 1280×577 and misleads heights).

## Key findings (full detail: docs/remediation-plan-session12.md)

The session-10 remediation held up — all gates green, live parity
byte-exact, every session-10 fix re-probed (chunked 413, null-body 422,
timezone tolerance) with zero regressions. The new findings concentrated on
what even the hardened seams had left open:

1. **F1 (Medium):** the email field was the only UNBOUNDED payload field —
   a pattern-valid ~64 KiB email persisted in a single row (verified live:
   60,012 chars → 201; the only ceiling was the body cap).
2. **F2 (Low):** transport-level read errors (client aborts mid-body,
   ECONNRESET) escaped `readJsonBody` AND the routes' try/catch blocks —
   an unhandled framework error plus a misleading 200 access-log line
   (verified live with a raw-socket abort probe).
3. **F3 (Low):** the "lint 0" gate ran with ~24 rules disabled — materially
   weaker than the docs advertised.
4. Plus: logout fetch without a catch (unhandled rejection on network
   failure), `reactStrictMode: false` without a recorded rationale, the
   "Upcoming visits" stat stricter than the validation tolerance, non-string
   `specialty` silently coercing to the default (201 "Primary Care" for
   `{"specialty": 42}`), seed's dead-code disconnect on the failure path,
   and the login route's hand-copied email regex.

## Live parity evidence (reference vs clone, same session, same method)

| Metric | Reference | Clone (remediated) |
| ------ | --------- | ----- |
| Page height @1440×900 | 7490px | 7490px |
| h2 / h3 computed | 60px/63px / 20px | identical |
| Mobile dropdown panel | 192×148 @ (178, 80), grid, r24, p8, `rgba(38,74,57,.9)`, 3 links | identical geometry; oklab-equivalent paint (documented v4 variance, e2e-rasterized) |
| Mobile menu link click | closes + `#services` at 0.421875 | **identical to the pixel** (re-verified post-remediation) |
| `<title>` | `Base44 APP` placeholder | semantic titles (recorded deviation) |
| `<main>` / date input `min` | present / absent | identical (parity kept) |

Product loop re-verified: login → 200 → dashboard → form POST → 201 → row
visible on the authenticated dashboard; the orchestrator's own un-guarded
`bun -e` DB inspect was redirected by the still-active ambient
`DATABASE_URL` hijack (Prisma Error 14) — the exact documented threat;
re-ran with `env -u` and confirmed every write landed in `<repo>/db/custom.db`.

## What was remediated (all TDD — Red confirmed before every Green)

- **Email length bound (F1):** `EMAIL_MAX_LENGTH = 254` (RFC 5321 practical
  limit) in `validation.ts`; 255-char pattern-valid emails → 422 with a
  length message, 254 accepted at the boundary (both unit-pinned AND
  live-verified). The route contract comments updated.
- **Transport-error tolerance (F2):** the `readJsonBody` read loop moved
  inside a try/catch — a stream that rejects mid-read (client abort, socket
  reset) now cancels the reader best-effort and resolves the standard 400
  instead of throwing through the route. Both routes' call sites needed no
  change (they now always resolve). Unit-pinned with a rejecting
  `ReadableStream`; live re-probe: the raw-socket abort produces NO unhandled
  error in dev.log.
- **Specialty type tightening (F7):** a present-but-non-string specialty
  (42, true, {}, []) is a 422 ("Choose a specialty from the list.") instead
  of silently persisting as "Primary Care"; missing/nullish/empty values
  keep the documented default (unit-pinned both ways).
- **Upcoming-visits floor (F6):** `upcomingVisitsFloor(now)` extracted as a
  pure function sharing `toleranceFloorDate` with the preferredDate
  validation — the stat now counts server-YESTERDAY forward, exactly the
  rows the API deems valid; the two contracts can never drift apart again.
  Unit-pinned including month/leap-year rollover.
- **Small robustness/DRY (F4/F8/F9):** the logout button swallows fetch
  transport failure (navigation unaffected); the seed script sets
  `process.exitCode` so the chained `$disconnect` finally actually runs on
  the failure path; the login route imports the seam's `EMAIL_PATTERN`
  instead of a hand-copied regex literal.
- **Lint-gate honesty (F3):** the correctness/dep-safety rules the codebase
  is verifiably clean under are now ON — `no-explicit-any`,
  `no-unused-vars`, `react-hooks/exhaustive-deps`, `react-hooks/purity`,
  `no-unreachable`, `no-redeclare`, `no-fallthrough`, `no-case-declarations`,
  `no-empty`, `no-debugger`, `no-useless-escape`,
  `no-mixed-spaces-and-tabs`, `no-html-link-for-pages` — every one at 0
  findings. The remaining offs each carry a recorded rationale (no-undef:
  TS type-only-global false positives; no-img-element: parity doctrine on
  vendored `<img>` ports; style-noise rules). Surfaced and fixed the three
  real `no-html-link-for-pages` hits by converting the anchors to
  `next/link` (login form `/#contact`, legal page back-link, dashboard
  "View site") — identical rendered markup, Next-idiomatic client
  navigation.
- **reactStrictMode rationale (F5):** the flag's comment now records WHY it
  is off (parity-pinned dev behavior; hygiene enforced by the enabled lint
  rules + per-session manual audits instead).
- **Login limiter e2e pin (T4):** a new spec drives 10 wrong-password
  attempts under a per-run spoofed XFF key (198.51.100.x — disjoint from
  every fixed key in the file) → all 401; the 11th → 429 with the documented
  message. The 10/10-min contract the route advertises finally has a
  route-level pin.

## Verification gate (final, post-remediation)

lint 0 errors **under the strengthened ruleset** · typecheck clean under
true strict · **85/85 unit** (76+9) · production build OK with the
IDENTICAL route table · **38/38 e2e** (37+1) · fresh dev boot healthy ·
live parity spot-checks unchanged (7490px; mobile panel 192×148 @ (178,80);
link-click closes + jumps to 0.421875 — identical to the reference) ·
product loop green end-to-end under the still-active ambient
`DATABASE_URL` hijack · F1/F2/F7 fixes re-probed live (60 KiB email → 422
"Email must be 254 characters or fewer."; mid-body abort → no unhandled
error; `specialty: 42` → 422; 254/255-char email boundary exact) · audit
probe rows purged from the dev DB and replaced with three realistic rows ·
20 screenshots refreshed from the remediated dev server (03-desktop-full
is exactly 1440×7490 — the parity height).

## Outcome

Committed on `main` and pushed via `docs/ssh_git_wrapper_v3.py` (runbook:
`docs/how-to-git-push-using-ssh-wrapper_SKILL.md`); the operator key was
shredded after the push and the remote ref verified equal to local HEAD.
