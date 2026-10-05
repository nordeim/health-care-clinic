# Session 22 — Credential-Hygiene Closure, db-Path Decode Hardening, Doc-Claim Honesty & Parity Re-Verification

Continuation of `docs/session_20.md` / `docs/session_21.md`. Scope:
refresh workspace (it had been reset — full re-bootstrap) → review docs +
session logs (20 + remediation-plan-session20 + worklog + 21) → validate
understanding against the codebase → re-audit with live reference
verification → remediate the new findings → re-verify → document → push.
The repo `skills/` folder stayed excluded from checking, testing and
compilation throughout.

## What was audited

- Workspace re-bootstrapped from scratch (the reset wiped `.env`, `db/`,
  `node_modules`): `git clone` → `c908209` (= session-20's `035e97b` +
  the docs-only operator transcript that became `docs/session_21.md`),
  `bun install` (424 packages), `.env` recreated
  (`DATABASE_URL="file:../db/custom.db"` — the operator-specified value —
  plus operator credentials + `AUTH_SECRET`, leading-`$` escaped), `db/`
  created at the repo root, `db/custom.db` pushed + seeded. The ambient
  `DATABASE_URL` hijack (`file:/home/z/my-project/db/custom.db`) is ACTIVE
  in the shell — the npm-script `env -u` guards held through every probe
  (re-proven the hard way: an orchestrator ad-hoc Prisma query WITHOUT
  `env -u` failed with SQLite error 14 — exactly the documented ADR-010
  trap).
- Read AGENTS.md, CLAUDE.md, README.md, Project_Architecture_Document.md,
  health-care-clinic_SKILL.md, docs/session_20.md,
  docs/remediation-plan-session20.md, worklog.md, docs/session_21.md —
  then validated every claim against the tree.
- Operator asks verified against the codebase: the vitest +
  playwright suites (via `vitest.config.mts` + `playwright.config.ts`)
  are present and green — re-verified live this session (95/95 → later
  99/99 unit, 43/43 e2e × 2); `.env` `DATABASE_URL` is the specified
  relative value with `db/` at the repo root, and the db-path resolution
  contract (`src/lib/db-path.ts`) references it correctly for the CLI,
  dev, build and standalone contexts alike (live-proven: writes land in
  `<repo>/db/custom.db`).
- Baseline gates before any change: lint 0 / tsc clean / 95 unit /
  build OK (identical route table) / 43 e2e — all green, exactly as
  documented.
- `skills/code-review-and-audit` pipeline (static gates + `bun audit` —
  the same two known dev-tooling advisories, accepted) + a fresh-eyes
  full review dispatched as a read-only sub-agent (Task 22-a) — every
  finding re-verified empirically or line-by-line by the orchestrator
  before acceptance.
- `skills/agent-browser` live parity probes on BOTH the reference and
  the local clone (desktop 1440×900 + mobile 390×844), before AND after
  the remediation — with the session-20 measurement-hygiene rule
  applied (viewport verified via `innerWidth`/`innerHeight` before every
  measurement, and a settle-wait before any height reading: BOTH sites
  transiently read ~20% short mid-hydration).
- Scandihaven (tech-stack patterns repo) re-cloned and its
  AGENTS/CLAUDE/PAD/SKILL reviewed — same substrate doctrine (Next 16 +
  React 19 + TS strict + Tailwind v4 CSS-first + Vitest 5/Playwright
  1.63); no pattern this repo is missing for its single-app API-route
  shape (the monorepo divergences are ADR-logged).

## Key findings (full detail: docs/remediation-plan-session22.md)

The session-20 remediation held up — all gates green, live parity
byte-exact, every session-2/4/6/8/10/12/14/16/18/20 fix re-probed with
zero regressions. The 13 new findings (0 Critical/High/Medium) were the
residuals eleven prior audits hadn't surfaced:

1. **F1 (Low, credential hygiene — the headline):** the LIVE staff
   password equaled the doc-printed example in four living docs — a
   RESURRECTED session-16 F5. The session-16 fix had swapped the
   then-live password for a NEW realistic-looking string
   (`$up3rS3cretPass`) — but that string looked like a real strong
   password, so fresh bootstraps (including this session's own) adopted
   it as the actual `.env` credential. Login-proven working this
   session: `200` with the doc literal.
2. **F2–F4 (Low, doc-claim drift):** PAD ADR-009 Consequences still
   said the dashboard has "no edit/state transitions yet" (stale since
   session 16); SKILL §1/§5 omitted the PATCH staff write path (the
   missed-sibling-row class); PAD §6.1 rule 6 described the date floor
   as "local midnight" where the implemented tolerance is midnight − 1
   day (live: yesterday → 201, two-days-ago → 422).
3. **F5–F13 (Info):** ADR-002 "four client islands" vs the 7 shipped;
   the logout-button "only interactive island" comment; AGENTS "one
   write path" vs 4 write endpoints; the CLAUDE "fixed -window" typo;
   seed's upsert-by-email email-change nuance; db-path's self-anchor
   missing `decodeURIComponent` (a repo path with spaces/`#`/non-ASCII
   silently skips the anchor); the CLAUDE set-state-in-effect rule vs
   the sanctioned header.tsx invoke-once pattern the rule cannot see;
   landing.spec's "smooth-scroll" title overstatement; PAD §3.2's docs/
   subtree listing 4 of 37 entries.

## Live parity evidence (reference vs clone, same session, same method)

| Metric | Reference | Clone (remediated) |
| ------ | --------- | ----- |
| Page height @1440×900 (viewport VERIFIED) | 7490px | 7490px |
| h2 / h3 computed | 60px/63px / 20px/25px, weight 400 | identical |
| Section ids | top/about/services/""/insurance/providers/contact/faq | identical |
| Mobile dropdown panel (390×844) | 192×148 @ (178,80), grid, r24, p8, `rgba(38,74,57,.9)` | identical geometry; oklab-equivalent paint (e2e-rasterized) |
| Mobile menu link click | closes + unmounts; `#services` at 0.421875 | **identical to the pixel** (scrollY 1837 both) |
| Mobile page height (settled) | 12164px | 12162px — a 2px sub-pixel drift entirely inside the contact section (recorded honestly; every other section byte-identical) |
| Rasterized pill / dropdown pixels | rgb(38 74 57 / .8) / rgb(38 74 57 / .9) | [37,74,57,204] (±1 oklab) / [38,74,57,230] exact |
| `<title>` | `Base44 APP` placeholder | semantic titles (recorded deviation) |

Product loop re-verified with the status transitions included: login →
200 → dashboard → 200 (6 rows, 6 `role="status"` live regions) → form
POST → 201 → PATCH confirm → 200 → PATCH complete → 200 → dashboard
reflects; anonymous PATCH → 401; unknown id → 404; invalid status → 422.

## What was remediated (behavior changes TDD — Red confirmed before Green)

- **F1 (Red = the live `200` with the doc literal; Green):** the live
  credential rotated to a generated value printed in NO tracked file
  (`db:seed` upsert; old literal now → generic 401), and the four doc
  escaping-examples switched to the OBVIOUS placeholder
  `\$<your-password>` — the escaping lesson survives, and no future
  bootstrap can adopt the example as a working credential (the root
  cause of the resurrection, not just the symptom). Structural
  acceptance: `git grep` — zero hits for the old literal and for the
  live password across all tracked files.
- **F10 (TDD):** db-path's inline module self-anchor extracted into the
  exported pure seam `moduleSelfRoot(url)` with `decodeURIComponent`
  (Red: 4 new unit tests fail on the missing export; Green: 99/99
  including the 15 pre-existing characterization tests; the dev server
  still resolves `db/custom.db` at the repo root — `/api/health` up and
  a form POST landed in the repo DB).
- **F6/F12:** the logout-button comment de-staled ("an interactive
  island… StatusButton shares it"); the landing.spec title corrected to
  "CTA buttons scroll to the contact section" (the assertion is
  arrival-only; the reduced-motion twin pins the instant case).
- **F2/F3/F4/F5/F7/F8/F11/F13 docs:** PAD ADR-009 consequences, §6.1
  rule-6 floor wording, ADR-002 seven-island annotation, §3.2 docs/
  subtree completion (+ deliberate-elision note), §4.2/§7.1/§7.3/§7.4/§11
  counts → the 99-unit reality; SKILL §1 staff surfaces + §5 tree gained
  the PATCH route; AGENTS "one public write path … plus the staff write
  paths"; CLAUDE "fixed-window" typo + the set-state-in-effect honest
  nuance (header.tsx gained the matching rationale comment).
- **F9 documentation:** seed.ts + `.env.example` document the
  upsert-by-email nuance (changing ADMIN_EMAIL leaves the previous row
  active; deleting the row is the revocation path).

## Verification gate (final, post-remediation)

lint 0 errors (14 correctness rules ON) · typecheck clean under true
strict · **99/99 unit** (95 + 4 new moduleSelfRoot cases) · production
build OK with the identical documented route table · **43/43 e2e × 2
consecutive runs (the double-run proof, within the 10-min limiter
window)** · fresh dev boot healthy (`{"ok":true,"database":"up"}`) ·
live parity spot-checks unchanged (7490px desktop at a VERIFIED
1440×900; mobile panel 192×148 @ (178,80); link-click closes + jumps to
0.421875 — identical to the reference) · the full product loop with
status transitions green under the still-active ambient `DATABASE_URL`
hijack · `role="status"` live regions confirmed in the served dashboard
HTML (6, one per row) · audit/capture probe rows purged (6 realistic
seed rows retained — restored through the PUBLIC API with statuses set
via the real PATCH API) · 20 screenshots refreshed from the remediated
dev server (03-desktop-full is exactly 1440×7490 — the parity height).

## Outcome

Committed on `main` and pushed via `docs/ssh_git_wrapper_v3.py` (runbook:
`docs/how-to-git-push-using-ssh-wrapper_SKILL.md`); the operator key was
shredded after the push and the remote ref verified equal to local HEAD.

**Suggested next steps** (recorded for a future session; the PAD §10
backlog remains empty): dashboard filtering/search or CSV export for
staff records — both beyond-parity surfaces, no parity impact.
