# Remediation Plan — Session 38 (20th Audit Cycle, CSV UTF-8 BOM, Dead-Clause Cleanup, Doc Inventory Sweep)

Repo: `nordeim/health-care-clinic` @ `4c5afe5` (session-36 tree `c978281` +
docs-only `session_37.md` operator paste). Session-38 outputs:
`docs/session_38.md` + this plan. The `skills/` folder remains excluded
from review, testing and compilation.

---

## Part 1 — Audit Findings (20th cycle, Task 38-a, all orchestrator-verified)

**Baseline re-established first**: lint 0 (14 rules ON) / tsc true-strict /
163/163 unit / build 14-route table / 63/63 e2e × 2 (double-run proof,
1.0 m + 1.1 m) — exactly as documented. Scandihaven re-checked: unchanged
at `d4789c3` (nothing new to import).

The 20th fresh-eyes audit (read-only subagent) returned **zero
Critical/High/Medium, 3 Low + 3 Info** — the second consecutive cycle with
no Medium-or-worse finding since the session-36 guard landed. Every finding
was re-verified by the orchestrator at file:line precision before
acceptance:

| ID | Sev | Finding | Verified evidence |
|----|-----|---------|-------------------|
| F1 | Low | **AGENTS.md:202 stale e2e runtime count** — "The suite is 61 tests at runtime" contradicts AGENTS.md:20 / README / CLAUDE / PAD / SKILL (all 63). Introduced by session-36's own +2 e2e pins — the exact stale-count drift class session-36 fixed in CLAUDE (its F2), missed in this sibling note. | `sed -n '202p'` — confirmed |
| F2 | Low | **DEPLOYMENT.md inventory stale** — :15 "the four API route handlers" (there are six: `[id]` PATCH since session-16, `export` GET since session-34); :102 "the appointment AND login rate limiters" (there are four: 5/10, 10/10, 60/10 PATCH, 60/10 export); :118 "both POST routes return 413" (three body-capped routes: 2 POST + 1 PATCH). A never-audited file — the repeated doc sweeps (26/30/34/36) covered README/CLAUDE/SKILL/PAD but never DEPLOYMENT.md. | `sed -n '15p;102p;118p'` — confirmed |
| F3 | Low | **CSV export lacks a UTF-8 BOM → Excel mojibake for non-ASCII names** — `appointmentsToCsv` emits no `EF BB BF`; `Content-Type: text/csv; charset=utf-8` is ignored by Excel on double-click (system ANSI codepage decode). `fullName` has no charset rule (length 3–120 only), so `José García` is a valid submission and exports as `JosÃ© GarcÃ­a` in the dominant clinic-spreadsheet app. Standards-correct UTF-8 (LibreOffice/Sheets fine, data intact on re-import) — a compatibility hardening gap, not corruption. | `dashboard-filters.ts:173` return join — no BOM; `validation.ts:103-108` — no charset rule; e2e pin `spec:252` startsWith header — confirmed |
| F4 | Info | **Dead conditional in the session-36 guard** — `FORMULA_LEADING.test(value) && !value.startsWith("'")`: the right conjunct is provably unreachable (`'` is not in `[=+\-@\t\r]`, so a `'`-leading value always fails the regex first). Behavior-neutral; the unit pin (`'Maria` → `'Maria`) passes identically either way. | `dashboard-filters.ts:143` — confirmed |
| F5 | Info | **Leading-whitespace formula payloads not in FORMULA_LEADING** — `" =WEBSERVICE(x)"` unguarded (Sheets trims leading whitespace before evaluating). Structurally mitigated: every persisted field passes `asTrimmedString` at intake (`validation.ts:103,110,117,140,145`), demo seed uses constants, PATCH writes only allowlisted statuses — no app write path can persist a leading-whitespace formula. Defense-in-depth note only. | grep asTrimmedString — all 5 fields confirmed |
| F6 | Info | **`db:generate` lacks `env -u`** — AGENTS rule 8 / README claim `db:*` scripts strip ambient `DATABASE_URL`; 5 of 6 do (`package.json:7,8,11,13,14,15`), `db:generate` (`:12`) does not. Harmless (`prisma generate` reads only the schema, never opens a DB), but the blanket claim is imprecise. | `package.json:12` — confirmed |

**Session-36 guard re-examination (audit mission item): COMPLETE** — all
five dangerous prefixes independently unit-pinned; all 7 data columns flow
through `csvField`; status/specialty are allowlist constants; the CSV
header is a static constant; search terms never become CSV cells;
`appointmentsToCsv` is the sole CSV composer (no bypass path); duplicate-key
first-wins verified byte-identical page vs export.

**Six documented invariants re-verified HEALTHY** at file:line precision
(env -u guards; 64 KiB stream cap on all POST/PATCH; async scrypt + timing
equalization; 401-before-DB-read on every guarded surface; XFF limiter
wiring; security headers incl. the 308 exception).

---

## Part 2 — Remediation Plan

### Track A — CSV UTF-8 BOM (F3, TDD-first)

**Rationale.** The clinic's public form accepts non-ASCII full names (no
charset rule — correctly so), and staff will double-click the export in
Excel, which decodes BOM-less CSV with the system ANSI codepage → mojibake
in patient names. The industry-standard fix is a UTF-8 signature (`EF BB
BF`) prefix on the CSV body. LibreOffice/Sheets treat it as a signature
(transparency per Unicode TR-17 practice); RFC 4180 does not forbid it.
The BOM composes with the formula guard unchanged (guard operates
per-cell; BOM is a file-level prefix before the header row).

**TDD sequence.**
1. **RED** — in `tests/dashboard-filters.test.ts`: update the existing
   exact-output pins to expect the `\uFEFF` prefix (they become the RED
   proof) + add new pins: (a) output starts with `\uFEFF` + the exact
   header row; (b) the BOM appears exactly once — never per-row — and
   ordinary rows stay byte-identical after it; (c) a non-ASCII name
   (`José García`) exports verbatim (composition pin: BOM + UTF-8 content).
   Run: expect exactly the BOM-affected cases to fail.
2. **GREEN** — one line in `appointmentsToCsv`
   (`src/lib/dashboard-filters.ts`): `return `\uFEFF${lines.join("\r\n")}\r\n``.
3. **e2e pin update** — `tests/e2e/dashboard-filters.spec.ts` header check
   → `csv.startsWith("\uFEFFRequested at,…")` (the body decodes EF BB BF
   → U+FEFF in `response.text()`).
4. **RED-proof (session-26 F4 honesty pattern)** — temporarily revert the
   BOM, `bun run build`, run the spec: the header pin MUST fail (proves
   the pin is real). Restore, rebuild, spec green.
5. **Live probe** — on the running dev server: public POST a non-ASCII
   `José García =WEBSERVICE(x)` composition payload → login → export →
   verify the raw body starts with `EF BB BF` AND the formula cell is
   apostrophe-guarded → purge the probe row (6 seed rows retained).

Unit projection: 163 → 166 (+3 new; existing pins updated in place). e2e
stays 63 (pin updated in place).

### Track B — dead-conjunct cleanup (F4, behavior-neutral)

Drop `&& !value.startsWith("'")` from `csvField` (provably unreachable —
`'` is not in the formula class) and extend the doc comment: apostrophe-
leading values export verbatim, safe by construction (an apostrophe cannot
start a formula). The existing unit pin ("does not double-guard a value
that already leads with an apostrophe") stays as the behavioral guard
against future regex drift. No new test needed — the pin already covers
the behavior; the change is provably identity.

### Track C — `env -u` on `db:generate` (F6, config)

`package.json`: `"db:generate": "env -u DATABASE_URL prisma generate"` —
makes the blanket `db:*` claim in AGENTS rule 8 / README true. Zero
behavior risk (`prisma generate` reads only the schema). Check
`tests/deps.test.ts` for any script-shape pin first (none expected — it
pins the repo `scripts/` directory contents and dependency versions).

### Track D — doc residuals (F1, F2)

- **F1**: AGENTS.md:202 "The suite is 61 tests at runtime" → 63 (the
  seo.spec declaration-vs-runtime note itself stays — still true: 7
  declared → 9 runtime in that file).
- **F2**: DEPLOYMENT.md:15 four → six route handlers (name all six);
  :102 the appointment AND login limiters → all four limiters with their
  budgets; :118 "both POST routes" → all three body-capped routes
  (2 POST + 1 PATCH) return 413.

### Track E — documentation alignment, verification, screenshots, commit + push

- README: the export API row gains the UTF-8 BOM note (and the
  "display verbatim in Excel/LibreOffice/Sheets" claim becomes fully true
  for non-ASCII content once the BOM lands).
- SKILL.md → v2.9.0 (frontmatter project_state + sessions list + §11
  gate counts + Appendix B [S38]).
- PAD: [S38] revision block + §7.1 test counts + §3.2 tree (if touched) +
  ADR-012 Consequences extension (the BOM is an export-fidelity
  consequence) + §10 known-issues rows.
- AGENTS: e2e count already 63 at line 20 (only :202 fixes); rule 12 gains
  the BOM clause.
- CLAUDE: VERIFY counts + the BOM note.
- Full gate re-held post-remediation: lint / tsc / 166 unit / build /
  63 e2e × 2 (double-run proof).
- Live parity re-verification on the remediated tree (7490px desktop;
  mobile panel 192×148 @ (178,80) + paint [38,74,57,230]; link-click
  scrollY 1837) + the 12-step product loop + the live BOM/guard probe.
- 20 screenshots re-captured from the remediated dev server (the seeded
  dashboard dates are self-renewing — the dashboard captures will differ
  truthfully; the landing captures should be byte-stable since no
  rendered surface changed).
- `docs/session_38.md` + repo worklog Task 38 entry + workspace worklog.
- Commit on `main` (single `feat:` commit per convention) → SSH wrapper
  push (`docs/ssh_git_wrapper_v3.py`, explicit
  `--remote git@github.com:nordeim/health-care-clinic.git`) → remote-ref
  verification → operator key shredded.

### Considered and deliberately NOT remediated (doctrine)

- **F5 `\s` in FORMULA_LEADING** — every intake path trims
  (`asTrimmedString` on all five persisted fields), the seed builds
  constants, PATCH writes allowlisted statuses: no app write path can
  persist a leading-whitespace formula. Widening the regex would guard
  only against hand-edited DB rows (admin action, outside the threat
  model) at the cost of guarding legitimately space-leading historical
  rows. Documented here as the accepted residual.
- **BOM-less alternative (do nothing + doc note)** — rejected: the clinic
  context makes non-ASCII patient names the common case, Excel the
  dominant consumer, and the fix is one line + joint test updates.
