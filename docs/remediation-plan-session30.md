# Remediation Plan — Session 30 (Doc-Inventory Completion, Parity Re-Verification, Gate + Screenshot Refresh)

**Date:** 2026-10-06
**Scope:** Full fresh-eyes audit of the session-28 tree (`9757e5d` + the
docs-only `249cd73` — the operator transcript that became
`docs/session_29.md`), with live re-verification against the reference site,
then remediation of the new findings. The repo `skills/` folder is excluded
from checking, testing and compilation per the operating instructions.
**Method:** `skills/code-review-and-audit` doctrine (static gates + a
fresh-eyes full review dispatched as a read-only sub-agent — every finding
re-verified by the orchestrator before acceptance), `skills/agent-browser`
live parity probes on the reference and the local clone (desktop 1440×900 +
mobile 390×844, viewport verified via `innerWidth`/`innerHeight` before every
measurement, settle-waits before height readings), `skills/tdd` doctrine —
with zero code findings this session, the 107-unit + 44-e2e green suite
stands as the characterization net and the doc fixes are verified by
structural acceptance (grep + count), the doc-change equivalent of a
regression gate.

---

## Part 1 — Audit Findings

### 1.1 Verified healthy (re-confirmed this session)

| # | Check | Evidence |
|---|-------|----------|
| H1 | Diff `9757e5d..249cd73` is docs-only | exactly `docs/session_29.md` (+82); worktree clean; only gitignored artifacts present |
| H2 | Baseline gates | lint 0 (14 correctness rules ON) · tsc clean under true strict · **107/107 unit** · build OK (identical route table: 12 routes) · **44/44 e2e × 2** (the double-run proof, 51.8s + 51.3s) — exactly the documented session-28 state |
| H3 | Session-28 F1 fix is sound | `seed-demo.ts` pure (injected clock), self-renewing dates, derived allowlists, cross-seam validity, `assertDemoRowsValid` guard; `seed.ts` demo mode opt-in (`SEED_DEMO === "1"` exact match), default byte-identical, idempotent (skip-if-exists by fullName); 8 unit cases green; **the workspace-reset class held this session: the 6 demo rows survived the reset** (dates 2026-10-08 → 2026-11-04 = self-renewing from today) |
| H4 | DB state | `db/custom.db` = 6 demo rows (2 new / 2 confirmed / 2 completed) + 1 admin — exactly documented; `db/e2e.db` = 45 rows = 5 runs × 9 rows/run (27 at session-28 end + 18 from this session's double-run proof) — the documented accumulation quirk, arithmetically perfect |
| H5 | Live desktop parity | Reference vs clone at VERIFIED 1440×900: page height **7490px both**; identical section id set (`top,about,services,insurance,providers,contact,faq`) |
| H6 | Mobile navigation (operator's key concern) | Panel geometry **byte-exact** at VERIFIED 390×844: `192×148 @ (178, 80)`, `display: grid`, radius `24px`, padding `8px`; reference paints `rgba(38,74,57,.9)`, clone computes the oklab equivalent (documented v4 format variance — the panel is a `<nav>` in both sites); link activation closes + unmounts the panel and jumps: `#services` at viewport top **0.421875**, `scrollY 1837` — IDENTICAL on both sites, same session, same method |
| H7 | Tailwind v4 trap guards (live) | Canvas-rasterized (the e2e spec's exact method): dropdown paint `[38,74,57,230]` **EXACT** (no bare-HSL transparency regression, trap #1); pill `[37,74,57,204]` — the documented ±1 oklab quantization drift inside the e2e near() tolerance; mobile page height 12162px vs reference 12164px — the documented 2px sub-pixel drift (contact section) |
| H8 | Full product loop + status transitions | anonymous `/dashboard` `307` → login `200` + cookie → `/dashboard` `200` → public form POST `201 {ok,id}` → PATCH confirm `200` → PATCH complete `200` → anonymous PATCH `401` → unknown id `404` → invalid status `422` → wrong credentials generic `401` → logout `200` → post-logout dashboard `307` — **all 12 steps correct**, under the still-active ambient `DATABASE_URL` hijack, with the write verified in `<repo>/db/custom.db` (the ADR-010 env -u guards held; the hijack target file does not exist); the off-list specialty `"Pediatrics"` correctly 422'd before the loop (the allowlist derivation live-proven — valid name is `"Pediatric care"` from content.ts); the probe row purged after (exactly the 6 seed rows remain) |
| H9 | Operator asks verified | vitest (`vitest.config.mts`) + Playwright (`playwright.config.ts`) suites present and green (re-run live this session: 107/107 + 44/44 × 2); `.env` `DATABASE_URL="file:../db/custom.db"` with `db/` at the repo root, live-proven (the product loop's write landed in the repo DB) |
| H10 | Reference site | UP and unchanged (HTTP/2 200, title "Base44 APP", 7490px desktop / 12164px mobile) |
| H11 | Scandihaven (tech-stack patterns) | Re-reviewed — same substrate doctrine (Next 16 + React 19 + TS strict + Tailwind v4 CSS-first + Vitest/Playwright); its Turborepo/Drizzle/Better-Auth patterns remain deliberate ADR-logged divergences; nothing new to import this session |
| H12 | dev.log hygiene | No hydration errors, no failed API calls, no PII in logs (only the expected probe responses: the deliberate 401/307s) |

### 1.2 Issues found (remediation required)

All 3 findings originate from the fresh-eyes sub-agent (Task 30-a, 16th
audit cycle) and were **re-verified by the orchestrator** (line-by-line file
reads + `ls src/lib` + greps) before acceptance; none is a regression of a
documented session-2/4/6/8/10/12/14/16/18/20/22/24/26/28 fix. **Zero
Critical/High/Medium** — the code, security, parity, and test surfaces held
under every probe shape tried. All 3 findings are the same class:
**file-tree inventory completeness** (a sibling of the session-16 F11 /
session-18 F11 / session-24 F1 / session-28 count-alignment class — a doc
section missed by the pass that updated its siblings).

| ID | Severity | Finding | Evidence |
|----|----------|---------|----------|
| F1 | **Info (doc-inventory gap)** | README's File Hierarchy `src/lib/` subtree lists 7 of 8 lib files (`seed-demo.ts` missing — it appears only in the Quick Start prose at L146); the `tests/*.test.ts` parenthetical lists 6 of 7 Vitest seams (`seed-demo` missing); the `scripts/seed.ts` row says only "staff account upsert" with no demo-mode note. The Quick Start, Tested row, AGENTS table, `.env.example`, and PAD §3.2 all carry the demo-seed — only this one section was missed by the session-28 count-alignment pass. | `README.md:110–123` vs `ls src/lib` (content, auth, validation, rate-limit, motion, db, db-path, **seed-demo**) and 7 `tests/*.test.ts` files; `rg seed-demo README.md` → only L51/L146 |
| F2 | **Info (doc-inventory gap)** | CLAUDE.md's File Organization `src/lib/` list omits `seed-demo.ts` (7 of 8) and its `scripts/seed.ts` row lacks the demo-mode note — while CLAUDE's own Testing section (L148–152) correctly lists the demo-seed seam with its 8 cases. Same missed-sibling class as F1. | `CLAUDE.md:64–70` vs the lib listing; `rg seed-demo CLAUDE.md` → only the unit-list hit |
| F3 | **Info (doc-inventory gap)** | SKILL.md §5's component tree omits `src/lib/motion.ts` (7 of 8 lib files). `motion.ts` ships since session-10 F7, is in the README/CLAUDE/PAD §3.2 trees, and appears in SKILL only in historical prose (L621/653/786 — Appendix B history). The session-16 F6 pass fixed this identical omission in README/CLAUDE but never swept SKILL §5; session-28 updated that tree for seed-demo and still missed it. | SKILL §5 tree read (content/auth/validation/rate-limit/db/db-path/seed-demo listed; no motion); `rg motion health-care-clinic_SKILL.md` → historical hits only; `README.md:115`, `CLAUDE.md:67`, `PAD:378` all list it |

### 1.3 Considered and deliberately NOT remediated (doctrine)

| Item | Decision | Rationale |
|------|----------|-----------|
| Quoting the e2e.db row count (45) in living docs | Skip — keep open-ended wording | The docs already say `db/e2e.db` "PERSISTS between runs … rows accumulate" — open-ended and accurate for any count; a hard number would be stale by the next run (the S26 F6 open-ended-families doctrine). Session records may quote the count as a point-in-time measurement. |
| Any code change | Skip | Zero code findings — the 16th audit found nothing to fix in `src/`, `prisma/`, `scripts/`, `tests/`, or any config; every gate and live probe is green. Inventing work would violate the audit discipline. |
| Restructuring the doc trees into a single generated index | Skip — fix the three gaps, keep hand-maintained trees | A generated tree adds a build step + a new drift class (generated-vs-reality); the honest fix is completing the three inventories and relying on the audit's doc-claim sweep to catch future drift (it just proved it catches exactly this class). |
| Re-capturing screenshots with new content | Keep the documented 20-capture refresh | The session doctrine refreshes all 20 screenshots from the remediated dev server every session (dated evidence of the verified state); the dashboards must show the 6 seed rows. |
| Historical revision-block / Appendix-B entries | Skip | Never rewrite pushed main; historical records are accurate for their sessions. |

---

## Part 2 — Remediation Plan

All changes land on `main` (no new branches). `skills/` stays out of
lint/typecheck/test/build. Zero code changes this session — the fixes are
doc-inventory completions, verified by structural acceptance (grep + count
+ the full verification gate re-run as the regression net).

### Phase 1 — F1: README File Hierarchy completion (doc-only)

1. Add the `seed-demo.ts` row to the `src/lib/` subtree of the File
   Hierarchy (after `db-path.ts`, mirroring PAD §3.2's wording: demo-row
   builder seam, unit-tested).
2. Add `seed-demo` to the `tests/*.test.ts` parenthetical (after `status`).
3. Extend the `scripts/seed.ts` row with the demo-mode note (opt-in
   `SEED_DEMO=1` — mirroring the AGENTS command-table phrasing).
4. Acceptance: `rg -n "seed-demo" README.md` matches ≥ 3 places (L51 Tested
   row, Quick Start prose, the tree row, the tests parenthetical); the
   lib tree lists 8 of 8 files; the tests parenthetical lists 7 of 7.

### Phase 2 — F2: CLAUDE.md File Organization completion (doc-only)

5. Add `seed-demo.ts` to the `src/lib/` list (after `db-path.ts`).
6. Extend the `scripts/seed.ts` row with the demo-mode note.
7. Acceptance: `rg -n "seed-demo" CLAUDE.md` matches both the File
   Organization list and the unit-list; the lib list covers 8 of 8.

### Phase 3 — F3: SKILL.md §5 tree completion (doc-only)

8. Add the `src/lib/motion.ts` row to the §5 tree (between `rate-limit.ts`
   and `db.ts` — mirroring the file's actual role line: reduced-motion-aware
   scroll behavior).
9. Acceptance: the §5 tree lists 8 of 8 lib files; `rg -n "motion.ts"
   health-care-clinic_SKILL.md` hits the tree (not just Appendix B history).

### Phase 4 — Full verification gate (the regression net)

10. `bun run lint && bun run typecheck && bun run test && bun run build &&
    bun run test:e2e` — acceptance: lint 0 under the 14 ON rules, tsc
    clean, **107/107 unit**, build identical route table, e2e **44/44**
    plus the **double-run proof** (a SECOND consecutive `test:e2e` within
    the 10-min limiter window must ALSO be 44/44). Doc-only changes cannot
    move these — the re-run proves it.

### Phase 5 — Screenshots refresh

11. Re-capture all 20 screenshots in one scripted Playwright pass from the
    remediated dev server (the hardened session-26/28 patterns: viewport
    set before goto, settle-waits, per-run XFF key injection on browser
    POSTs via `page.route`, hash-nav form remount fix [reload after the
    success state], native-validation-aware field-error path, dashboard
    via real login, legal pages guarded on `<main>`); dashboards must show
    the 6 seed rows; 03-desktop-full exactly 1440×7490; the capture's
    submission row purged after (6 seed rows retained).

### Phase 6 — Session docs + alignment pass

12. `docs/session_30.md` (the session record), this plan file, the repo
    `worklog.md` orchestrator entry (+ the 30-a sub-agent entry already
    appended to the workspace worklog), SKILL.md → v2.8.6 (§5 tree fix +
    frontmatter `last_updated` + Appendix B [S30] entry + the sessions list
    in the description), PAD `[S30]` revision block, README/CLAUDE fixes
    from Phases 1–2. No count changes anywhere (107 unit / 44 e2e
    unchanged). `.env.example` re-verified against the codebase (include in
    the commit — unchanged this session, audit-verified matching).

### Phase 7 — Commit + push

13. Secret scan (`git grep` for the live credentials — 0 hits expected),
    `git add` the remediated tree (NEVER `.env`, `db/*.db`, logs),
    Conventional Commit on `main`, push via `docs/ssh_git_wrapper_v3.py`
    (runbook: `docs/how-to-git-push-using-ssh-wrapper_SKILL.md` — dry-run
    first, explicit `--remote`, remote ref verified == local HEAD,
    operator key shredded after).
