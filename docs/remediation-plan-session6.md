# Remediation Plan — Session 6 (Scaffold Cleanup & Hygiene Audit)

**Date:** 2026-10-05
**Scope:** Full re-audit of the session-4 remediated tree (`265ab71`…`9092858`;
the latter is docs-only — the transcript paste that became `docs/session_5.md`)
with live re-verification against the reference site, plus remediation of the
scaffold-hygiene findings. The repo `skills/` folder is excluded from checking,
testing and compilation per the operating instructions.
**Method:** `skills/code-review-and-audit` native-CLI fallback pipeline
(static gates + security scan + manual review), `skills/agent-browser` for live
parity probes on both the reference and the local clone (desktop 1440×900 +
mobile 390×844), `skills/tdd` doctrine — the existing 29-unit + 28-e2e green
suite is the characterization net every removal must keep green.

---

## Part 1 — Audit Findings

### 1.1 Verified healthy (re-confirmed this session)

| # | Check | Evidence |
|---|-------|----------|
| H1 | Lint gate | `bun run lint` → 0 errors |
| H2 | Type gate | `bun run typecheck` → clean (TS strict) |
| H3 | Unit layer | `bun run test` → 29/29 (db-path 15 + auth 14) |
| H4 | Production build | `bun run build` → OK; routes `/`, `/login`, `/privacy-policy`, `/accessibility-statement` static; `/api/*`, `/dashboard` dynamic — identical to the documented route table |
| H5 | E2E layer | `bun run test:e2e` → 28/28 (5 spec files, single worker, scratch `db/e2e.db`) |
| H6 | Live landing parity | Reference vs clone at 1440×900: page height **7490px both**; h2 `60px` both; h3 `20px` both; reference `<title>` remains the `Base44 APP` placeholder (recorded deviation, e2e-pinned) |
| H7 | **Mobile navigation (operator's key concern)** | Panel geometry **byte-exact both sides**: `192×148 @ top 80 / right 370`, `display: grid`, radius `24px`, padding `8px`, paint `rgba(38,74,57,.9)` (clone computes the equivalent `oklab(...)` string — documented v4 format variance; the e2e suite rasterizes the pixel); trigger ARIA contract + label swap on both; 3 links both |
| H8 | Mobile menu behavior | Link activation closes + jumps: `#services` lands at viewport top **0.421875 on BOTH sites** (measured in the same session, identical to the last decimal) |
| H9 | Env determinism | Shell carried an ACTIVE ambient `DATABASE_URL=file:/home/z/my-project/db/custom.db` (parent-dir `.env`); `POST /api/appointments` → `201` → row verified in `<repo>/db/custom.db` via Prisma client (`Session5 Parity Probe`) — the `env -u` guards held under the exact threat they exist for |
| H10 | Staff auth loop | Browser login with the operator credentials → `/dashboard`: stats cards (Total 3 / New today 3 / Upcoming 1 / Top specialty) + latest-100 table renders the new row |
| H11 | Runtime hygiene | Zero page errors, zero console errors, zero hydration errors on landing/login/dashboard; `GET /api/health` → `{"ok":true,"database":"up"}` |
| H12 | Reference route table | `https://health-care-clinic.base44.app/login` → the Base44 platform 404 page ("The page 'login' could not be found"); `docs/health-care-clinic-dashboard.png` → 404 on GitHub raw. The reference still has NO login/dashboard — ADR-009 remains the correct fulfillment |
| H13 | Environment | `.env` = `DATABASE_URL="file:../db/custom.db"` + operator credentials + `AUTH_SECRET` (operator spec); `.env.example` matches the codebase (all five variables real); `db/` at repo root with `custom.db` + `e2e.db` |
| H14 | Recent-change review | `9092858` adds only `docs/session_5.md` (95 lines, operator transcript paste) — zero code delta vs the audited `265ab71` |

### 1.2 Issues found (remediation required)

| ID | Severity | Finding | Evidence |
|----|----------|---------|----------|
| F1 | **High (repo hygiene)** | **14 scaffold-era scripts from the predecessor project are tracked in `scripts/`.** They predate the clinic clone (commit `5384a0c "add tests"`, the ORBITAL/project-management-app era) and reference paths that do not exist in this repo (`/home/z/my-project/project-management`, ORBITAL screenshots, a tutor-era wizard). Session 1's rebuild removed the old e2e specs (`goals.spec.ts`, `auth.setup.ts`, `helpers.ts`) but left `scripts/` untouched. Zero references from any doc, config, or test; the documented file hierarchy (README, PAD) lists `scripts/seed.ts` only. `vlm-sanity.mjs` is additionally the sole importer of `z-ai-web-dev-sdk`. | `git ls-files scripts/` → 15 files; `git show 5384a0c --stat`; `grep` of docs/config/tests → 0 refs; script headers reference ORBITAL + nonexistent roots |
| F2 | **Medium (dependency hygiene)** | **15 unused dependencies + a dead shadcn config.** A full import inventory of `src/`, `tests/`, `scripts/seed.ts` shows the application imports only: next, react, react-dom, lucide-react, @prisma/client, @playwright/test, vitest (+ node built-ins). Unused runtime deps: 8× `@radix-ui/react-*` (alert-dialog, dialog, label, popover, radio-group, select, slot, toast), `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss-animate`, `zustand`, `z-ai-web-dev-sdk` (dead script only); unused dev dep: `tw-animate-css` (never `@import`ed in `globals.css`). `components.json` (shadcn new-york config) aliases `@/lib/utils`, `@/components/ui`, `@/hooks` — none of which exist; the documented doctrine is hand-built components with Lucide icons only. Dead deps inflate install surface and audit exposure for zero function. | Import scan (see Part 2 note); `grep -c` per package → 0; `ls src/lib src/hooks src/components/ui` → absent |
| F3 | **Medium (doctrine violation)** | **Committed ssh shims violate the repo's own runbook.** `docs/ssh.sh` and `docs/ssh-wrapper.sh` (near-duplicates; `ssh.sh` carries the fuller stderr/final-drain loop) are paramiko ssh shims checked into the repo, while the push runbook states explicitly: "Never commit the shim either — the paramiko ssh shim is environment infrastructure, not repo content." The canonical source lives in the runbook's Appendix A; the executable shim lives in the environment (`/home/z/my-project/bin/ssh`). | `docs/how-to-git-push-using-ssh-wrapper_SKILL.md:27`; `diff docs/ssh.sh docs/ssh-wrapper.sh` (near-identical) |
| F4 | **Info (accepted risk, re-verified)** | `bun audit` still reports the two known dev-tooling advisories (`braces` via eslint-config-next; `deepmerge-ts` via prisma) — both remain unfixable upstream (npm's latest `braces` IS 3.0.3; prisma pins `deepmerge-ts <8`). Build/dev-time toolchains only; zero runtime exposure for the standalone server. Re-documented as accepted risk. | `bun audit` output this session |
| F5 | **Info** | Session bookkeeping: this session needs its log (`docs/session_6.md` — the odd-numbered files are operator transcript pastes, so the agent's structured log takes the next even number), a `worklog.md` entry, the SKILL.md validation-history append + version bump, and refreshed screenshots post-cleanup. | Repo convention (sessions 2/4 produced even-numbered logs + plans) |

### 1.3 Not-a-finding (explicitly re-checked, no action)

- The reference site is unchanged since session 4: same title placeholder, same
  7490px height, same mobile panel contract, same 404 on `/login`. No new
  reference-side drift to absorb.
- `vitest.config.ts` + `playwright.config.ts` remain structurally correct
  (verified by green runs) — the "add vitest and playwright" instruction is
  satisfied by maintenance, not addition.
- `.env.example` matches the codebase; `db/` sits at the repo root with
  `DATABASE_URL="file:../db/custom.db"` resolving to it (H9 proves the
  contract end-to-end under an active ambient-variable attack).
- `docs/prompt-to-*.md`, `docs/coding_agent_prompt.md`,
  `docs/skills-inventory.md` are operator/session-convention files — kept.

---

## Part 2 — Remediation Plan

All changes land on `main` (no new branches). The `skills/` folder stays out
of lint/typecheck/test/build paths (re-verified: ESLint `ignores` + tsconfig
`exclude`). The changes are removals + one new characterization test — the
TDD doctrine applies as "the green suite is the net": every phase re-runs the
full gate, and the final phase re-verifies live parity to prove the cleanup is
behavior-neutral.

### Phase 1 — Remove the predecessor-project scripts (F1)

1. `git rm` the 14 scaffold-era files from `scripts/` (keep `seed.ts` —
   the documented `db:seed` entry point):
   `capture-all.sh`, `capture-screens.sh`, `capture-screenshots.mjs`,
   `capture-wizard.sh`, `check-db-state.mjs`, `paired-probe-v214.mjs`,
   `paired-probe.sh`, `par-compare.sh`, `par-probe.sh`, `par-probe2.sh`,
   `par-probe3.sh`, `smoke-test.sh`, `vlm-sanity.mjs`, `wizard-cleanup.mjs`.

### Phase 2 — Remove the dead dependencies + shadcn config (F2)

2. `package.json` — remove the 14 unused runtime deps (8× @radix-ui/react-*,
   class-variance-authority, clsx, tailwind-merge, tailwindcss-animate,
   zustand, z-ai-web-dev-sdk) and the unused dev dep (tw-animate-css).
   Keep: next, react, react-dom, lucide-react, @prisma/client, prisma;
   dev: @playwright/test, @tailwindcss/postcss, @types/*, bun-types, eslint,
   eslint-config-next, tailwindcss, typescript, vitest.
3. `git rm components.json` — the shadcn scaffold config whose aliases point
   at directories that do not exist in this repo.
4. Regenerate the lockfile (`bun install`) and re-trust prisma postinstalls
   if blocked (`bun pm trust --all`).

### Phase 3 — Pin the dependency contract (F2, TDD)

5. Add `tests/deps.test.ts` — a characterization pin (green immediately,
   value = regression protection): reads `package.json` and asserts the
   dependency sets equal the documented architecture allowlist exactly
   (README "Architecture" table), that no removed scaffold package has crept
   back, and that `scripts/` holds only `seed.ts` — so scaffold deps cannot
   silently return via a future `bun add`. Suite grows 29 → **33 unit tests**.

### Phase 4 — Remove the committed ssh shims (F3)

6. `git rm docs/ssh.sh docs/ssh-wrapper.sh` — the runbook's "never commit
   the shim" rule; the executable shim stays environment-side
   (`/home/z/my-project/bin/ssh`, already deployed), the canonical source
   stays in the runbook's Appendix A.

### Phase 5 — Verification (the TDD net)

7. Full gate in order: `bun run lint && bun run typecheck && bun run test &&
   bun run build && bun run test:e2e`. Acceptance: lint 0, tsc clean,
   33/33 unit, build OK with the IDENTICAL route table (4 static + 5 dynamic
   + /_not-found), 28/28 e2e.
8. Fresh dev-server boot; live parity spot-check on both sites (desktop:
   7490px page height; mobile: menu panel 192×148 @ top 80, grid, r24, p8;
   link-click closes + jumps) + product loop (`POST /api/appointments` →
   201 → repo DB row → dashboard row) — proving the cleanup touched nothing
   user-facing.

### Phase 6 — Screenshots (F5)

9. Re-capture the key states from the running dev server into
   `docs/screenshots/` using the existing filename convention (01, 03–05,
   09–13), so the docs picture the post-cleanup tree.

### Phase 7 — Session documentation (F5)

10. Create `docs/session_6.md` (this session's structured log).
11. Append the session-6 entry to `worklog.md`.
12. `health-care-clinic_SKILL.md`: bump 2.1.0 → 2.2.0; §2 tech-stack table
    and §3 bootstrap notes lose the scaffold leftovers; §5 tree drops the
    dead scripts; §11 checklist counts (33 unit); Appendix B Session 6.
13. PAD: `[S6]` revision entry; annotated tree + test-distribution table
    updated (33 unit; scripts/ = seed.ts only).
14. README: dependency mentions if any (Quick Start unaffected); AGENTS.md /
    CLAUDE.md test-count lines if affected (29 → 33 unit).

### Phase 8 — Gate, commit, push

15. Re-run the full gate; `git status` clean of secrets (`.env`, `db/*.db`,
    `dev.log`, `server.log` excluded).
16. Conventional Commits message on `main`; push via `docs/ssh_git_wrapper_v3.py`
    per `docs/how-to-git-push-using-ssh-wrapper_SKILL.md` (operator key from
    the session brief; shredded after push; remote ref verified).

### Validation of this plan against the codebase (pre-execution)

- `git ls-files scripts/` → exactly 15 files; the 14 named for removal all
  exist; `scripts/seed.ts` is the `db:seed` target in `package.json` ✔
- Import inventory of `src/ tests/ scripts/seed.ts` references none of the
  15 packages slated for removal ✔ (the only `z-ai-web-dev-sdk` import sits
  in `scripts/vlm-sanity.mjs`, removed in Phase 1)
- `components.json` has 0 references in docs (excl. `skills/`) and its alias
  targets (`src/lib/utils`, `src/components/ui`, `src/hooks`) do not exist ✔
- `docs/ssh.sh` + `docs/ssh-wrapper.sh` tracked; runbook line 27 forbids
  committing them; the environment shim `/home/z/my-project/bin/ssh` exists ✔
- `tests/deps.test.ts` does not exist yet ✔ (Phase 3 target — no clobber)
- `tests/e2e/global-setup.ts` imports node built-ins only — unaffected by the
  dependency removal ✔
- e2e specs import only `@playwright/test` + app modules — unaffected ✔
