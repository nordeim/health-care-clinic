# Remediation Plan — Session 24 (Favicon Chrome Parity, PAD Count Residuals, Script-Footgun Note, Seed-State Restore)

**Date:** 2026-10-06
**Scope:** Full fresh-eyes audit of the session-22 tree (`b4e0717` + the
docs-only `05d70b6` — the operator transcript paste that became
`docs/session_23.md`), with live re-verification against the reference site,
then remediation of the new findings. The repo `skills/` folder is excluded
from checking, testing and compilation per the operating instructions.
**Method:** `skills/code-review-and-audit` doctrine (static gates +
`bun audit` + a fresh-eyes full review dispatched as a read-only sub-agent —
every finding re-verified empirically or line-by-line by the orchestrator
before acceptance), `skills/agent-browser` live parity probes on both the
reference and the local clone (desktop 1440×900 + mobile 390×844, viewport
verified via `innerWidth`/`innerHeight` before every measurement,
settle-waits before height readings), `skills/test-driven-development`
doctrine — the green 99-unit + 43-e2e suite is the characterization net;
every behavior change gets a failing test first.

---

## Part 1 — Audit Findings

### 1.1 Verified healthy (re-confirmed this session)

| # | Check | Evidence |
|---|-------|----------|
| H1 | Lint / type gate | `bun run lint` → 0 errors (14 correctness rules ON); `bun run typecheck` → clean under true strict |
| H2 | Unit layer | `bun run test` → 99/99 warning-free on the native-ESM `vitest.config.mts` (auth 19 + db-path 19 + deps 4 + validation 27 + rate-limit 20 + status 10) |
| H3 | Production build | `bun run build` → OK; route table identical to the documented session-22 one (4 static + `/_not-found` + 5 dynamic API + `/dashboard`) |
| H4 | E2E layer | `bun run test:e2e` → 43/43 (51.3s, single worker) |
| H5 | Environment | Workspace re-bootstrapped from the reset state: `bun install` (424 pkgs), `.env` recreated with `DATABASE_URL="file:../db/custom.db"` (the operator-specified value) + a GENERATED 20-char `ADMIN_PASSWORD` (never printed in any tracked file — the session-22 F1 doctrine followed from the start this session) + generated `AUTH_SECRET`, `db/` created at the repo root, `db:push` + `db:seed` green, dev server healthy (`/api/health` → `{"ok":true,"database":"up"}`); the ambient `DATABASE_URL` hijack (`file:/home/z/my-project/db/custom.db`) is ACTIVE in the shell — the npm-script `env -u` guards held through every probe |
| H6 | Credential hygiene | `git grep -F` for the live `ADMIN_PASSWORD` and `AUTH_SECRET` values → zero hits across all tracked files; the doc escaping-examples remain the obvious placeholders (`\$<your-password>`); the old session-22 literal appears only in the immutable transcripts (documented history-skip; the credential itself was rotated and 401-verified in session 22) |
| H7 | Live landing parity (desktop) | Reference vs clone at a VERIFIED 1440×900: page height **7490px both**; identical section id set (`top about services "" insurance providers contact faq` — the `""` is the differentiators band between services and insurance, untracked by `section[id]` on both); h2 `60px/63px/400` both; h3 `20px/25px/400` both; `<main>` present both; reference `<title>` still the `Base44 APP` placeholder (recorded deviation, e2e-pinned) |
| H8 | Mobile navigation (operator's key concern) | Panel geometry **byte-exact both sides** at a VERIFIED 390×844: `192×148 @ (178, 80)`, `display: grid`, radius `24px`, padding `8px`; reference paints `rgba(38,74,57,.9)`, clone computes the oklab equivalent (documented v4 format variance); 3 identical links; `aria-expanded` contract on both |
| H9 | Mobile menu behavior | Link activation closes + unmounts the panel and jumps: `#services` lands at viewport top **0.421875 on BOTH sites**, `scrollY 1837` both (same-session, same-method measurement) — identical to the pixel |
| H10 | Mobile page height | Reference 12164px vs clone 12162px after full settle — the documented 2px sub-pixel drift entirely inside the contact section (recorded honest measurement note, unchanged since session 22) |
| H11 | Tailwind v4 trap guards (live) | Canvas-rasterized dropdown paint `[38,74,57,230]` — EXACT (no bare-HSL transparency regression, trap #1); panel is a grid (trap #4 mitigation) |
| H12 | Full product loop + status transitions | login `200` + cookie → `/dashboard` `200` → public form POST `201 {ok,id}` (an off-list specialty correctly 422'd first — the allowlist derivation live-proven) → PATCH confirm `200 {status:"confirmed"}` → PATCH complete `200 {status:"completed"}` → dashboard reflects; anonymous PATCH → `401`; invalid status → `422`; unknown id → `404`; logout `200`; post-logout `/dashboard` → `307`; `dev.log` zero errors |
| H13 | Session-22 fixes | Sub-agent + orchestrator verified: every F1–F13 remediation present in the tree (placeholder doctrine, moduleSelfRoot decode, doc alignments, header.tsx rationale comment, seed F9 note, .env.example caveat, arrival-only spec title) |
| H14 | Security scans + inventory | `bun audit` → exactly the two known dev-tooling advisories (braces via eslint-config-next, deepmerge-ts via prisma) — documented and accepted; installed versions all within documented ranges (next 16.3.8, react 19.3.0, prisma 6.19.3, playwright 1.63.0, vitest 5.0.3, tailwindcss 4.3.3); `bun.lock` frozen-install clean; 20 screenshots present; `public/media/` = 7 files all referenced; `scripts/` holds only `seed.ts` (unit-pinned); deps allowlist == package.json (unit-pinned); `docs/session_23.md` operator transcript — every checkable claim matches the tree |

### 1.2 Issues found (remediation required)

All 5 findings originate from the fresh-eyes sub-agent (Task 24-a) and were
**re-verified by the orchestrator** (live probe or line-by-line read) before
acceptance; none is a regression of a documented session-2/4/6/8/10/12/14/16/18/20/22
fix. Zero Critical/High/Medium — the code, security, and parity surfaces held
under every probe shape tried. The headline is a **favicon chrome-parity gap**
(the one reference-visible surface never audited in twelve prior sessions).

| ID | Severity | Finding | Evidence |
|----|----------|---------|----------|
| F1 | **Low (doc-claim drift)** | Two residual "15 unit tests" claims for db-path in the PAD — ADR-004 Decision (PAD:139) and the §3.2 tree annotation (PAD:379) — while the tree has 19 (session-22 F10 added 4; the sibling rows §4.2/§7.1/§7.4 were fixed to 19 but ADR-004 + §3.2 were missed). The "missed-sibling-row" class this repo has hit three times before. | `rg '15 unit' Project_Architecture_Document.md` → lines 139, 379; `grep -c '^\s*it(' tests/db-path.test.ts` → **19** |
| F2 | **Low (chrome parity gap — the headline)** | **The app ships no favicon/site icon; the reference does.** `GET /favicon.ico` on the clone → 404; no `icon.*` in `public/` or `src/app/`, no `metadata.icons`, no `<link rel="icon">` in the rendered HTML. The reference serves an **inline SVG favicon** via `<link rel="icon" type="image/svg+xml">` (a heart-rate glyph in the clinic green `#264a38` with cream `#f3ead0` stroke — the Base44 platform icon), plus a `/favicon.ico` → 302 → logo.png fallback. No living doc mentions favicon/icons at all. The tab icon is the one reference-visible chrome surface never audited in 12 sessions. | Live probes: clone `curl /favicon.ico` → 404; reference HTML head → the inline SVG data-URI link tag (decoded + archived); reference `/favicon.ico` → 302 → `media.base44.com/.../adbde7e4d_logo.png` |
| F3 | **Info (script footgun)** | `db:migrate` / `db:reset` are wired (`prisma migrate dev` / `prisma migrate reset`) but non-functional in this migrations-less repo — `prisma/` holds only `schema.prisma`; `db:reset` errors ("No migration found"), `db:migrate` interactively creates a divergent history. The docs list both scripts only in the env-guard context and never flag them as inert. | `package.json:13-14` read; `ls prisma/` → schema.prisma only |
| F4 | **Info (workspace state)** | The documented "6 realistic dashboard seed rows" were not restored by this session's bootstrap (fresh `db:push` + `db:seed` only seeds the staff account) — the appointments table held only the audit's 2 probe rows before the parity loop. Not a repo defect (DB untracked), but dashboard captures would show a near-empty table, inconsistent with the documented post-reset pattern of sessions 20/22. | Read-only DB enumeration; worklog Task 24-0 |
| F5 | **Info (soft line-count drift)** | PAD §11 `scripts/seed.ts \| ~40` vs actual 47 lines (session-22's own F9 note added 7 lines; the same commit re-measured db-path.ts but not seed.ts). 17.5% drift — the §11 outlier (other rows within ~7% under the "~" convention). | `wc -l scripts/seed.ts` → 47; PAD:813 |

### 1.3 Considered and deliberately NOT remediated (doctrine)

| Item | Decision | Rationale |
|------|----------|-----------|
| Serving `/favicon.ico` (the reference's 302 → logo.png fallback) | Skip — vendor the link-tag contract instead | The tab icon comes from `<link rel="icon">` in every modern browser; the reference's `/favicon.ico` redirect is a Base44 platform artifact serving a DIFFERENT image (the app logo PNG). Vendoring `icon.svg` matches the link-tag contract (the glyph browsers actually render); the redirect fallback is a platform artifact, not design intent. Recorded honestly in the deviation entry. |
| Purging doc literals from git history | Skip (unchanged) | Never rewrite pushed main (session-16 doctrine). |
| Dropping `db:migrate`/`db:reset` from package.json | Skip — document instead (F3) | PAD §4.2 anticipates future `prisma migrate` adoption; the scripts also serve as documented examples of the env-guard pattern (ADR-010). A one-line AGENTS note removes the footgun without churning the script contract. |
| Mobile 2px contact-section drift | Skip — record as a measurement note (unchanged) | 2px in a 12164px page (0.016%), single section, sub-pixel rounding origin; documented since session 22. |
| Dashboard filtering / CSV export | Skip — future-session candidate (unchanged) | Beyond-parity surface; no operator ask this session; scope discipline. |

---

## Part 2 — Remediation Plan (TDD)

All changes land on `main` (no new branches). `skills/` stays out of
lint/typecheck/test/build. The one behavior change (F2) gets a failing test
first; the full gate re-runs after every phase.

### Phase 1 — PAD count residuals + script-footgun note (F1, F5, F3 — doc-only)

1. **F1:** PAD:139 (ADR-004 Decision) "15 unit tests" → "19 unit tests";
   PAD:379 (§3.2 tree) "← 15 unit cases" → "← 19 unit cases".
   Acceptance: `rg '15 unit' Project_Architecture_Document.md` → 0 hits.
2. **F5:** PAD §11 seed.ts row `~40` → `~47`.
3. **F3:** AGENTS.md command table gains a one-line note on the
   `db:migrate`/`db:reset` rows: placeholder scripts for the future
   `prisma migrate` adoption (PAD §4.2) — this repo is schema-first
   `db:push` + `db:seed`; `db:reset` errors without a migrations history.

### Phase 2 — Favicon chrome parity (F2) — TDD: Red first, then Green

4. **Red:** new e2e test in `tests/e2e/landing.spec.ts` (beside the
   title-deviation pin — same chrome-contract class): the document head
   MUST carry exactly one `link[rel="icon"][type="image/svg+xml"]` with a
   truthy href. Fails on the current tree (no icon link exists).
5. **Green:** vendor the reference's exact glyph as `src/app/icon.svg`
   (the Next.js App-Router file convention — auto-generates the
   `<link rel="icon">` tag with the correct type): the 32×32 heart-rate
   SVG decoded verbatim from the reference's inline data URI
   (circle `#264a38` + heart/pulse paths stroked `#f3ead0`, width 2.4).
   Acceptance: the Red test passes; `curl -s localhost:3000/ | grep
   'rel="icon"'` shows the generated link; `/icon.svg` serves 200 with
   `image/svg+xml`; the dev-server page height is unchanged (7490px —
   head-only chrome, zero layout impact); the full e2e suite stays green.
6. **Documentation (F2):** Validation Report gains a "Recorded Deviations
   Beyond CSS Parity — Favicon (Session 24)" entry beside the session-4
   title deviation (what the reference serves, what was vendored, the
   `/favicon.ico` platform-artifact skip rationale, and the e2e pin);
   PAD §10 gains a CLOSED row (found session 24 → closed by the vendored
   icon + pin); README's mobile-menu/features surface mentions the icon
   if a natural row exists (else skip — the Validation Report is the
   canonical record).

### Phase 3 — DB state restore (F4)

7. Purge the 3 probe rows (AUDIT24 Probe Alpha `cmuvmzydq…`,
   AUDIT24 Yesterday Floor `cmuvmzyec…`, Parity Loop Probe S24
   `cmuvneah0…`) via a repo Prisma temp script (the documented
   `env -u` pattern), then re-insert the 6 realistic seed rows through
   the PUBLIC API (unique XFF keys from the 198.51.112-115.x space —
   disjoint from every documented base in the six spec files) with
   statuses set via the real PATCH API (2 confirmed / 2 new /
   2 completed — double-duty live probe, the sessions-20/22 pattern).

### Phase 4 — Full verification (the TDD net)

8. `bun run lint && bun run typecheck && bun run test && bun run build &&
   bun run test:e2e` — acceptance: lint 0 under the 14 ON rules, tsc
   clean, 99/99 unit, build identical route table, e2e **44/44** (43 +
   the new icon pin) — plus the **double-run proof**: a SECOND
   consecutive `test:e2e` within the 10-min limiter window against the
   reused server must ALSO be 44/44.
9. Live re-verification on the remediated tree: `/icon.svg` 200 +
   `image/svg+xml`; the generated link tag in served HTML; parity
   spot-checks (7490px desktop both sites; mobile panel 192×148 @
   (178,80); link-click 0.421875 both); `/api/health` up.

### Phase 5 — Screenshots

10. Re-capture the 20-screenshot set into `docs/screenshots/` from the dev
    server running the remediated tree (desktop hero/sections/full, mobile
    hero/menu/services, legal pages, appointment form states, login,
    dashboard desktop/mobile — `03-desktop-full.png` must measure exactly
    1440×7490; the dashboard captures now show the restored 6 seed rows).

### Phase 6 — Session docs, commit, push

11. `docs/session_24.md`; repo `worklog.md` entries (orchestrator +
    sub-agent 24-a); SKILL.md → v2.8.3 with the [S24] change note;
    PAD [S24] revision block; `.env.example` re-verified (no env changes).
12. Conventional Commits message on `main`; push via
    `docs/ssh_git_wrapper_v3.py` per the runbook (operator key from the
    session brief; shredded after push; remote ref verified).

### Validation of this plan against the codebase (pre-execution)

- F1/F5 verified: the exact PAD lines read; counts re-derived by grep ✔
- F2 verified: live 404 on the clone, the reference's decoded SVG archived,
  the Next.js `icon.svg` file convention confirmed available (App Router
  metadata file conventions, no config needed); the landing.spec test
  placement follows the existing title-pin pattern ✔
- F3 verified: package.json:13-14 read; `prisma/` has no migrations dir ✔
- F4 verified: DB enumerated read-only; the 3 probe row ids recorded ✔
- Key-space check for the seed-restore XFF keys (198.51.112-115.x):
  disjoint from every documented base in the six spec files
  (192.0.2-7.x, 198.51.100-111.x, 203.0.113.x) ✔
- Parity safety: F1/F3/F5 are doc-only; F2 is head-only chrome (zero
  layout impact — page height pinned by the existing parity asserts);
  F4 touches only the untracked DB ✔
