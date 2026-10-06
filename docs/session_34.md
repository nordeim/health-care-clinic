# Session 34 — Dashboard Query Layer (ADR-012), 18th Audit Cycle, Parity Re-Verification

Continuation of `docs/session_32.md` / `docs/session_33.md`. Scope: refresh
workspace (`git pull` → `a5c8ad4` — the first session where the bootstrap
SURVIVED: `.env`, `db/`, and `node_modules` all intact from session 32) →
review docs + session logs (32 + remediation-plan-session32 + worklog +
33) → validate understanding against the codebase → re-audit with live
reference verification → remediate the findings + ship the recorded next
beyond-parity enhancement (session-32's suggested next steps: dashboard
filtering/search + CSV export) → re-verify → document → push. The repo
`skills/` folder stayed excluded from checking, testing and compilation
throughout.

## What was audited

- Workspace refreshed via `git pull` → `a5c8ad4` (= session-32's `227fb11`
  + the docs-only operator transcript `docs/session_33.md`); the worktree
  was clean and the session-32 bootstrap INTACT — `.env`
  `DATABASE_URL="file:../db/custom.db"` verified, `db/` at the repo root
  with exactly the 6 demo rows (2/2/2) + 1 admin in `<repo>/db/custom.db`,
  `node_modules` present. The ambient `DATABASE_URL` hijack
  (`file:/home/z/my-project/db/custom.db`) was ACTIVE all session; every
  write landed in the repo DB (live-proven by the product loop) — the
  ADR-010 `env -u` guards held; the hijack target file does not exist.
- Read AGENTS.md, CLAUDE.md, README.md, Project_Architecture_Document.md,
  health-care-clinic_SKILL.md (v2.8.7), docs/session_32.md,
  docs/remediation-plan-session32.md, worklog.md, docs/session_33.md —
  then validated the claims against the tree.
- Operator asks re-verified live: the vitest + playwright suites present
  and green (baseline: 121/121 + 53/53 × 2); `.env.example` ↔ codebase
  exact; the session-32 SEO layer verified at every level.
- Baseline gates before any change: lint 0 (14 rules ON) / tsc true-strict
  / 121/121 unit / build OK (the 14-route table) / 53/53 e2e × 2 (the
  double-run proof) — all green, exactly as documented.
- `skills/code-review-and-audit` pipeline (static gates) + a fresh-eyes
  full review dispatched as a read-only sub-agent (Task 33-a, 18th cycle)
  — every finding re-verified by the orchestrator before acceptance.
- `skills/agent-browser` live parity probes on BOTH the reference and the
  local clone (desktop 1440×900 + mobile 390×844) — viewport verified via
  `innerWidth`/`innerHeight` before every measurement, settle-waits before
  height readings, rasterized-pixel color proofs.
- Scandihaven (tech-stack patterns repo) re-checked — up to date at
  `d4789c3`; same substrate doctrine, nothing new to import this session.

## Key findings (full detail: docs/remediation-plan-session34.md)

The session-32 remediation held up — all gates green, every prior fix
re-probed with zero regressions. The 18th audit found **zero code bugs**;
5 Info findings — 4 doc residuals + 1 sandbox-tooling note:

1. **F1 (Info):** The noindex staff surfaces inherit the ROOT canonical
   (the bare origin) through Next metadata merging — inert under
   noindex,nofollow, but ADR-011 documented only the inherited OG.
2. **F2 (Info):** README File-Hierarchy ASCII-art rail nit on the two
   `seo.ts` continuation lines.
3. **F3 (Info):** `seo.spec.ts` holds 7 `test()` declarations but
   executes 9 (two data-driven loops) — doc claims use the runtime count
   (correct); a future declaration-count audit would undercount.
4. **F4 (Info):** The seo spec's `BAKED_ORIGIN` constant is coupled to
   the repo-`.env` build default — only bites a production-baked e2e run.
5. **F5 (Info):** Sandbox-tooling observation (ssh-wrapper armor-header
   redaction in tool output) — the file is hash-proven identical to the
   git blob; no key material committed anywhere.

## Live parity evidence (reference vs clone, same session, same method)

| Metric | Reference | Clone (before) | Clone (after) |
| ------ | --------- | ----- | ----- |
| Page height @1440×900 (viewport VERIFIED) | 7490px | 7490px | **7490px** |
| Mobile dropdown panel (390×844) | 192×148 @ (178,80), grid, r24, p8, `<nav>` | identical | **identical** |
| Mobile panel rasterized paint | [38,74,57,230] | [38,74,57,230] EXACT | — |
| Mobile menu link click | closes + unmounts; servicesTop 0.421875, scrollY 1837 | identical | **identical** (0.421875 / 1837) |
| Desktop nav pill rasterized | rgb(38 74 57 / .8) | [37,74,57,204] (±1 oklab) | — |

**Mobile navigation verified working correctly on both sites — no
Tailwind v4 bug.** The full 12-step product loop stayed green (anon 307 →
login 200 + httpOnly cookie → dashboard 200 → POST 201 → PATCH confirm
200 → PATCH complete 200 → anon PATCH 401 [curl] → unknown id 404 →
invalid status 422 → wrong creds generic 401 → logout 200 → post-logout
307 [curl]); probe rows purged after (exactly the 6 seed rows remain);
dev.log clean.

## What was remediated (TDD-first; docs/remediation-plan-session34.md)

The recorded next beyond-parity step, shipped as **ADR-012 — the
dashboard query layer** (extends ADR-009; the PUBLIC landing experience
byte-identical — zero rendered-body markup on public routes):

- **Slice 1 (RED → GREEN):** `tests/dashboard-filters.test.ts` written
  FIRST — failing on the missing module — then the pure seam
  `src/lib/dashboard-filters.ts`: `parseDashboardFilters` (status/specialty
  validated against the content.ts-DERIVED allowlists — bogus values
  dropped, never a 500; empty GET-form controls treated as absent; array
  params defensive), `filterAppointments` (AND composition,
  case-insensitive substring search across name/phone/email),
  `appointmentsToCsv` (RFC 4180: comma/quote/line-break quoting with
  doubled embedded quotes, CRLF rows, ISO 8601 dates, raw status values,
  null → empty fields), `filtersToQueryString` (form-encoded —
  byte-compatible with a native form submission; round-trip pinned).
  31 unit cases; suite 121 → 152.
- **Slice 2 (page wiring):** the dashboard reads `searchParams` through
  the seam and renders a native GET `<form>` (zero client islands, works
  without JavaScript): a status select (from `appointmentStatuses`), a
  specialty select (from `services`), a search input, Apply, a Clear
  link, and an "Export CSV" anchor carrying the ACTIVE filters. The
  stats cards stay GLOBAL; filters scope the table within the latest-100
  window; a distinct "No requests match the current filters." empty
  state. Proven non-regressive: the existing appointments-status spec
  green unchanged.
- **Slice 3 (RED → GREEN):** `tests/e2e/dashboard-filters.spec.ts`
  written FIRST — the export tests 404 — then
  `src/app/api/appointments/export/route.ts`: GET, session-guarded with
  the PATCH route's doctrine (signed cookie + admin row existence, 401
  BEFORE any DB read), 60/10-min limiter, filters parsed by the SAME
  seam, `text/csv; charset=utf-8` + `Content-Disposition: attachment`
  with a request-time date prefix (self-renewing). 8 e2e tests: anon
  401, the derived select options, status filter, search +
  case-insensitivity, bogus-param dropping, the empty-filter state,
  export-respects-filter (header + includes/excludes), RFC 4180
  escaping (a comma+quote fixture name). Suite 53 → 61.
- **Two hardening lessons pinned:** (1) the auth spec's page-wide
  `getByText("Women's health").first()` resolved to the new specialty
  `<select>`'s hidden `<option>` — such assertions are now ROW-SCOPED
  (the pin is stronger than before); (2) the new spec's fixture POSTs
  use PER-TEST XFF keys (`198.51.126.<pid>.<n>` — 7 POSTs on a single
  key would trip the 5/10-min appointments limiter mid-suite).
- **Doc residuals closed (Track A):** ADR-011 Consequences now names the
  inherited canonical on the noindex staff pages (F1) and the
  BAKED_ORIGIN build-env coupling (F4); the README tree rail fixed
  (F2); the seo.spec declaration-vs-runtime count note recorded in
  AGENTS Testing quirks (F3).
- **Docs:** every living doc swept — README (Key Features + API table +
  File Hierarchy + Tested row + Testing note), AGENTS (description +
  e2e count + rule 11 notes + Testing quirks), CLAUDE (File
  Organization + API Patterns + Testing + Success Metrics), SKILL.md →
  v2.8.8 (frontmatter + §5 tree + §11 counts + Appendix B [S34]), PAD
  (ADR-012 + [S34] revision block + §3.2 tree + §7.1/§7.3/§7.4 + §10
  rows + §11 rows), this session record, and the repo worklog entry.

## Verification gate (final, post-remediation)

lint 0 errors (14 correctness rules ON) · typecheck clean under true
strict · **152/152 unit** · production build OK (the 14-route page table
unchanged — the export route is a handler, not a page) · **61/61 e2e × 2
consecutive runs (the double-run proof)** · live re-verification on the
remediated tree: page height 7490px unchanged; mobile panel 192×148 @
(178,80); link-click 0.421875 / scrollY 1837; `/api/health` up; the
12-step product loop green under the still-active ambient
`DATABASE_URL` hijack · 20 screenshots refreshed from the remediated dev
server (03-desktop-full exactly 1440×7490 — the parity height; the
dashboards show the 6 seed rows AND the new query bar; the capture's
submission row purged after) · dev.log clean (no hydration errors, no
failed API calls, no PII).

## Outcome

Committed on `main` and pushed via `docs/ssh_git_wrapper_v3.py` (runbook:
`docs/how-to-git-push-using-ssh-wrapper_SKILL.md`); the operator key was
shredded after the push and the remote ref verified equal to local HEAD.

**Suggested next steps** (recorded for a future session; the PAD §10
backlog carries no actionable code items): a paginated query layer if
volumes outgrow the latest-100 window; revisit JSON-LD structured data
if real clinic NAP data ever replaces the placeholder parity copy.
