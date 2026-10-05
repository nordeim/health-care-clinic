# Session 24 — Favicon Chrome Parity, PAD Count Residuals, Script-Footgun Note & Parity Re-Verification

Continuation of `docs/session_22.md` / `docs/session_23.md`. Scope:
refresh workspace (fresh clone of the reset state) → review docs +
session logs (22 + remediation-plan-session22 + worklog + 23) → validate
understanding against the codebase → re-audit with live reference
verification → remediate the new findings → re-verify → document → push.
The repo `skills/` folder stayed excluded from checking, testing and
compilation throughout.

## What was audited

- Workspace refreshed via fresh `git clone` → `05d70b6` (= session-22's
  `b4e0717` + the docs-only operator transcript that became
  `docs/session_23.md`), then re-bootstrapped from the reset state:
  `bun install` (424 packages), `.env` recreated
  (`DATABASE_URL="file:../db/custom.db"` — the operator-specified value —
  plus a GENERATED 20-char `ADMIN_PASSWORD` never printed in any tracked
  file, per the session-22 F1 doctrine, and a generated `AUTH_SECRET`),
  `db/` created at the repo root, `db/custom.db` pushed + seeded. The
  ambient `DATABASE_URL` hijack (`file:/home/z/my-project/db/custom.db`)
  is ACTIVE in the shell — the npm-script `env -u` guards held through
  every probe.
- Read AGENTS.md, CLAUDE.md, README.md, Project_Architecture_Document.md,
  health-care-clinic_SKILL.md, docs/session_22.md,
  docs/remediation-plan-session22.md, worklog.md, docs/session_23.md —
  then validated every claim against the tree.
- Operator asks verified against the codebase: the vitest +
  playwright suites (`vitest.config.mts` + `playwright.config.ts`) are
  present and green — re-verified live this session (99/99 unit, 44/44
  e2e × 2 after the remediation); `.env` `DATABASE_URL` is the specified
  relative value with `db/` at the repo root, and the db-path resolution
  contract references it correctly (live-proven: `/api/health` →
  `{"ok":true,"database":"up"}`, writes land in `<repo>/db/custom.db`).
- Baseline gates before any change: lint 0 / tsc clean / 99 unit /
  build OK (identical route table) / 43 e2e — all green, exactly as
  documented.
- `skills/code-review-and-audit` pipeline (static gates + `bun audit` —
  the same two known dev-tooling advisories, accepted) + a fresh-eyes
  full review dispatched as a read-only sub-agent (Task 24-a) — every
  finding re-verified empirically or line-by-line by the orchestrator
  before acceptance.
- `skills/agent-browser` live parity probes on BOTH the reference and
  the local clone (desktop 1440×900 + mobile 390×844), before AND after
  the remediation — viewport verified via `innerWidth`/`innerHeight`
  before every measurement, settle-waits before height readings.
- Scandihaven (tech-stack patterns repo, cloned in the workspace) — its
  AGENTS/PAD were reviewed in session 22 and re-confirmed unchanged in
  the workspace copy this session: same substrate doctrine (Next 16 +
  React 19 + TS strict + Tailwind v4 CSS-first + Vitest 5/Playwright
  1.63); no pattern this repo is missing for its single-app API-route
  shape.

## Key findings (full detail: docs/remediation-plan-session24.md)

The session-22 remediation held up — all gates green, every
session-2/4/6/8/10/12/14/16/18/20/22 fix re-probed with zero regressions.
The 5 new findings (0 Critical/High/Medium) were the residuals twelve
prior audits hadn't surfaced:

1. **F2 (Low, chrome parity — the headline):** the app shipped NO
   favicon — every icon request 404'd — while the reference serves an
   inline SVG favicon (heart-rate glyph in the clinic green) via
   `<link rel="icon" type="image/svg+xml">` plus a `/favicon.ico` 302 →
   logo.png platform fallback. The one reference-visible chrome surface
   never audited in twelve sessions.
2. **F1 (Low, doc-claim drift):** two residual "15 unit tests" claims
   for db-path (PAD ADR-004 Decision + §3.2 tree annotation) vs the 19
   shipped — the missed-sibling-row class (session-18 F11, session-20
   F2, session-22 F3).
3. **F3 (Info):** `db:migrate` / `db:reset` wired but non-functional in
   this migrations-less repo — an agent footgun (the workflow is
   `db:push` + `db:seed`).
4. **F4 (Info):** the documented 6 realistic dashboard seed rows were
   not restored by the fresh bootstrap — dashboard captures would show
   a near-empty table.
5. **F5 (Info):** PAD §11's `scripts/seed.ts` row (~40) vs the actual
   47 lines.

## Live parity evidence (reference vs clone, same session, same method)

| Metric | Reference | Clone (remediated) |
| ------ | --------- | ----- |
| Page height @1440×900 (viewport VERIFIED) | 7490px | 7490px |
| h2 / h3 computed | 60px/63px / 20px/25px, weight 400 | identical |
| Section ids | top/about/services/""/insurance/providers/contact/faq | identical |
| Mobile dropdown panel (390×844) | 192×148 @ (178,80), grid, r24, p8, `rgba(38,74,57,.9)` | identical geometry; oklab-equivalent paint |
| Mobile menu link click | closes + unmounts; `#services` at 0.421875 | **identical to the pixel** (scrollY 1837 both) |
| Mobile page height (settled) | 12164px | 12162px — the documented 2px sub-pixel drift (contact section) |
| Rasterized dropdown pixel | rgb(38 74 57 / .9) | [38,74,57,230] exact |
| `<title>` | `Base44 APP` placeholder | semantic titles (recorded deviation) |

Product loop re-verified with the status transitions included: login →
200 → dashboard → 200 → form POST → 201 (an off-list specialty correctly
422'd first — the allowlist derivation live-proven) → PATCH confirm →
200 → PATCH complete → 200 → dashboard reflects; anonymous PATCH → 401;
unknown id → 404; invalid status → 422; post-logout dashboard → 307.

## What was remediated (behavior change TDD — Red confirmed before Green)

- **F2 (TDD):** Red — a new `landing.spec.ts` pin asserts the head
  carries exactly one `link[rel="icon"][type="image/svg+xml"]` with a
  truthy href; it failed on the 404 tree. Green — the reference's glyph
  vendored VERBATIM as `src/app/icon.svg` (the App Router file
  convention auto-generates the link tag): `/icon.svg` serves 200
  `image/svg+xml`, the page height is unchanged (7490px — head-only
  chrome, zero layout impact), and the e2e count goes 43 → 44. The
  reference's `/favicon.ico` 302 → logo.png fallback is deliberately
  NOT replicated (platform artifact serving a different image — the
  same recorded-deviation reasoning as the session-4 title); the
  decision is recorded in the Validation Report's deviation log, PAD
  §10 (CLOSED row), PAD §3.2 + README + SKILL §5 trees, and SKILL §1.
- **F1/F5 docs:** the two "15 unit" db-path claims corrected to 19
  (PAD ADR-004 + §3.2); PAD §11's seed.ts row re-measured (~47).
- **F3 docs:** AGENTS.md command-table note — `db:migrate`/`db:reset`
  are placeholders for a future `prisma migrate` adoption (PAD §4.2);
  this repo is schema-first `db:push` + `db:seed`.
- **F4:** the 3 audit/loop probe rows purged; the 6 realistic seed rows
  restored through the PUBLIC API (unique 198.51.112-114.x XFF keys —
  disjoint from every documented spec base) with statuses set via the
  real PATCH API (2 confirmed / 2 new / 2 completed — double-duty live
  probe).
- **Count-alignment pass:** every live e2e-count reference updated
  43 → 44 (README, AGENTS, CLAUDE ×2, PAD ×3, SKILL project_state + §3)
  and the landing-spec description gained the favicon pin — historical
  revision-block/Appendix-B entries deliberately untouched.

## Verification gate (final, post-remediation)

lint 0 errors (14 correctness rules ON) · typecheck clean under true
strict · **99/99 unit** · production build OK with the identical
documented route table · **44/44 e2e × 2 consecutive runs (the
double-run proof, within the 10-min limiter window)** · live
re-verification on the remediated tree: `/icon.svg` 200
`image/svg+xml` + the generated link tag in served HTML + page height
7490px unchanged; mobile panel 192×148 @ (178,80) grid r24 p8; link-click
closes + unmounts + jumps to 0.421875 with scrollY 1837 — identical to
the reference; `/api/health` up; the full product loop green under the
still-active ambient `DATABASE_URL` hijack · 20 screenshots refreshed
from the remediated dev server (`03-desktop-full` is exactly 1440×7490 —
the parity height; the dashboard captures show the restored 6 seed
rows) · the capture's submission row purged after (6 seed rows
retained).

## Outcome

Committed on `main` and pushed via `docs/ssh_git_wrapper_v3.py` (runbook:
`docs/how-to-git-push-using-ssh-wrapper_SKILL.md`); the operator key was
shredded after the push and the remote ref verified equal to local HEAD.

**Suggested next steps** (recorded for a future session; the PAD §10
backlog remains empty): dashboard filtering/search or CSV export for
staff records — both beyond-parity surfaces, no parity impact.
