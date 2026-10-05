# Session 20 — The Last XFF-less e2e Request, Config Modernization, Doc Residuals & Seed Restoration

Continuation of `docs/session_18.md` / `docs/session_19.md`. Scope:
refresh workspace (it had been reset — full re-bootstrap) → review docs +
session logs (18 + remediation-plan-session18 + worklog + 19) → validate
understanding against the codebase → re-audit with live reference
verification → remediate the new findings → re-verify → document → push.
The repo `skills/` folder stayed excluded from checking, testing and
compilation throughout.

## What was audited

- Workspace re-bootstrapped from scratch (the reset wiped `.env`, `db/`,
  `node_modules`): `git clone` → `af5b493` (= session-18's `e494d1c` +
  the docs-only operator transcript that became `docs/session_19.md`),
  `bun install` (424 packages), `.env` recreated
  (`DATABASE_URL="file:../db/custom.db"` + operator credentials +
  `AUTH_SECRET`, leading-`$` escaped), `db/custom.db` pushed + seeded at
  the repo root. The ambient `DATABASE_URL` hijack
  (`file:/home/z/my-project/db/custom.db`) is ACTIVE in the shell — the
  npm-script `env -u` guards held through every probe.
- Read AGENTS.md, CLAUDE.md, README.md, Project_Architecture_Document.md,
  health-care-clinic_SKILL.md, docs/session_18.md,
  docs/remediation-plan-session18.md, worklog.md, docs/session_19.md —
  then validated every claim against the tree.
- Baseline gates before any change: lint 0 / tsc clean / 95 unit / build
  OK (identical route table) / 43 e2e — all green, exactly as documented.
- `skills/code-review-and-audit` pipeline (static gates + `bun audit` —
  the same two known dev-tooling advisories, accepted) + a fresh-eyes
  full review dispatched as a read-only sub-agent (Task 20-a) — every
  finding re-verified empirically or line-by-line by the orchestrator
  before acceptance.
- `skills/agent-browser` live parity probes on BOTH the reference and
  the local clone (desktop 1440×900 + mobile 390×844), before AND after
  the remediation — with a measurement-hygiene correction this session:
  **assert `innerWidth`/`innerHeight` before trusting any
  viewport-flag measurement** (the first pass silently measured at
  1280×577 because `--viewport` on a re-open doesn't resize the window;
  `agent-browser set viewport` does).
- Scandihaven (tech-stack patterns repo) re-cloned and its
  AGENTS/CLAUDE/PAD/SKILL reviewed — same substrate doctrine (Next 16 +
  React 19 + TS strict + Tailwind v4 CSS-first + Vitest/Playwright); no
  pattern this repo is missing for its single-app API-route shape (the
  deliberate divergences are ADR-logged).

## Key findings (full detail: docs/remediation-plan-session20.md)

The session-18 remediation held up — all gates green, live parity
byte-exact, every session-2/4/6/8/10/12/14/16/18 fix re-probed with zero
regressions. The 4 new findings (0 Critical/High/Medium) were the
residuals ten prior audits hadn't surfaced:

1. **F1 (Low, test determinism + doc-claim accuracy):** the session-18
   claim "no request the suite makes touches the shared 'unknown'
   limiter bucket … within or across runs" was still ONE request short
   of literal — auth.spec's malformed-payload login POST carried NO XFF
   header (the only XFF-less request left in the suite). 1 XFF-less
   login POST per run vs the 10/10-min limit → an 11th consecutive run
   inside the window against a `reuseExistingServer` instance would
   429-flake a test asserting 422. **Empirically proven at the API
   level: 10 XFF-less POSTs → 422×10, the 11th → 429.**
2. **F2 (Info, doc residuals):** README's Testing-block Vitest row
   omitted the status seam (:181) and the Architecture E2E row omitted
   the 6th spec surface (:73) — the session-18 F11 pass fixed the
   sibling rows but missed these two.
3. **F3 (Info, environment):** the workspace reset emptied
   `db/custom.db` — the documented "6 realistic seed rows" state needed
   restoring (no repo defect).
4. **F4 (Info, tooling):** every `bun run test` printed Vite's
   "ESM syntax in a file loaded as CommonJS" deprecation warning —
   `vitest.config.ts` under a package.json with no `"type"` field loads
   as CJS.

## Live parity evidence (reference vs clone, same session, same method)

| Metric | Reference | Clone (remediated) |
| ------ | --------- | ----- |
| Page height @1440×900 (viewport VERIFIED via innerWidth/innerHeight) | 7490px | 7490px |
| h2 / h3 computed | 60px/63px / 20px/25px, weight 400 | identical |
| Mobile dropdown panel | 192×148 @ (178, 80), grid, r24, p8, `rgba(38,74,57,.9)`, 3 links | identical geometry; oklab-equivalent paint (documented v4 variance, e2e-rasterized) |
| Mobile menu link click | closes + unmounts; `#services` at 0.421875 | **identical to the pixel** (re-verified post-remediation) |
| `<title>` | `Base44 APP` placeholder | semantic titles (recorded deviation) |

Product loop re-verified with the status transitions included: login →
200 → dashboard → 200 (6 rows, 6 `role="status"` live regions) → form
POST → 201 → PATCH confirm → 200 → PATCH complete → 200 → dashboard
reflects; anonymous PATCH → 401; unknown id → 404; invalid status → 422.

## What was remediated (all TDD — Red confirmed before every Green)

- **Red phase first:** the API-level poisoning repro (11 consecutive
  XFF-less `POST /api/auth/login` in the exact shape of the
  malformed-payload test: attempts 1-10 → 422, attempt 11 → **429** —
  the shared "unknown" bucket is exhaustable, exactly the flake horizon
  the docs denied).
- **The last per-run key (F1, Green):** `MALFORMED_KEY =
  192.0.7.${process.pid}` (next in the file's 192.0.2-6.x sequence,
  spec-unique third octet, disjoint from every base in every spec) now
  headers that request; the file's key comment block documents the
  session-20 closure. **Structural acceptance: a paren-balanced grep
  across all six spec files proves EVERY request-level POST/PATCH
  carries an XFF header, and every browser-driven site injects one via
  `page.route`/`route.continue` (or aborts before reaching the server) —
  zero XFF-less writes remain. The AGENTS/CLAUDE/SKILL claim is now
  literally true.**
- **Config modernization (F4, Green):** `git mv vitest.config.ts
  vitest.config.mts` — the deprecation warning is gone from `bun run
  test`; the two living references moved with it (SKILL §3 note +
  the playwright.config comment). Historical session transcripts stay
  untouched (immutable records).
- **README residuals (F2, Green):** :181 gains "+ status" in the
  Testing-block Vitest row; :73 gains "appointment status management"
  in the Architecture E2E row.
- **Seed restoration (F3):** probe row purged; 6 realistic rows
  re-inserted through the PUBLIC API (unique XFF key per row) with
  statuses set through the real PATCH API (2 confirmed / 2 new /
  2 completed — the writes double as live probes of the exact surfaces
  the dashboard screenshots show).

## Verification gate (final, post-remediation)

lint 0 errors (14 correctness rules ON) · typecheck clean under true
strict · **95/95 unit — now warning-free** · production build OK with
the identical documented route table · **43/43 e2e × 2 consecutive runs
(the double-run proof, within the 10-min limiter window)** · fresh dev
boot healthy · live parity spot-checks unchanged (7490px at a VERIFIED
1440×900; mobile panel 192×148 @ (178,80); link-click closes + jumps to
0.421875 — identical to the reference) · the full product loop with
status transitions green under the still-active ambient `DATABASE_URL`
hijack · `role="status"` live regions confirmed in the served dashboard
HTML (6, one per row) · audit + capture probe rows purged (6 realistic
seed rows retained) · 20 screenshots refreshed from the remediated dev
server (03-desktop-full is exactly 1440×7490 — the parity height).

## Outcome

Committed on `main` and pushed via `docs/ssh_git_wrapper_v3.py` (runbook:
`docs/how-to-git-push-using-ssh-wrapper_SKILL.md`); the operator key was
shredded after the push and the remote ref verified equal to local HEAD.

**Suggested next steps** (recorded for a future session; the PAD §10
backlog remains empty): dashboard filtering/search or CSV export for
staff records — both beyond-parity surfaces, no parity impact; or simply
run `bun run test:e2e` back-to-back a few times to watch the
determinism guarantee hold.
