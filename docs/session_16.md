# Session 16 — Appointment Status Management, e2e Key Determinism, Lint-Gate Strengthening & Doc-Claim Honesty

Continuation of `docs/session_14.md` / `docs/session_15.md`. Scope: refresh
workspace → review docs + session logs (14/15 + remediation-plan-session14) →
validate understanding against the codebase → re-audit with live reference
verification → remediate the new findings AND close the last documented
backlog item → re-verify → document → push. The repo `skills/` folder stayed
excluded from checking, testing and compilation throughout.

## What was audited

- Workspace refreshed via `git pull` to `8071d20` (the session-14 remediated
  tree `55f7f08` + the docs-only operator transcript paste that became
  `docs/session_15.md`). Environment intact: `.env` (operator credentials +
  `AUTH_SECRET`, leading-`$` escaped per the dotenv gotcha), `db/custom.db`
  at the repo root, node_modules present; the ambient `DATABASE_URL` hijack
  was ACTIVE in the shell — the npm-script `env -u` guards held through
  every probe.
- Read AGENTS.md, CLAUDE.md, README.md, Project_Architecture_Document.md,
  health-care-clinic_SKILL.md, docs/session_14.md,
  docs/remediation-plan-session14.md, worklog.md, docs/session_15.md — then
  validated every claim against the tree.
- Baseline gates before any change: lint 0 / tsc clean / 85 unit / build OK
  (identical route table) / 41 e2e — all green, exactly as documented.
- `skills/code-review-and-audit` native-CLI fallback pipeline (static gates +
  `bun audit` — same two known dev-tooling advisories, accepted) + a
  fresh-eyes full review dispatched as a read-only sub-agent (Task 16-a) —
  every finding re-verified empirically or line-by-line by the orchestrator
  before acceptance.
- `skills/agent-browser` live parity probes on BOTH the reference and the
  local clone (desktop 1440×900 + mobile 390×844 — the documented contract
  viewports), before AND after the remediation.

## Key findings (full detail: docs/remediation-plan-session16.md)

The session-14 remediation held up — all gates green, live parity
byte-exact, every session-2/4/6/8/10/12/14 fix re-probed with zero
regressions. The new findings were the residuals six prior audits hadn't
surfaced, plus one standing gap:

1. **F1 (Low):** the framework's internal 308 trailing-slash redirect
   carries NO security headers — `headers()` applies only from route
   matching onward — while the docs claimed headers on "every route /
   every response". Both boundaries (the covered 307 app-level redirect
   and the bare 308) are now e2e-pinned so a framework change gets
   noticed, and every doc claim was corrected to "every route response
   and app-level redirect".
2. **F2 (Info):** the per-run e2e XFF keys (`Date.now() % 200 + 10`) were
   NOT cross-run collision-proof as documented — a ~1/200 back-to-back
   run pair could 429-flake the impossible-dates spec. The discriminator
   is now the raw `process.pid` (structurally unique per run; the limiter
   keys on the raw XFF token, so a fourth segment above 255 is legal).
3. **F3 (Info):** the eslint gate's `no-non-null-assertion` OFF rationale
   cited reveal.tsx — which contains no non-null assertion today. The
   rule is back ON (the single `canvas.getContext("2d")!` exception in
   the mobile-nav spec is inline-disabled with rationale) — 14
   correctness rules ON now.
4. **F4 (Info):** `dev`/`start` pipe through `tee`, so the script exit
   code is tee's, not the server's — documented in AGENTS.md (liveness is
   `/api/health` + the log tails).
5. **F5 (Info):** the live staff password appeared verbatim in four
   living docs as the dotenv `$`-escaping example — neutralized to a
   placeholder (git-history scrubbing deliberately skipped: never rewrite
   pushed main; rotation is the operator's call).
6. **F6 (Info):** doc drift — PAD §11 line counts, README/CLAUDE file
   inventories, a "9 sections" claim vs 8 rendered `<section>` elements,
   an "anative" comment typo, and a `noValidate={false}` no-op. All
   corrected.
7. **G1 (backlog, closed):** the dashboard was read-only — staff could
   not transition an appointment's state. This session shipped
   appointment status management (below).

## Live parity evidence (reference vs clone, same session, same method)

| Metric | Reference | Clone (remediated) |
| ------ | --------- | ----- |
| Page height @1440×900 | 7490px | 7490px |
| h2 / h3 computed | 60px/63px / 20px/25px | identical |
| Mobile dropdown panel | 192×148 @ (178, 80), grid, r24, p8, `rgba(38,74,57,.9)`, 3 links | identical geometry; oklab-equivalent paint (documented v4 variance, e2e-rasterized) |
| Mobile menu link click | closes + unmounts; `#services` at 0.421875 | **identical to the pixel** (re-verified post-remediation) |
| `<title>` | `Base44 APP` placeholder | semantic titles (recorded deviation) |

Product loop re-verified with the status transitions included: login → 200
→ dashboard → form POST → 201 → PATCH confirm → 200 → PATCH complete → 200
→ dashboard reflects Confirmed/Completed badges; anonymous PATCH → 401;
invalid status → 422; unknown id → 404.

## What was remediated (all TDD — Red confirmed before every Green)

- **Red phase first:** 10 new unit tests (the status seam — import failed,
  confirmed failing) + 2 new e2e tests (the PATCH route 404'd, confirmed
  failing) + the header characterization extension (307 carries headers /
  308 does not — both edges pinned).
- **Appointment status management (G1):** `content.ts` gains
  `appointmentStatuses` (New / Confirmed / Completed — single source of
  copy); `validation.ts` gains `APPOINTMENT_STATUSES` (DERIVED from
  content.ts, the same doctrine as the specialty allowlist) +
  `validateStatusUpdate` (non-object tolerance, type tightening,
  exact-match allowlist); the `Appointment` model gains `status`
  (default "new") + `updatedAt` (`@default(now()) @updatedAt` —
  data-preserving push); a session-guarded, rate-limited (60 / 10 min),
  body-capped `PATCH /api/appointments/[id]` route answers 401 / 422 /
  404 / 413 / 429 / 200 and never echoes PII; the dashboard table gains
  a Status column — badges plus a `StatusButton` client island
  (Confirm / Complete) that PATCHes then `router.refresh()`es, so server
  state stays the source of truth.
- **e2e key determinism (F2):** every per-run XFF key in both request-level
  spec files (module constants + inline limiter/413/login-limiter keys)
  now derives its fourth segment from `process.pid` — structurally unique
  per run; comments state exactly why (including the legal non-IPv4
  segment).
- **Lint-gate strengthening (F3):** `no-non-null-assertion` ON; the one
  DOM-canvas exception inline-disabled with rationale; the config comment
  updated (14 rules ON).
- **Code hygiene (F6):** the "anative" typo fixed; the `noValidate={false}`
  no-op removed (byte-identical behavior).
- **Doc honesty (F1, F4, F5, F6):** security-header wording corrected in
  README / DEPLOYMENT.md / next.config.ts / PAD (308 limitation recorded
  in the known-issues table); the tee exit-code note added to AGENTS.md;
  the live password neutralized out of the four living docs; PAD §11 line
  counts re-measured; README File Hierarchy + CLAUDE.md File Organization
  completed (validation / rate-limit / motion + the new status files);
  the "9 sections" claim corrected to the true composition.

## Verification gate (final, post-remediation)

lint 0 errors (14 correctness rules ON) · typecheck clean under true
strict · **95/95 unit** (85 + 10 status-seam cases) · production build OK
with the route table GAINING `ƒ /api/appointments/[id]` (documented) ·
**43/43 e2e** (41 + 2: the dashboard status loop + PATCH edge pins, plus
the header characterization extension inside the existing landing spec) ·
fresh dev boot healthy · live parity spot-checks unchanged (7490px; mobile
panel 192×148 @ (178,80); link-click closes + jumps to 0.421875 —
identical to the reference) · the full product loop with status
transitions green under the still-active ambient `DATABASE_URL` hijack ·
audit probe rows purged from the dev DB (realistic statuses set on the
retained seed rows through the PATCH API — double-duty live probe) · 20
screenshots refreshed from the remediated dev server (03-desktop-full is
exactly 1440×7490 — the parity height; the dashboard shots show the new
status column).

## Outcome

Committed on `main` and pushed via `docs/ssh_git_wrapper_v3.py` (runbook:
`docs/how-to-git-push-using-ssh-wrapper_SKILL.md`); the operator key was
shredded after the push and the remote ref verified equal to local HEAD.
