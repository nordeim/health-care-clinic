# Remediation Plan — Session 34 (18th Audit Cycle, Dashboard Query Layer, Parity Re-Verification)

**Date:** 2026-10-06
**Scope:** Fresh-eyes audit of the session-32 tree (`a5c8ad4` = `227fb11` + the
docs-only operator transcript that became `docs/session_33.md`), live parity
re-verification on both sites, remediation of the new findings, and the next
recorded beyond-parity enhancement (session-32's suggested next steps):
**dashboard filtering + search + CSV export**. The repo `skills/` folder is
excluded from checking, testing and compilation per the operating instructions.
**Method:** `skills/code-review-and-audit` doctrine (static gates + fresh-eyes
full review as a read-only sub-agent — every finding re-verified by the
orchestrator), `skills/agent-browser` live parity probes (viewport verified
before every measurement, settle-waits before height readings, rasterized
pixels — never computed-string comparisons), `skills/tdd` (red → green, one
vertical slice at a time).

---

## Part 1 — Audit Findings (18th cycle, Task 33-a)

**Zero Critical / High / Medium / Low. Five Info findings** — the session-32
SEO layer verified healthy at every level (seam → routes → layout/pages → unit
pins → served build artifacts), all baseline gates green (lint 0 / tsc clean /
121/121 unit / build 14 routes / 53/53 e2e × 2), all parity metrics byte-exact.

### 1.1 Issues found

| ID | Severity | Finding | Evidence | Disposition |
|----|----------|---------|----------|-------------|
| F1 | Info | Staff surfaces inherit the ROOT canonical via Next metadata merging — `/login`'s served head carries `<link rel="canonical" href="http://localhost:3000"/>` (the bare origin). The seam deliberately withholds canonical/OG from staff pages, but the root layout's `alternates.canonical: "/"` merges down anyway. Inert (pages are noindex,nofollow; e2e staff pins check the robots meta) — a DOC residual: ADR-011 documents the inherited OG but never names the inherited canonical | built `.next/standalone/.next/server/app/login.html`; `src/lib/seo.ts:88-92`; PAD ADR-011 Consequences | **Doc fix (A1)** |
| F2 | Info | README File-Hierarchy ASCII-art nit: `seo.ts` is the last lib child (`└──`) yet its two continuation lines open with a dangling `│` rail | `README.md:122-124` | **Doc fix (A2)** |
| F3 | Info | `tests/e2e/seo.spec.ts` holds 7 `test()` declarations but executes 9 tests (the data-driven loops at :109 and :151 each expand ×2). All doc claims use the runtime count (53 — correct), but a future declaration-count audit that doesn't model the loops would compute 51 | `tests/e2e/seo.spec.ts:109,151` | **Doc note (A3)** |
| F4 | Info | `BAKED_ORIGIN = "http://localhost:3000"` in seo.spec.ts is hard-coupled to the repo-`.env` build default — a build made with a production `NEXT_PUBLIC_SITE_URL` would fail the spec's baked-origin pins until the constant changes. Deliberate today (documented); only bites a production-baked e2e/CI run | `tests/e2e/seo.spec.ts:9-16` | **Doc note (A4)** |
| F5 | Info | Sandbox-tooling observation, NOT a repo defect: tool output displays the ssh wrapper's OpenSSH armor-header *constant* redacted; the file is hash-proven identical to the git blob and contains no key material | `docs/ssh_git_wrapper_v3.py:104-108` | No change |

### 1.2 Verified healthy (re-confirmed, condensed)

- Diff `227fb11..a5c8ad4` docs-only (exactly `docs/session_33.md`, +116); worktree clean
- Baseline gates after `git pull`: lint 0 (14 rules ON) · tsc true-strict · **121/121 unit** · build 14-route table · **53/53 e2e × 2** (double-run proof)
- Session-32 SEO layer exact: `PUBLIC_PATHS` = the 3 public routes (staff routes are a compile-time-inaccessible literal union); `ROOT_DESCRIPTION` 146 ≤ 160; baked sitemap = 3 locs @ build origin + build-time `lastModified`; robots = allow-all + sitemap ref, zero Disallow; title.template atomicity git-proven (composed titles byte-identical); og-image 1200×630 real PNG
- LL-11 host-rewrite genuinely implemented and necessary (baked origin ≠ e2e :3100 origin)
- Unit 121 by declaration (19+19+4+20+8+14+10+27); e2e 53 at runtime (3+7+13+2+10+9+9)
- `.env.example` ↔ codebase exact; `env -u DATABASE_URL` guards present; deps allowlist + `scripts/` = seed.ts pinned; 0 TODO/FIXME; 0 `any`/ts-ignore; time-erosion clean; secret scan 0 hits; dev.log clean; screenshots = 20 real PNGs, 03-desktop-full exactly 1440×7490
- Environment: `.env` `DATABASE_URL="file:../db/custom.db"` verified; `db/` at repo root; exactly 6 demo seed rows (2/2/2) + 1 admin in `<repo>/db/custom.db`; ambient `DATABASE_URL` hijack ACTIVE all session — the ADR-010 `env -u` guards held (every write in the repo DB, live-proven)
- vitest (`vitest.config.mts`) + Playwright (`playwright.config.ts`) suites present and green — the operator's standing asks re-verified live

### 1.3 Live parity evidence (reference vs clone, same session, same method)

| Metric | Reference | Clone |
| ------ | --------- | ----- |
| Page height @1440×900 (viewport VERIFIED) | 7490px | **7490px** |
| Mobile dropdown panel (390×844, viewport VERIFIED) | 192×148 @ (178,80), grid, r24, p8, `<nav>` | **identical** |
| Mobile panel rasterized paint | [38,74,57,230] | **[38,74,57,230] EXACT** |
| Mobile menu link click | closes + unmounts; servicesTop 0.421875, scrollY 1837 | **identical to the pixel** |
| Desktop nav pill rasterized | rgb(38 74 57 / .8) | [37,74,57,204] — the documented ±1 oklab drift |

**Mobile navigation verified working correctly on both sites — no Tailwind v4
bug.** Full 12-step product loop green (anon 307 → login 200 + httpOnly cookie
→ dashboard 200 → POST 201 → PATCH confirm 200 → PATCH complete 200 → anon
PATCH 401 [curl] → unknown id 404 → invalid status 422 → wrong creds generic
401 → logout 200 → post-logout 307 [curl]); probe rows purged after (exactly
the 6 seed rows remain); dev.log clean.

### 1.4 The enhancement (beyond-parity, the recorded next step)

Session-32's session record closes with: *"dashboard filtering/search or CSV
export for staff records — both beyond-parity surfaces, no parity impact."*
This session ships BOTH, as one query layer: **ADR-012 — the dashboard query
layer** (status filter + specialty filter + case-insensitive search + CSV
export), extending ADR-009's staff surface exactly as ADR-011 extended its
discoverability: the public landing experience is untouched (zero rendered
body markup on public routes), so the parity contracts are structurally
unaffected.

---

## Part 2 — Remediation Plan

All changes land on `main` (no new branches). `skills/` stays out of
lint/typecheck/test/build. **Zero new npm dependencies** (pure TypeScript +
Prisma; the deps contract `tests/deps.test.ts` pins the allowlist) and **zero
new `scripts/` entries** (the same contract pins `scripts/` = `seed.ts`).

### Track A — audit doc residuals (F1–F4)

- **A1 (F1):** PAD ADR-011 Consequences — extend the inherited-OG sentence to
  also name the inherited canonical on the noindex staff surfaces (points at
  the bare origin; inert under noindex; documented).
- **A2 (F2):** README File Hierarchy — fix the dangling `│` rail on the two
  `seo.ts` continuation lines (align under the `└──` entry).
- **A3 (F3):** AGENTS.md Testing quirks — one line recording that
  `seo.spec.ts`'s two data-driven loops expand 7 declarations → 9 runtime
  tests (count e2e at RUNTIME, not by declaration).
- **A4 (F4):** AGENTS.md rule 11 — one line recording the `BAKED_ORIGIN`
  build-env coupling (a production-baked artifact requires deriving the
  constant from the build env before running the seo spec).

### Track B — Dashboard query layer (ADR-012): filter + search + CSV export

#### New seam: `src/lib/dashboard-filters.ts` (pure, unit-tested)

The dashboard's query composition becomes a tested seam like `validation.ts`
— one code path shared by the dashboard page AND the export route (they
cannot drift apart).

```
DashboardFilters             { status?: string; specialty?: string; search?: string }
parseDashboardFilters(params)  status ∈ APPOINTMENT_STATUSES else dropped;
                               specialty ∈ APPOINTMENT_SPECIALTIES else dropped
                               (both DERIVED from content.ts — never hand-copied);
                               search trimmed, truncated at 120 chars;
                               empty-string params (a GET form's unset selects)
                               treated as absent; array params → first value
filterAppointments(rows, f)    pure AND filter: status exact, specialty exact,
                               search case-insensitive substring across
                               fullName / phone / email
appointmentsToCsv(rows)        RFC 4180: header "Requested at,Full name,Phone,
                               Email,Specialty,Preferred date,Status"; fields
                               quoted when they contain , " CR LF (embedded
                               quotes doubled); CRLF row separators; ISO 8601
                               dates; raw status values; null → empty field
filtersToQueryString(f)        canonical query string (empty values dropped) —
                               the export link and the form share it
```

Filtering applies **within the latest-100 window** (the fetch is unchanged);
the stats cards stay GLOBAL (they describe the whole inbox; the filters scope
the table). Documented semantics at clinic scale.

#### Phase 1 — RED: the seam contract (`tests/dashboard-filters.test.ts`) → GREEN: `src/lib/dashboard-filters.ts`

TDD slice 1 (one seam, red before green):

1. Write `tests/dashboard-filters.test.ts` FIRST — failing on the missing
   module. Cases (~22): parse (undefined/empty/empty-string/array params,
   valid+bogus status/specialty, search trim + 120 bound), filter (each
   dimension, case-insensitivity across all three fields, AND composition,
   no-match, identity), CSV (header exact, column order, comma/quote/newline
   quoting, CRLF endings, null fields, empty array → header only, raw status
   values), query string (empty → "", drops empties, URLSearchParams
   encoding, round-trip through parse).
2. Implement `src/lib/dashboard-filters.ts` minimally to pass.
3. Acceptance: `bunx vitest run tests/dashboard-filters.test.ts` green; unit
   suite 121 → ~143.

#### Phase 2 — Dashboard page wiring (searchParams → filter → UI)

4. `src/app/dashboard/page.tsx`: accept `searchParams` (a Promise in
   Next 16) → `parseDashboardFilters` → `filterAppointments` over the fetched
   latest-100; render a native GET `<form action="/dashboard">` (works
   without JS — RSC doctrine, zero new client islands) with a status select
   (from `appointmentStatuses`), a specialty select (from `services`), a
   search input, Apply + a `<Link>` Clear; the row-count note reflects the
   filtered shape ("N of M requests match the current filters."); a distinct
   empty-filter state ("No requests match the current filters."); an
   "Export CSV" anchor to `/api/appointments/export?<filtersToQueryString>`
   (plain anchor — a file download, not an App-Router page).
5. Acceptance: unit suite still green; `bunx playwright test
   tests/e2e/appointments-status.spec.ts` green (the existing dashboard
   contract unchanged — the table, badges, and StatusButtons render as
   before under empty filters).

#### Phase 3 — RED: the export + filter e2e (`tests/e2e/dashboard-filters.spec.ts`) → GREEN: `src/app/api/appointments/export/route.ts`

TDD slice 2 (the route goes red on a 404 first):

6. Write `tests/e2e/dashboard-filters.spec.ts` FIRST — failing while the
   route 404s. Per-run XFF keys on third octets 126/127/128 (disjoint from
   every documented base: 104/105/106/107, 192.0.5.x, 192.0.6.x,
   198.51.123-125.x, 203.0.113.x) + `page.route` injection on the
   browser-driven requests (login POST + export GET — the session-18 F8
   doctrine: no request the suite makes touches the shared "unknown" bucket).
   Tests (~9):
   - Anonymous `GET /api/appointments/export` → 401 (before any DB read)
   - Login via the real UI → the dashboard renders the filter bar
     (labels, selects, search, Apply, Clear, Export CSV anchor)
   - Status filter "New" + Apply → only New rows visible (the confirmed
     fixture absent, the new fixture present)
   - Search (unique fixture fragment) → only the matching row
   - Search case-insensitivity (lowercase fragment of a mixed-case name)
   - Bogus URL params (`?status=bogus&specialty=also-bogus`) → dropped,
     both fixtures visible (a bogus filter never hides rows)
   - Export with an active filter → 200 · `text/csv` · Content-Disposition
     attachment · body contains the header row + the matching fixture and
     NOT the excluded one (the export respects the active view)
   - CSV escaping: a fixture name containing a comma + a quote → the CSV
     field is quoted with the embedded quote doubled (cross-seam RFC 4180)
   - Empty search result → the "No requests match" state + Clear link
7. GREEN: implement `src/app/api/appointments/export/route.ts` — GET,
   session-guarded (the PATCH doctrine: signed cookie must verify AND the
   admin row must still exist, else 401 BEFORE any DB read), per-key
   rate-limited (60 / 10 min — staff pacing, same shape as PATCH), parses
   the same filters from `request.url`, fetches latest-100, filters via the
   seam, `appointmentsToCsv`, responds `text/csv; charset=utf-8` +
   `Content-Disposition: attachment; filename="appointments-<date>.csv"`
   (request-time date — self-renewing). A static segment takes precedence
   over the `[id]` dynamic segment — no route conflict.
8. Acceptance: `bunx playwright test tests/e2e/dashboard-filters.spec.ts`
   green; e2e 53 → ~62.

#### Phase 4 — Full verification gate (the regression net)

9. `bun run lint && bun run typecheck && bun run test && bun run build &&
   bun run test:e2e` — acceptance: lint 0, tsc clean, ~143 unit, build OK
   (14-route table unchanged — the export route is a handler, not a page),
   e2e ~62/62 plus the double-run proof (a SECOND consecutive `test:e2e`
   within the 10-min limiter window must ALSO be green).
10. Live re-verification on the remediated tree: page height 7490px
    unchanged; mobile panel 192×148 @ (178,80); link-click 0.421875 /
    scrollY 1837; rasterized trap guards green; `/api/health` up; the
    12-step product loop green; dev.log clean.

#### Phase 5 — Screenshots refresh (20 captures)

11. Re-capture all 20 screenshots in one scripted Playwright pass from the
    remediated dev server (the hardened session-26/28/30/32 patterns:
    viewport before goto, settle-waits, per-run XFF key injection on
    browser API calls via context.route — this session's base disjoint from
    every documented base, dashboard via real login, legal pages guarded on
    `<main>`); dashboards show the 6 seed rows AND the new filter bar;
    03-desktop-full exactly 1440×7490; the capture's submission row purged
    after (6 seed rows retained).

#### Phase 6 — Documentation alignment (every living doc swept)

12. **README.md**: Key Features dashboard row gains filtering/search/CSV;
    API table gains the export row; File Hierarchy gains
    `dashboard-filters.ts` + the export route; F2 rail fix; Tested row
    counts; Testing note.
13. **AGENTS.md**: codebase description (staff write paths + read/export);
    e2e count; A3 + A4 notes.
14. **CLAUDE.md**: File Organization + API Patterns + Testing + Success
    Metrics (unit/e2e counts).
15. **health-care-clinic_SKILL.md**: v2.8.8 (frontmatter + §5 tree + §11
    counts + Appendix B `[S34]`).
16. **Project_Architecture_Document.md**: **ADR-012** (dashboard query
    layer — searchParams-driven filtering + session-guarded CSV export,
    extending ADR-009); `[S34]` revision block; §3.2 tree; §6.3 (export
    auth doctrine); §7.1/§7.3/§7.4 counts; §10 rows (A1 canonical note);
    §11 rows.
17. **docs/session_33.md** update (the session record) + repo `worklog.md`
    orchestrator entry.

#### Phase 7 — Commit + push

18. Secret scan (`git grep` for credentials — 0 hits expected), `git add`
    the remediated tree (NEVER `.env`, `db/*.db`, logs), Conventional
    Commit on `main`, push via `docs/ssh_git_wrapper_v3.py` (runbook:
    `docs/how-to-git-push-using-ssh-wrapper_SKILL.md` — dry-run first,
    explicit `--remote`, remote ref verified == local HEAD, operator key
    shredded after).

### Considered and deliberately NOT remediated (doctrine)

| Item | Decision | Rationale |
|------|----------|-----------|
| DB-level filtering (Prisma `where`) | Skip — in-memory seam | Prisma SQLite has no `mode: "insensitive"`; one pure code path (the seam) serves the page AND the export identically; the latest-100 window is the documented clinic-scale semantic |
| Client-island filter controls | Skip — native GET form | Server-rendered form + RSC re-render: works without JS, zero new client islands, zero hydration surface — the house "Server Components by default" doctrine |
| JSON-LD structured data | Skip (unchanged from S32) | The NAP copy is verbatim-reference placeholder data — schema would advertise fake phone/email |
| Web manifest | Skip (unchanged from S32) | Reference has none; not a ranking factor |
| CSV export of the FULL table (beyond latest-100) | Skip | Consistency with the dashboard's documented latest-100 window; a full export is a different feature (pagination) the surface does not claim |
| `F5` ssh-wrapper redaction note | No change | Sandbox tooling observation, not a repo defect |
