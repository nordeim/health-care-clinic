# Session 38 — CSV UTF-8 BOM, Dead-Conjunct Cleanup, Doc Inventory Sweep, 20th Audit Cycle, Parity Re-Verification

Continuation of `docs/session_36.md` / `docs/session_37.md`. Scope: refresh
workspace (`git pull` → `4c5afe5` — the workspace SURVIVED this time, no
reset, no re-bootstrap needed) → review docs + session logs (36 +
remediation-plan-session36 + worklog + 37) → validate understanding
against the codebase → re-audit with live reference verification →
remediate the findings (headline: the CSV export's missing UTF-8
signature) → re-verify → document → push. The repo `skills/` folder
stayed excluded from checking, testing and compilation throughout.

## What was audited

- Workspace refreshed via `git pull` → `4c5afe5` (= session-36's
  `c978281` + the docs-only operator transcript `docs/session_37.md`);
  the worktree was clean, the environment intact from the prior session
  (no reset: `.env` with `DATABASE_URL="file:../db/custom.db"`, exactly
  6 demo rows (2/2/2) + 1 admin, dev server healthy). The ambient
  `DATABASE_URL` hijack (`file:/home/z/my-project/db/custom.db`)
  remained ACTIVE — the ADR-010 `env -u` guards held all session.
- Read AGENTS.md (12 rules), CLAUDE.md, README.md,
  Project_Architecture_Document.md, health-care-clinic_SKILL.md (v2.8.9),
  docs/session_36.md, docs/remediation-plan-session36.md, worklog.md,
  docs/session_37.md — then validated the claims against the tree (all
  five docs' state markers matched the session-36 remediation exactly).
- Operator asks re-verified live: vitest + playwright suites present and
  green (baseline: 163/163 + 63/63 × 2 — the double-run proof); `.env`
  correct; `.env.example` ↔ codebase exact (tracked, unchanged — no new
  env vars this session).
- Baseline gates before any change: lint 0 (14 rules ON) / tsc
  true-strict / 163/163 unit / build OK (the 14-route table) / 63/63
  e2e × 2 — all green, exactly as documented.
- A fresh-eyes full review dispatched as a read-only sub-agent (Task
  38-a, 20th cycle) — every finding re-verified by the orchestrator
  (file:line + quoted evidence) before acceptance.
- `skills/agent-browser` live parity probes on BOTH the reference and
  the local clone (desktop 1440×900 + mobile 390×844) — viewport set via
  `set viewport` (the open-time viewport hint is ignored — re-documented
  trap) and verified via `innerWidth` before every measurement.
- Scandihaven (tech-stack patterns repo) re-checked — unchanged at
  `d4789c3` (local == remote); same substrate doctrine, nothing new to
  import this session.

## The 20th audit (Task 38-a) — findings

Zero Critical/High/Medium — the second consecutive clean sheet at that
band since the guard landed. 3 Low + 3 Info, all new to this cycle:

- **F1 (Low)** AGENTS.md:202's Testing-quirks note still said "61 tests
  at runtime" — a stale-count regression introduced by session-36's own
  +2 e2e pins (the exact sibling-drift class session-36 fixed in CLAUDE);
  internally contradicted AGENTS:20 / README / CLAUDE / PAD / SKILL.
- **F2 (Low)** DEPLOYMENT.md's inventory had aged: "the four API route
  handlers" (six exist — `[id]` PATCH since session-16, `export` GET
  since session-34), "the appointment AND login rate limiters" (four
  exist), "both POST routes return 413" (three body-capped routes: 2
  POST + 1 PATCH). A file no prior doc sweep had visited.
- **F3 (Low)** the CSV export emitted no UTF-8 signature — Excel
  double-click decodes BOM-less UTF-8 CSV with the system ANSI codepage,
  so a VALID non-ASCII public-form `fullName` (`José García` — no
  charset rule by design) exported as mojibake in the dominant
  clinic-spreadsheet app. Compatibility hardening gap, not data
  corruption (LibreOffice/Sheets fine; data intact on re-import).
- **F4 (Info)** a provably-dead conjunct in the session-36 guard:
  `FORMULA_LEADING.test(value) && !value.startsWith("'")` — the right
  conjunct is unreachable (`'` is not in `[=+\-@\t\r]`, so the regex
  short-circuits first). Behavior-neutral.
- **F5 (Info)** leading-whitespace formula payloads (`" =WEBSERVICE"`)
  escape FORMULA_LEADING, but every intake path trims
  (`asTrimmedString` on all five persisted fields) — no app write path
  can persist one. Out of threat model; documented residual.
- **F6 (Info)** `db:generate` lacked the `env -u` guard (harmless —
  `prisma generate` never opens a DB — but AGENTS rule 8's blanket
  `db:*` claim was imprecise).

The audit's session-36 guard re-examination: **complete** (all five
prefixes, all seven columns, header constant, no bypass path, no CSV
composer besides `appointmentsToCsv`). All six documented invariants
re-verified HEALTHY at file:line precision.

## Live parity + superset verification (before remediation)

- **Reference (390×844):** full height 12164; panel geometry 192×148 @
  (178,80), `grid`, border-radius 24px, padding 8px (the 2nd `<nav>`);
  link-click → panel closes AND unmounts (nav count 3 → 2), `scrollY`
  1837, services at viewport top (top/innerHeight ≈ 0.0005).
- **Clone (390×844):** full height 12162 (the documented 2px contact
  drift); panel geometry IDENTICAL to the pixel; link-click behavior
  IDENTICAL (unmount, scrollY 1837, services-at-top 0.0005).
- **Both (1440×900):** desktop height **7490px exact**; all 7 section
  ids present; all 7 h2s byte-identical (including the reference's own
  "thewhole you." copy quirk, replicated verbatim).
- **Mobile navigation verified working correctly on both sites — no
  Tailwind v4 bug** (the sixth consecutive session to confirm this).
- Route table: the clone remains a SUPERSET (the reference's 3 routes +
  `/login` + guarded `/dashboard` + `robots.txt` + `sitemap.xml` +
  `/api/*`).
- **12-step product loop: 13/13 green** (anon 307 → login 200 +
  httpOnly → auth 200 → public POST 201 → PATCH confirmed → PATCH
  completed → anon PATCH 401 → 404 → 422 → wrong-creds 401 → logout →
  post-logout 307); probe row purged after.

## Remediation (TDD-first, `docs/remediation-plan-session38.md`)

- **Track A — UTF-8 BOM (F3):** RED — the three exact-output unit pins
  updated to expect `\uFEFF` + three new pins (BOM-exactly-once-never-
  per-row; non-ASCII verbatim export; BOM × formula-guard composition)
  → exactly 6 failed as designed. GREEN — the one-line file-level
  `\uFEFF` prefix in `appointmentsToCsv` (doc-comment records the Excel
  ANSI-decode rationale; the signature is transparent to
  LibreOffice/Sheets and composes with the per-cell guard). The e2e
  header pin updated to expect U+FEFF and **RED-proven** by temporarily
  reverting the BOM (build → 1 failed / 9 passed → restored → 10/10).
- **Track B — dead conjunct (F4):** `&& !value.startsWith("'")`
  dropped from `csvField` with a comment proving why apostrophe-leading
  values can never match; the no-double-guard unit pin stays as the
  regex-drift guard (passes identically — the change is provably
  identity).
- **Track C — env -u on db:generate (F6):** one-line `package.json`
  edit; the `db:*` blanket claim in AGENTS rule 8 is now literally
  true. No test pins the scripts section (deps.test pins dependencies
  + repo `scripts/` contents only).
- **Track D — doc residuals:** AGENTS:202 61 → 63; DEPLOYMENT.md
  inventory refreshed (six routes named with methods, four limiters
  with budgets, three body-capped routes).
- Unit 163 → 166; e2e stays 63 (pins updated in place).

## Post-remediation verification

- **Full gate:** lint 0 / tsc true-strict / **166/166 unit** / build OK
  (the 14-route table unchanged) / **63/63 e2e × 2 consecutive runs
  (the double-run proof)**.
- **Live re-verification on the remediated tree:** desktop 7490px
  unchanged; mobile panel 192×148 @ (178,80) identical; link-click
  closes + unmounts + scrollY 1837 identical — parity contracts all
  held (the BOM is invisible to every rendered surface, as designed).
- **12-step product loop re-run green (13/13)** on the remediated
  server.
- **Live BOM + guard end-to-end probe: PASS** — a composition payload
  (`=SUMA(A1:É9)` — formula-leading AND accented, in one cell) plus a
  plain non-ASCII name (`José García`) POSTed publicly (201/201) →
  login → export → the raw body starts with `EF BB BF` (byte-checked),
  the BOM appears exactly once (before the header row), the formula
  cell is apostrophe-guarded, zero unguarded field-starts, and `José
  García` exports verbatim. Probe rows purged (6 seed rows retained).
  Probe methodology note: the default `TextDecoder` STRIPS the BOM
  (signature semantics) — the authoritative check is the raw bytes;
  Playwright's `response.text()` preserves U+FEFF (the e2e pin's
  basis).
- **20 screenshots re-captured** from the remediated dev server in one
  scripted pass (per-run XFF base `198.51.131.<pid>` — disjoint from
  every documented base); 03-desktop-full exactly 1440×7490; the
  dashboards re-captured with the clean 6-seed-row DB after the
  capture's submission row was purged (15-dashboard-mobile-390-full
  390×1452 — the documented content-dependent height).
- dev.log clean (no hydration errors, no failed API calls, no PII).

## Documentation alignment

SKILL.md → v2.9.0 (frontmatter project_state + sessions list + §11
gate counts + Appendix B [S38]) · PAD ([S38] revision block + ADR-012
Consequences session-38 extension + §3.2 tree rows + §7.1 test
distribution + §7.3/§7.4 gate counts + §10 accepted-residual row for
F5 + §11 re-measured line counts: seam 192 / unit spec 402 / e2e spec
362) · README (Tested row 166 + the export API row's BOM note) · AGENTS
(:202 count fix + rule 12 BOM clause) · CLAUDE (45 seam cases + 166
VERIFY + the BOM pins note) · DEPLOYMENT.md (the F2 inventory refresh)
· `.env.example` re-verified unchanged (no new env vars; tracked in
the commit).

## Outcome

Committed on `main` and pushed via `docs/ssh_git_wrapper_v3.py`
(runbook: `docs/how-to-git-push-using-ssh-wrapper_SKILL.md`; paramiko
shim re-deployed to the workspace `bin/`); the operator key was
shredded after the push and the remote ref verified equal to local
HEAD.

**Suggested next steps** (recorded for a future session; the PAD §10
backlog carries no actionable code items): a paginated query layer if
volumes outgrow the latest-100 window; revisit JSON-LD structured data
if real clinic NAP data ever replaces the placeholder parity copy.
