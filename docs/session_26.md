# Session 26 — E2E Time-Erosion Closure, PAD Count Residuals, Seed-State Restore & Parity Re-Verification

Continuation of `docs/session_24.md` / `docs/session_25.md`. Scope: refresh
workspace (fresh clone of the reset state) → review docs + session logs (24 +
remediation-plan-session24 + worklog + 25) → validate understanding against
the codebase → re-audit with live reference verification → remediate the new
findings → re-verify → document → push. The repo `skills/` folder stayed
excluded from checking, testing and compilation throughout.

## What was audited

- Workspace refreshed via fresh `git clone` → `7b04ac3` (= session-24's
  `f88ee15` + the docs-only operator transcript that became
  `docs/session_25.md`), then re-bootstrapped from the reset state:
  `bun install` (424 packages), `.env` recreated
  (`DATABASE_URL="file:../db/custom.db"` — the operator-specified value —
  plus a GENERATED 20-char `ADMIN_PASSWORD` never printed in any tracked
  file, per the session-22 F1 doctrine, and a generated `AUTH_SECRET`),
  `db/` created at the repo root, `db/custom.db` pushed + seeded. The
  ambient `DATABASE_URL` hijack (`file:/home/z/my-project/db/custom.db`)
  is ACTIVE in the shell — re-proven this session when an ad-hoc Prisma
  query without `env -u` failed with SQLite error 14 (the documented
  ADR-010 trap); the npm-script guards held through every probe.
- Read AGENTS.md, CLAUDE.md, README.md, Project_Architecture_Document.md,
  health-care-clinic_SKILL.md, docs/session_24.md,
  docs/remediation-plan-session24.md, worklog.md, docs/session_25.md —
  then validated every claim against the tree.
- Operator asks verified against the codebase: the vitest + playwright
  suites (`vitest.config.mts` + `playwright.config.ts`) are present and
  green — re-verified live this session (99/99 unit, 44/44 e2e × 2 after
  the remediation); `.env` `DATABASE_URL` is the specified relative value
  with `db/` at the repo root, and the db-path resolution contract
  references it correctly (live-proven: `/api/health` →
  `{"ok":true,"database":"up"}`, writes land in `<repo>/db/custom.db`).
- Baseline gates before any change: lint 0 / tsc clean / 99 unit /
  build OK (identical route table) / 44 e2e — all green, exactly as
  documented.
- `skills/code-review-and-audit` pipeline (static gates) + a fresh-eyes
  full review dispatched as a read-only sub-agent (Task 26-a) — every
  finding re-verified empirically or line-by-line by the orchestrator
  before acceptance.
- `skills/agent-browser` live parity probes on BOTH the reference and
  the local clone (desktop 1440×900 + mobile 390×844), before AND after
  the remediation — viewport verified via `innerWidth`/`innerHeight`
  before every measurement, settle-waits before height readings.
- Scandihaven (tech-stack patterns repo, cloned in the workspace) — its
  AGENTS/PAD were reviewed in sessions 22/24 and re-confirmed unchanged
  in the workspace copy this session: same substrate doctrine (Next 16 +
  React 19 + TS strict + Tailwind v4 CSS-first + Vitest 5/Playwright
  1.63); no pattern this repo is missing for its single-app API-route
  shape.

## Key findings (full detail: docs/remediation-plan-session26.md)

The session-24 remediation held up — all gates green, every
session-2/4/6/8/10/12/14/16/18/20/22/24 fix re-probed with zero regressions.
The 6 new findings (4 Low, 2 Info; zero Critical/High/Medium) were the
residuals thirteen prior audits hadn't surfaced:

1. **F4 (Low, test-integrity erosion — the headline):** the e2e
   "impossible calendar dates" pin had eroded into tautology — its
   hardcoded 2025 literals fell into the past (it is 2026), so their
   JS-rollover targets were past too, and the "not in the past" floor
   alone produced the asserted 422 even with the round-trip check fully
   broken (empirically proven by the RED-0 run). A defect class no prior
   audit had ever checked for: assertions whose discriminating power
   decays with the calendar.
2. **F1 (Low, doc-claim drift):** PAD §7.1's per-spec landing row said 12
   tests vs the 13 shipped — the session-24 count pass updated every
   "44" total but missed the per-spec breakdown (the rows summed to 43
   against the same document's own 44) — the missed-sibling-row class.
3. **F2 (Low, doc-claim drift):** PAD §11's Validation Report row (~334)
   stale since session-24 appended 27 lines to that very file without
   re-measuring (reality: 361) — the §11 outlier at 8.1%.
4. **F3 (Low, workspace state, 3rd recurrence):** the documented 6
   realistic dashboard seed rows absent again after the fresh bootstrap —
   the S20/S24 workspace-reset class.
5. **F5 (Info):** SKILL §8's "real `<label>` wrapping" claim overstated —
   only the staff login wraps labels; the public appointment form uses
   `aria-label` (a verbatim parity port).
6. **F6 (Info):** PAD §3.2's transcript ranges stale by four sessions —
   a class that recurs every session by construction.

## Live parity evidence (reference vs clone, same session, same method)

| Metric | Reference | Clone (remediated) |
| ------ | --------- | ----- |
| Page height @1440×900 (viewport VERIFIED) | 7490px | 7490px |
| h2 / h3 computed | 60px/63px / 20px/25px, weight 400 | identical |
| Section ids | top/about/services/insurance/providers/contact/faq | identical |
| Mobile dropdown panel (390×844) | 192×148 @ (178,80), grid, r24, p8, `rgba(38,74,57,.9)` | identical geometry; oklab-equivalent paint |
| Mobile menu link click | closes + unmounts; `#services` at 0.421875 | **identical to the pixel** (scrollY 1837 both) |
| Mobile page height (settled) | 12164px | 12162px — the documented 2px sub-pixel drift (contact section) |
| Rasterized dropdown pixel | rgb(38 74 57 / .9) | [38,74,57,230] exact |
| `<title>` | `Base44 APP` placeholder | semantic titles (recorded deviation) |
| Favicon | inline SVG (heart-rate glyph) | vendored `icon.svg`, 200 `image/svg+xml`, link tag generated |

Product loop re-verified with the status transitions included: login →
200 → dashboard → 200 → form POST → 201 → PATCH confirm → 200 → PATCH
complete → 200 → dashboard reflects; anonymous PATCH → 401; unknown id →
404; invalid status → 422; post-logout dashboard → 307.

## What was remediated (behavior change TDD — Red confirmed before Green)

- **F4 (TDD, the headline):** RED-0 — `isRealCalendarDate` deliberately
  forced to `valid: true`, rebuilt, and the OLD pin (2025 literals) still
  PASSED — the erosion empirically proven. RED — the pin rewritten to
  compute `new Date().getFullYear() + 1` literals (rollover targets are
  always future, so ONLY the round-trip check can reject them — forever,
  the class cannot recur) FAILED against the same broken seam (201 ≠
  422). GREEN — the seam restored verbatim (`git diff` clean), rebuilt,
  the new pin passed; the RED run's persisted garbage row purged from
  `db/e2e.db`; the :3100 server killed between the broken/restored runs
  so `reuseExistingServer` could never serve the stale build.
- **F1/F2/F6 docs:** PAD §7.1 landing row 12 → 13 (+ the SVG-favicon pin
  in the parenthetical — rows now sum to 44); PAD §11 Validation Report
  row ~334 → ~361; PAD §3.2's two transcript-range rows rephrased as
  open-ended families (`session_*.md`, `remediation-plan-session*.md`) —
  the stale-range class killed at its root.
- **F5 docs:** SKILL §8's forms row reworded to the honest two-form
  reality (`<label>` wrapping on the staff login; `aria-label` on the
  public appointment form — a verbatim parity port; e2e asserts
  `getByLabel` against both).
- **F3:** the parity-loop probe row purged; the 6 realistic seed rows
  restored through the PUBLIC API (unique 198.51.117-119.x XFF keys —
  disjoint from every documented spec base and this session's probe keys)
  with statuses set via the real PATCH API (2 confirmed / 2 new /
  2 completed — double-duty live probe).
- **Count-alignment pass:** no live count references changed this session
  (99 unit / 44 e2e both held); historical revision-block/Appendix-B
  entries deliberately untouched.

## Verification gate (final, post-remediation)

lint 0 errors (14 correctness rules ON) · typecheck clean under true
strict · **99/99 unit** · production build OK with the identical
documented route table · **44/44 e2e × 2 consecutive runs (the
double-run proof, within the 10-min limiter window)** · live
re-verification on the remediated tree: page height 7490px unchanged;
`/icon.svg` 200 `image/svg+xml`; mobile panel 192×148 @ (178,80); the
authenticated dashboard renders the 6 restored seed rows (HTML-verified);
`/api/health` up; the full product loop green under the still-active
ambient `DATABASE_URL` hijack · 20 screenshots refreshed from the
remediated dev server (`03-desktop-full` is exactly 1440×7490 — the
parity height; the dashboard captures show the restored 6 seed rows) ·
the capture's submission rows purged after (6 seed rows retained).

## Outcome

Committed on `main` and pushed via `docs/ssh_git_wrapper_v3.py` (runbook:
`docs/how-to-git-push-using-ssh-wrapper_SKILL.md`); the operator key was
shredded after the push and the remote ref verified equal to local HEAD.

**Suggested next steps** (recorded for a future session; the PAD §10
backlog remains empty): dashboard filtering/search or CSV export for
staff records — both beyond-parity surfaces, no parity impact. A new
audit dimension worth institutionalizing: sweep ALL e2e assertions for
calendar-coupled literals whenever a year boundary passes.
