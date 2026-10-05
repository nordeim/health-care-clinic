# Session 28 — Demo-Seed Root-Cause Closure, Screenshot Index Gap, Lock Metadata & Parity Re-Verification

Continuation of `docs/session_26.md` / `docs/session_27.md`. Scope: refresh
workspace (fresh clone of the reset state) → review docs + session logs (26 +
remediation-plan-session26 + worklog + 27) → validate understanding against
the codebase → re-audit with live reference verification → remediate the new
findings → re-verify → document → push. The repo `skills/` folder stayed
excluded from checking, testing and compilation throughout.

## What was audited

- Workspace refreshed via fresh `git clone` → `7357ea1` (= session-26's
  `2dc105e` + the docs-only operator transcript that became
  `docs/session_27.md`), then re-bootstrapped from the reset state:
  `bun install` (424 packages), `.env` recreated
  (`DATABASE_URL="file:../db/custom.db"` — the operator-specified value —
  plus a GENERATED 20-char `ADMIN_PASSWORD` never printed in any tracked
  file, per the session-22 F1 doctrine, and a generated `AUTH_SECRET`),
  `db/` created at the repo root, `db/custom.db` pushed + seeded. The
  ambient `DATABASE_URL` hijack (`file:/home/z/my-project/db/custom.db`)
  is ACTIVE in the shell; the npm-script guards held through every probe
  (the parity loop's write landed in `<repo>/db/custom.db` — H14).
- Read AGENTS.md, CLAUDE.md, README.md, Project_Architecture_Document.md,
  health-care-clinic_SKILL.md, docs/session_26.md,
  docs/remediation-plan-session26.md, worklog.md, docs/session_27.md —
  then validated every claim against the tree.
- Operator asks verified against the codebase: the vitest + playwright
  suites (`vitest.config.mts` + `playwright.config.ts`) are present and
  green — re-verified live this session (99/99 unit pre-remediation,
  107/107 post; 44/44 e2e × 2 after the remediation); `.env`
  `DATABASE_URL` is the specified relative value with `db/` at the repo
  root, and the db-path resolution contract references it correctly
  (live-proven: `/api/health` → `{"ok":true,"database":"up"}`, the
  parity-loop write landed in `<repo>/db/custom.db`).
- Baseline gates before any change: lint 0 / tsc clean / 99 unit /
  build OK (identical route table) / 44 e2e — all green, exactly as
  documented.
- `skills/code-review-and-audit` pipeline (static gates) + a fresh-eyes
  full review dispatched as a read-only sub-agent (Task 28-a) — every
  finding re-verified empirically or line-by-line by the orchestrator
  before acceptance.
- `skills/agent-browser` live parity probes on BOTH the reference and
  the local clone (desktop 1440×900 + mobile 390×844) — viewport verified
  via `innerWidth`/`innerHeight` before every measurement, settle-waits
  before height readings.
- Scandihaven (tech-stack patterns repo, cloned in the workspace) — same
  substrate doctrine (Next 16 + React 19 + TS strict + Tailwind v4
  CSS-first + Vitest/Playwright); its Turborepo/Drizzle/Better-Auth
  patterns are deliberate divergences; its idempotent-seed doctrine
  (natural-key upserts) is the pattern the F1 fix adopts.

## Key findings (full detail: docs/remediation-plan-session28.md)

The session-26 remediation held up — all gates green, every
session-2/4/6/8/10/12/14/16/18/20/22/24/26 fix re-probed with zero
regressions. The 3 new findings (1 Low, 2 Info; zero
Critical/High/Medium) were the residuals fourteen prior audits hadn't
surfaced:

1. **F1 (Low, workspace state — 4th recurrence, the headline):** the 6
   documented dashboard seed rows absent again (S20, S24, S26, S28) —
   `db/custom.db` held 0 appointment rows while committed screenshots
   12/13/15 show 6. The S26 plan §1.3 "restore through the public API"
   doctrine treated the symptom every session; the root cause (the
   documented demo state is not reproducible by bootstrap) was never
   addressed.
2. **F2 (Info):** README's Screenshots table linked 19 of the 20
   committed PNGs — `06-mobile-services.png` referenced by no living doc.
3. **F3 (Info):** `bun.lock`'s root workspace entry still carried the
   pre-clone scaffold name `"orbital"` (session-6 renamed package.json;
   bun keeps the field byte-stable across installs).

## Live parity evidence (reference vs clone, same session, same method)

| Metric | Reference | Clone (remediated) |
| ------ | --------- | ----- |
| Page height @1440×900 (viewport VERIFIED) | 7490px | 7490px |
| h2 / h3 computed | 60px/63px / 20px/25px, weight 400 | identical |
| Section ids | top/about/services/insurance/providers/contact/faq | identical |
| Mobile dropdown panel (390×844) | 192×148 @ (178,80), grid, r24, p8, `rgba(38,74,57,.9)` | identical geometry; oklab-equivalent paint |
| Mobile menu link click | closes + unmounts; `#services` at 0.421875, scrollY 1837 (documented reference measurement) | **identical to the pixel** (0.421875 / scrollY 1837) |
| Mobile page height (settled) | 12164px (documented) | 12162px — the documented 2px sub-pixel drift (contact section) |
| Rasterized pill / dropdown pixel | rgb(38 74 57 / .8) / rgb(38 74 57 / .9) | [37,74,57,204] (±1 oklab) / [38,74,57,230] exact |
| `<title>` | `Base44 APP` placeholder | semantic titles (recorded deviation) |
| Favicon | inline SVG (heart-rate glyph) | vendored `icon.svg`, 200 `image/svg+xml` |

Product loop re-verified with the status transitions included: login →
200 → dashboard → 200 → form POST → 201 → PATCH confirm → 200 → PATCH
complete → 200 → dashboard reflects; anonymous PATCH → 401; unknown id →
404; invalid status → 422; post-logout dashboard → 307; wrong
credentials → generic 401 — all under the still-active ambient
`DATABASE_URL` hijack, with the write verified in `<repo>/db/custom.db`.

## What was remediated (behavior change TDD — Red confirmed before Green)

- **F1 (TDD, the headline — root-cause closure):** RED — 8 new unit
  cases (`tests/seed-demo.test.ts`) written BEFORE the seam, failing on
  the missing module. GREEN — the new pure seam `src/lib/seed-demo.ts`
  (`buildDemoAppointments(now)`: 6 rows, 2/2/2 status split,
  specialties/statuses members of the API's DERIVED allowlists,
  SELF-RENEWING dates `now + offsetDays` — the session-26 F4
  anti-erosion doctrine applied to seed data, every row a valid
  public-API payload BY CONSTRUCTION via the cross-seam
  `validateAppointmentPayload` assertion, pure/injectable clock) +
  `scripts/seed.ts` gained the OPT-IN demo mode (`SEED_DEMO=1` env or
  `--demo` argv; default behavior byte-identical — production seeding
  per DEPLOYMENT.md §4 never creates patient rows; IDEMPOTENT inserts:
  skip-if-exists by fullName, so re-runs never duplicate and never
  clobber real dashboard status transitions). Acceptance proven live:
  default `db:seed` → 0 appointment rows; `SEED_DEMO=1` → 6 created
  (2/2/2); re-run → 0 created / 6 skipped; `--demo` argv form verified;
  deps pin untouched (`scripts/` = `seed.ts`). Unit suite 99 → 107.
- **F2:** README's Screenshots table gained the `06-mobile-services.png`
  row (all 20 committed captures now referenced).
- **F3:** `bun.lock` root workspace name corrected
  `orbital` → `health-care-clinic` + the install-stability proof
  (`bun install` reports no changes; the lock stays canonical).
- **Docs (5 living surfaces for the demo mode):** README Quick Start +
  Tested row (107 unit), AGENTS command table, `.env.example` seed
  section, DEPLOYMENT.md §4 (do-NOT-set-SEED_DEMO-in-production note),
  PAD §3.2 tree + §7.1 breakdown + §7.3/§7.4 gate + §9.1 + §11 rows +
  [S28] revision block, SKILL §3 + §5 tree + §11 gate + frontmatter
  (v2.8.5, project_state, sessions list) + Appendix B [S28], CLAUDE unit
  list + Success Metrics.
- **Count-alignment pass:** every live unit-count reference 99 → 107
  across README/CLAUDE×2/PAD×3/SKILL; historical revision-block /
  Appendix-B entries deliberately untouched.

## Verification gate (final, post-remediation)

lint 0 errors (14 correctness rules ON) · typecheck clean under true
strict · **107/107 unit** (99 + 8 seed-demo) · production build OK with
the identical documented route table · **44/44 e2e × 2 consecutive runs
(the double-run proof, within the 10-min limiter window)** · live
re-verification on the remediated tree: page height 7490px unchanged;
mobile panel 192×148 @ (178,80); link-click 0.421875 / scrollY 1837;
rasterized trap guards green (dropdown exact, pill ±1 oklab); the
authenticated dashboard renders the 6 restored seed rows (HTML-verified);
`/api/health` up; the full product loop green under the still-active
ambient `DATABASE_URL` hijack · 20 screenshots refreshed from the
remediated dev server (`03-desktop-full` is exactly 1440×7490 — the
parity height; the dashboards show the restored 6 seed rows) · the
capture's submission row purged after (6 seed rows retained).

## Outcome

Committed on `main` and pushed via `docs/ssh_git_wrapper_v3.py` (runbook:
`docs/how-to-git-push-using-ssh-wrapper_SKILL.md`); the operator key was
shredded after the push and the remote ref verified equal to local HEAD.

**Suggested next steps** (recorded for a future session; the PAD §10
backlog remains empty): dashboard filtering/search or CSV export for
staff records — both beyond-parity surfaces, no parity impact. The
session-26 suggestion stands: sweep ALL e2e assertions for
calendar-coupled literals whenever a year boundary passes.
