# Session 40 — 21st Audit Cycle, Live-Site Verification, BAKED_ORIGIN Coupling Closure, Live-Secret Redaction, Repo Hygiene

Continuation of `docs/session_38.md` / `docs/session_39.md`. Scope: fresh
clone (the workspace was reset — `git clone` → `a4109d5` = session-38 tree
`89a2046` + the docs-only operator pastes `docs/session_39.md` +
`docs/start_server_log.txt`) → review docs + session logs (38 + 39 +
remediation-plan-session38 + worklog + start_server_log) → validate
understanding against the codebase → verify the LIVE production deployment
(`https://family-clinic.jesspete.shop` — the first session run against it)
→ re-audit with live parity verification on all three sites → remediate the
findings → re-verify → document → push. The repo `skills/` folder stayed
excluded from checking, testing and compilation throughout.

## What was audited

- Workspace re-bootstrapped from reset: `.env` per the operator spec
  (`DATABASE_URL="file:../db/custom.db"`,
  `NEXT_PUBLIC_SITE_URL=https://family-clinic.jesspete.shop`, the
  operator's `AUTH_SECRET`/`ADMIN_EMAIL`/`ADMIN_PASSWORD`),
  `bun install` (424 pkgs), `db:push` + `db:seed` + `SEED_DEMO=1` →
  exactly 6 demo rows (2/2/2) + 1 admin at `<repo>/db/custom.db`. The
  ambient `DATABASE_URL` hijack (`file:/home/z/my-project/db/custom.db`)
  is ACTIVE — the ADR-010 `env -u` guards held all session (the
  operator's `db/`-at-repo-root instruction is satisfied by the tested
  db-path contract; `db/custom.db` lives at the repo root).
- Read AGENTS.md (12 rules), CLAUDE.md, README.md,
  Project_Architecture_Document.md, health-care-clinic_SKILL.md (v2.9.0),
  docs/session_38.md, docs/remediation-plan-session38.md, worklog.md,
  docs/session_39.md, docs/start_server_log.txt — then validated the
  claims against the tree (all state markers matched session-38 exactly).
- Operator asks re-verified live: the vitest + playwright suites are
  present and green (`vitest.config.mts` + `playwright.config.ts` +
  `tests/` — carried since the early sessions; `.env` correct;
  `.env.example` ↔ codebase exact — no new env vars this session).
- Baseline gates with the dev-default origin: lint 0 (14 rules ON) / tsc
  true-strict / 166/166 unit / build 14-route table / 63/63 e2e — exactly
  as documented. **Under the operator's production `.env` the e2e suite
  failed exactly 5/63** — the documented session-34 A4 `BAKED_ORIGIN`
  coupling, triggered for real by a production-baked artifact (finding
  F1 below).
- Scandihaven (tech-stack patterns repo) re-cloned + re-checked —
  unchanged at `d4789c3` (same substrate doctrine, nothing new to
  import).
- A fresh-eyes full review dispatched as a read-only sub-agent (Task
  40-a, 21st cycle) — every finding re-verified by the orchestrator
  (file:line + quoted evidence) before acceptance.

## The 21st audit (Task 40-a) — findings

**1 Critical + 1 High + 1 Medium + 1 Low + 5 Info — the first Critical in
21 cycles, and it came from an OPERATOR commit that bypassed the
SSH-wrapper gate discipline (the repo's own code and tests are
blameless):**

- **A1 (Critical)** `docs/start_server_log.txt:3-7` — an operator paste
  of the LIVE `.env` (`grep -v '^#' .env`) in commit `a4109d5` — pushed
  to the public remote — contains the production `AUTH_SECRET` (64-hex,
  byte-identical to the operator-provided live value), the live origin,
  and the staff credentials. With the session-signing HMAC key public,
  anyone can forge a staff session cookie and read the dashboard + CSV
  export (patient PII) until rotated.
- **F1 (High)** `tests/e2e/seo.spec.ts:16` hardcodes
  `BAKED_ORIGIN = "http://localhost:3000"` → exactly 5/63 e2e failures
  under the production-baked build (robots `Sitemap:` pin, sitemap
  `<loc>` pin, landing + legal canonicals ×2). Hidden hazard: at :66 the
  mismatched `loc.replace(BAKED_ORIGIN, "")` is a no-op, so the
  loc-parity test silently fetches the LIVE production origin — an
  external-network false-green.
- **A2 (Medium)** stray root `package-lock.json` (8,349 lines) committed
  in a bun-locked repo (same operator commit `a4109d5`) — dual-lockfile
  resolution drift, absent from every doc inventory. The working tree
  also carried a 30-line `bun.lock` re-sync (the operator's
  `package.json` range bump had left the lockfile stale since
  session-28; root-block mirror only, zero resolution changes).
- **A3 (Low)** `.gitignore` covers `db/*.db-journal` but not the WAL
  sidecars (`db/*.db-wal` / `db/*.db-shm`).
- **A4 (Info)** README's Architecture-table e2e row omits the `seo` +
  `dashboard-filters` specs (the unit row had the same drift class —
  missing four seams).
- **A5 (Info)** PAD §11 line estimates drifted for three rows (auth
  ~263→283, mobile-nav ~170→178, seo ~150→160).
- **A6 (Info)** the dashboard parses `searchParams` before the session
  guard — pure seam, no DB read, invariant (d) intact; recorded so a
  future reader doesn't re-flag it.
- **A7 (Info)** `space-y-10` in the legal shell is SAFE under v4 trap #4
  (direct children carry no `mt-*`/`mb-*`).
- **A8 (Info)** eslint ignores carry nonexistent sandbox dirs — left
  as-is (defensive outside this checkout), documented.

All six documented invariants re-verified HEALTHY at file:line precision;
doc-alignment verdict ALIGNED (the 166/63 counts, trees, and sessions
34-38 code exact — zero contract drift between the dashboard page and the
export route).

## Live-site + parity verification (before remediation)

- **LIVE site (`https://family-clinic.jesspete.shop`)**: every route
  healthy (`/` 200, `/api/health` `{"ok":true,"database":"up"}`,
  robots/sitemap 200, `/login` 200, anon `/dashboard` 307, legal pages
  200); the production origin correctly baked in canonical/OG/robots/
  sitemap; **the 12-step product loop 16/16 GREEN ON THE LIVE SITE**
  (anon 307 → login 200 + httpOnly → authed 200 → public POST 201 →
  PATCH confirmed → PATCH completed → anon PATCH 401 → 404 → 422 → CSV
  export 200 with the UTF-8 BOM + probe row present → wrong-creds 401 →
  logout 200 → post-logout 307). One clearly-labeled probe row ("Live
  Verification Probe Safe To Delete", completed) remains in the live DB
  for operator deletion — the API has no DELETE by design. (First-run
  probe FAILs were methodology errors: an off-allowlist specialty — the
  422 was CORRECT behavior — and a missing `xxd`; fixed and re-run.)
- **Parity (agent-browser, viewport set + verified before every
  measurement, settle-waits)**: reference desktop 1440×900 height
  **7490px exact** / 7/7 section ids / 7 h2s byte-identical (incl. the
  "thewhole you." quirk); LIVE site identical; local clone identical.
  Mobile 390×844: panel **192×148 @ (178,80), grid, radius 24px, padding
  8px** — IDENTICAL on all three sites; link-click → panel closes AND
  unmounts (nav 3→2) + `scrollY` 1837 + services-at-viewport-top 0.0005
  — IDENTICAL on all three. Mobile heights 12164 (reference) vs 12162
  (live + clone) — the documented 2px contact drift. **Mobile navigation
  works correctly everywhere — NO Tailwind v4 bug (the seventh
  consecutive session to confirm).** Route table: the live site is a
  SUPERSET of the reference (its 3 routes + `/login` + guarded
  `/dashboard` + `robots.txt` + `sitemap.xml` + `/api/*`).

## Remediation (TDD-first, `docs/remediation-plan-session40.md`)

- **Track A — BAKED_ORIGIN derivation (F1):** RED was the live 5/63
  failure set (the existing pins ARE the proof). GREEN: the spec derives
  `BAKED_ORIGIN` from the SAME sources the build resolves with the SAME
  precedence — ambient `NEXT_PUBLIC_SITE_URL` → repo `.env` fs-parse
  (anchored on `process.cwd()` per the documented global-setup CJS
  precedent) → the `siteUrl()` dev default. 63/63 proven under the
  production build; the loc-parity test fetches only the local e2e
  server again.
- **Track B — secret redaction + guard (A1):** RED — the new
  `tests/secrets.test.ts` (3 pins: no 64-hex runs in doc surfaces,
  AUTH_SECRET empty-or-marker only, ADMIN_PASSWORD placeholders only)
  failed exactly the A1 violations (the RED run also caught two
  test-design false-positive classes — markdown backtick mentions and
  the `\$`-escaped doc examples — fixed while the leak stayed failing).
  GREEN: `docs/start_server_log.txt` redacted (the log's instructional
  value preserved). Operator advisories documented: rotate the live
  `AUTH_SECRET` + `ADMIN_PASSWORD` (PAD §10 HIGH row); a history purge
  is a deliberate operator decision NOT taken autonomously. Unit 166 →
  169.
- **Track C — repo hygiene (A2/A3):** root `package-lock.json` removed
  (bun-locked repo); `bun.lock` re-sync committed (restores package.json
  ↔ lockfile consistency); `.gitignore` + `db/*.db-wal` + `db/*.db-shm`.
- **Track D — doc residuals (A4/A5):** README Architecture rows
  completed; PAD §11 re-measured (auth 283 / mobile-nav 178 / seo 160).

## Post-remediation verification

- **Full gate UNDER THE PRODUCTION `.env`** (the meaningful config for
  the derivation proof): lint 0 / tsc true-strict / **169/169 unit** /
  build OK (the 14-route table unchanged) / **63/63 e2e × 2 consecutive
  runs (the double-run proof)**.
- **Live parity re-verification on the remediated tree** (no rendered
  surface changed — Tracks A-D are test/docs/config only): desktop
  7490px unchanged; mobile panel 192×148 @ (178,80) identical;
  link-click close+unmount + scrollY 1837 identical.
- **Local 12-step product loop re-run green (16/16)** on the remediated
  dev server; probe row purged (6 seed rows + 1 admin retained).
- **20 screenshots re-captured** from the remediated dev server in one
  scripted pass (per-run XFF base `198.51.133.<pid>` / re-capture
  `198.51.134.<pid>` — disjoint from every documented base);
  03-desktop-full exactly 1440×7490; the dashboards captured with the
  clean 6-seed-row DB (the flow captures' submission row purged after —
  the first pass's success/error captures had clicked the hero "Book a
  visit" CTA through a too-loose button regex, caught by the dev.log
  POST count vs DB state cross-check and RE-CAPTURED with the exact
  "Request my visit" locator); 15-dashboard-mobile-390-full 390×1440
  (content-dependent height).
- dev.log clean (no hydration errors, no failed API calls, no PII).

## Documentation alignment

SKILL.md → v2.9.1 (frontmatter project_state + sessions list + §11 gate
counts + §12 checklist note + Appendix B [S40]) · PAD ([S40] revision
block + ADR-011 Consequences session-40 extension (the A4 coupling
closed) + §3.2 tree row + §7.1 distribution + §7.3/§7.4 gate counts +
§10 HIGH operator-action row for A1 + §11 re-measured rows) · README
(Tested row 169 + the secrets-guard and BAKED_ORIGIN notes + Architecture
rows + tree + Testing seam list) · AGENTS (rule 11 A4-closed note +
Testing-quirks secrets-pin note) · CLAUDE (secrets seam + 169 VERIFY) ·
`.env.example` re-verified unchanged (no new env vars; tracked in the
commit).

## Outcome

Committed on `main` and pushed via `docs/ssh_git_wrapper_v3.py`
(runbook: `docs/how-to-git-push-using-ssh-wrapper_SKILL.md`); the
operator key was shredded after the push and the remote ref verified
equal to local HEAD.

**Operator advisories carried in the docs (outside the code's reach):**
(1) rotate the live `AUTH_SECRET` and change the `ADMIN_PASSWORD` on the
server (PAD §10) — the leaked history blob stays on the remote until a
purge decision; (2) delete the labeled probe row from the live dashboard
DB when convenient; (3) the A2/A3 hygiene decisions (npm lockfile
removal, WAL ignores) are recorded in the remediation plan.

**Suggested next steps** (recorded for a future session; the PAD §10
backlog carries the A1 rotation residual): a paginated query layer if
volumes outgrow the latest-100 window; revisit JSON-LD structured data
if real clinic NAP data ever replaces the placeholder parity copy.
