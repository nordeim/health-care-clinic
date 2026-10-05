# Remediation Plan — Session 28 (Demo-Seed Root-Cause Closure, Screenshot Index Gap, Lock Metadata, Parity Re-Verification)

**Date:** 2026-10-06
**Scope:** Full fresh-eyes audit of the session-26 tree (`2dc105e` + the
docs-only `7357ea1` — the operator transcript that became
`docs/session_27.md`), with live re-verification against the reference site,
then remediation of the new findings. The repo `skills/` folder is excluded
from checking, testing and compilation per the operating instructions.
**Method:** `skills/code-review-and-audit` doctrine (static gates + a
fresh-eyes full review dispatched as a read-only sub-agent — every finding
re-verified empirically or line-by-line by the orchestrator before
acceptance), `skills/agent-browser` live parity probes on the reference and
the local clone (desktop 1440×900 + mobile 390×844, viewport verified via
`innerWidth`/`innerHeight` before every measurement, settle-waits before
height readings), `skills/tdd` doctrine — the green 99-unit + 44-e2e suite
is the characterization net; the new seam (F1) gets a Red-first unit layer
before the implementation lands.

---

## Part 1 — Audit Findings

### 1.1 Verified healthy (re-confirmed this session)

| # | Check | Evidence |
|---|-------|----------|
| H1 | Diff `2dc105e..7357ea1` is docs-only | exactly `docs/session_27.md` (+74); worktree clean; only gitignored artifacts present |
| H2 | Baseline gates | lint 0 (14 correctness rules ON) · tsc clean under true strict · **99/99 unit** · build OK (identical route table) · **44/44 e2e** (53.1s) — exactly the documented session-26 state |
| H3 | Session-26 F4 fix is sound | `futureYear = getFullYear()+1` makes rollover targets always future → only the round-trip branch can reject; asserted message matches `validation.ts`'s shared branch message; live-proven (`${FY}-02-31` → 422 with the field map) |
| H4 | PAD §7.1 per-spec counts + §11 line counts | all rows correct (7/13/10/3/9/2 = 44 e2e; 19/19/4/27/20/10 = 99 unit; §11 within the `~` convention, Validation Report 361 exact) |
| H5 | e2e scratch DB state | `db/e2e.db` = the documented healthy 9-row post-run state (7 new + 2 completed) |
| H6 | Screenshots | all 20 PNGs present, non-empty, correct dimensions (03-desktop-full exactly 1440×7490) |
| H7 | bun.lock ↔ package.json | in sync (17 direct deps; lock byte-unchanged by this session's `bun install`) — except the F3 cosmetic name field |
| H8 | Config drift | playwright/vitest/tsconfig/eslint all still exclude `skills/`; unit/e2e double-pickup structurally impossible |
| H9 | Log hygiene | dev.log/server.log gitignored, no tracked logs |
| H10 | Reference site | UP and unchanged (HTTP/2 200, title "Base44 APP") |
| H11 | Live desktop parity | Reference vs clone at a VERIFIED 1440×900: page height **7490px both**; h2 `60px/63px/400` both; h3 `20px/25px/400` both; identical section id set (`top,about,services,insurance,providers,contact,faq`) |
| H12 | Mobile navigation (operator's key concern) | Panel geometry **byte-exact** at a VERIFIED 390×844: `192×148 @ (178, 80)`, `display: grid`, radius `24px`, padding `8px`; reference paints `rgba(38,74,57,.9)`, clone computes the oklab equivalent (documented v4 format variance); link activation closes + unmounts the panel and jumps: `#services` at viewport top **0.421875**, `scrollY 1837` — identical to the documented reference measurement |
| H13 | Tailwind v4 trap guards (live) | Canvas-rasterized (the e2e spec's exact method): dropdown paint `[38,74,57,230]` **EXACT** (no bare-HSL transparency regression, trap #1); pill `[37,74,57,204]` — the documented ±1 oklab quantization drift inside the e2e near() tolerance; mobile page height 12162px vs reference 12164px — the documented 2px sub-pixel drift (contact section) |
| H14 | Full product loop + status transitions | login `200` + cookie → `/dashboard` `200` → anonymous `/dashboard` `307` → public form POST `201 {ok,id}` → PATCH confirm `200 confirmed` → PATCH complete `200 completed` → anonymous PATCH `401` → unknown id `404` → invalid status `422` → logout `200` → post-logout dashboard `307` → wrong credentials generic `401` — under the still-active ambient `DATABASE_URL` hijack, with the write landing in `<repo>/db/custom.db` (the ADR-010 env -u guards held) |
| H15 | Scandihaven (tech-stack patterns) | Re-cloned and reviewed — same substrate doctrine (Next 16 + React 19 + TS strict + Tailwind v4 CSS-first + Vitest/Playwright); its Turborepo/Drizzle/Better-Auth patterns are deliberate ADR-logged divergences; its idempotent-seed doctrine (natural-key upserts) is the pattern the F1 fix adopts for the demo seeder |
| H16 | Operator asks verified | vitest (`vitest.config.mts`) + Playwright (`playwright.config.ts`) suites present and green; `.env` `DATABASE_URL="file:../db/custom.db"` with `db/` at the repo root; the db-path resolution contract live-proven (writes land in the repo DB) |

### 1.2 Issues found (remediation required)

All 3 findings originate from the fresh-eyes sub-agent (Task 28-a) and were
**re-verified by the orchestrator** (read-only DB probe, grep, file read)
before acceptance; none is a regression of a documented
session-2/4/6/8/10/12/14/16/18/20/22/24/26 fix. Zero Critical/High/Medium —
the code, security, and parity surfaces held under every probe shape tried.

| ID | Severity | Finding | Evidence |
|----|----------|---------|----------|
| F1 | **Low (workspace state, 4th recurrence of a documented class)** | The 6 documented dashboard seed rows (2 confirmed / 2 new / 2 completed) are absent again — `db/custom.db` holds 0 appointment rows (1 admin), so the live dashboard renders the empty state while committed screenshots 12/13/15 show 6 rows. The class has now recurred 4× (S20, S24, S26, S28) — the S26 plan §1.3 "restore through the public API" doctrine treats the symptom every session at a recurring audit-finding cost. | read-only `bun:sqlite` probe: appointments 0 / admin_users 1; `grep -rn "06-mobile"` etc.; screenshots unchanged since `2dc105e` |
| F2 | **Info (doc-index gap)** | README's Screenshots table links 19 of the 20 committed PNGs — `06-mobile-services.png` is referenced by no living doc. | `README.md:213–220` table vs `ls docs/screenshots/` (20 files); `grep -rn "06-mobile" --include="*.md"` → 0 hits |
| F3 | **Info (cosmetic lock metadata)** | `bun.lock`'s root workspace entry still carries the pre-clone scaffold name `"orbital"` while package.json says `"health-care-clinic"` (session-6 renamed package.json; bun keeps the field byte-stable across installs). Zero functional impact. | `bun.lock` line 5 (`"name": "orbital"`) vs `package.json` (`"name": "health-care-clinic"`) |

### 1.3 Considered and deliberately NOT remediated (doctrine)

| Item | Decision | Rationale |
|------|----------|-----------|
| Demo rows baked into the seed DEFAULT (always-on) | Skip — opt-in flag instead | DEPLOYMENT.md §4 instructs `db:seed` in PRODUCTION; default-on demo rows would ship fake patient rows into production databases. The opt-in flag keeps the documented staff-upsert contract unchanged for production while making the dev demo state a one-command, documented restore. |
| A separate `scripts/seed-demo.ts` | Skip — extend `scripts/seed.ts` | `tests/deps.test.ts` pins `scripts/ = ["seed.ts"]` exactly; a second script churns the dependency contract for no gain. The flag keeps the pin byte-stable. |
| Restoring through the public API a 4th time (the S26 doctrine) | Skip — the 4th recurrence proves the doctrine doesn't hold | The public-API restore doubles as a live product-loop probe — but this session's parity loop ALREADY probes the full write path independently (H14). Keeping the manual restore would guarantee a 5th recurrence at session 30; the root cause is that the documented demo state is not reproducible by bootstrap. |
| Purging + rewriting historical worklog/session records that describe the public-API restore method | Skip | Historical records are accurate for their sessions (never rewrite pushed main); the new mechanism is documented forward. |
| Re-capturing screenshots to show the EMPTY dashboard instead | Skip | An empty dashboard is a worse demonstration of the product (stats cards, status badges, table geometry all need data); the repo's documented state values the realistic demo. |

---

## Part 2 — Remediation Plan (TDD)

All changes land on `main` (no new branches). `skills/` stays out of
lint/typecheck/test/build. The new seam (F1) gets a Red-first unit layer.

### Phase 1 — F1: demo-seed mode — the root-cause closure (TDD)

1. **New pure seam `src/lib/seed-demo.ts`** — `buildDemoAppointments(now)`:
   6 rows (Maria Sanchez, James Okafor, Elena Petrova, David Thompson,
   Aisha Rahman, Robert Klein), statuses 2 new / 2 confirmed / 2 completed,
   specialties chosen from the SAME `services` list the API allowlist
   derives from (`APPOINTMENT_SPECIALTIES`), `preferredDate` values
   **self-renewing** — computed from `now + offsetDays` (3/7/10/14/21/30)
   so the demo state can never erode with the calendar (the session-26 F4
   doctrine applied to seed data), fields shaped to the validation
   contract (fullName 3–120, phone 7–32, email ≤ 254 + `EMAIL_PATTERN`).
2. **RED first:** write `tests/seed-demo.test.ts` BEFORE the seam —
   acceptance: the suite fails on the missing module; then the
   implementation makes it green. Assertions: exactly 6 rows; 2/2/2
   status split; every specialty ∈ `APPOINTMENT_SPECIALTIES`; every
   `preferredDate` is `now + offsetDays` (deterministic, pure); every row
   passes `validateAppointmentPayload` end-to-end (the cross-seam
   guarantee: demo rows are valid API payloads by construction — they
   would 201 through the public API); fixed `now` → deterministic output
   (pure function, no clock reads).
3. **Extend `scripts/seed.ts` with the opt-in demo mode:**
   `--demo` argv or `SEED_DEMO=1` env (both supported; the env form is
   canonical — identical under bun/npm runners). Default behavior
   byte-identical (staff upsert only — production-safe). Demo mode:
   after the staff upsert, insert each missing row (idempotent — a row
   whose `fullName` already exists is skipped untouched, so re-runs never
   duplicate and never clobber real status transitions made via the
   dashboard); print a created/skipped summary.
4. **Restore the documented state for real:** `SEED_DEMO=1 bun run
   db:seed` → 6 rows; verify via read-only DB probe + authenticated
   dashboard HTML.
5. **Docs (5 living surfaces):** README Quick Start (optional demo step
   + note), AGENTS command table (db:seed row gains the flag note),
   `.env.example` (the seed section gains the demo-mode note),
   `docs/DEPLOYMENT.md` (§4 gains a "demo rows are opt-in — production
   seeding never creates them" line), PAD §9.1 + revision block, SKILL §3
   + project_state + Appendix B.
6. Acceptance: unit suite 99 → 105+ (the new file's cases); the default
   `bun run db:seed` run creates NO appointment rows (regression-safe);
   `SEED_DEMO=1` twice in a row → second run creates 0, skips 6
   (idempotent); deps pin untouched (`scripts/` = `seed.ts`).

### Phase 2 — F2: README screenshot index (doc-only)

7. Add the `06-mobile-services.png` row to the README Screenshots table
   (mobile views group). Acceptance: `grep -n "06-mobile" README.md`
   matches; all 20 committed PNGs referenced.

### Phase 3 — F3: bun.lock workspace name (cosmetic metadata)

8. Edit `bun.lock`'s root workspace `"name"`: `orbital` →
   `health-care-clinic`; then `bun install` — acceptance: the install
   reports no changes (the lock stays canonical; the name field is the
   only diff); the full gate still passes afterwards.

### Phase 4 — Full verification (the TDD net)

9. `bun run lint && bun run typecheck && bun run test && bun run build &&
   bun run test:e2e` — acceptance: lint 0 under the 14 ON rules, tsc
   clean, unit green at the new count, build identical route table, e2e
   **44/44** — plus the **double-run proof**: a SECOND consecutive
   `test:e2e` within the 10-min limiter window must ALSO be 44/44.
10. Live re-verification on the remediated tree: parity spot-checks
    (7490px; mobile panel + link-click identical; rasterized trap
    guards), the product loop green under the still-active ambient
    `DATABASE_URL` hijack, the dashboard rendering the restored 6 seed
    rows (HTML-verified).

### Phase 5 — DB state hygiene + screenshots

11. Purge the parity-loop probe row ("Parity Loop Probe S28") — the
    documented one-off pattern (a throwaway script OUTSIDE the repo's
    `scripts/` contract), leaving exactly the 6 seed rows.
12. Re-capture all 20 screenshots in one scripted Playwright pass from
    the remediated dev server (the hardened session-26 patterns:
    viewport set before goto, settle-waits, per-run XFF key injection on
    browser POSTs via `page.route`, hash-nav form remount fix — reload
    after the success state, native-validation-aware field-error path,
    dashboard via real login, legal pages guarded on `<main>`);
    dashboards must show the 6 restored seed rows; 03-desktop-full
    exactly 1440×7490.

### Phase 6 — Session docs + alignment pass

13. `docs/session_28.md` (the session record), this plan file, the repo
    `worklog.md` orchestrator entry (+ the 28-a sub-agent entry already
    appended), SKILL.md → v2.8.5 (frontmatter project_state, §3 demo
    mode, Appendix B [S28]), PAD `[S28]` revision block, README/AGENTS/
    .env.example/DEPLOYMENT updates from Phase 1. `.env.example`
    re-verified against the codebase (include in the commit).
14. Count-alignment pass: every live unit-count reference (99 → the new
    total) updated across README/AGENTS/CLAUDE×2/PAD×3/SKILL; historical
    revision-block/Appendix-B entries deliberately untouched.

### Phase 7 — Commit + push

15. Secret scan (`git grep` for the generated credentials — 0 hits
    expected), `git add` the remediated tree (NEVER `.env`, `db/*.db`,
    logs), Conventional Commit on `main`, push via
    `docs/ssh_git_wrapper_v3.py` (runbook:
    `docs/how-to-git-push-using-ssh-wrapper_SKILL.md` — dry-run first,
    explicit `--remote`, remote ref verified == local HEAD, operator key
    shredded after).
