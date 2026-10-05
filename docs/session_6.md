# Session 6 — Scaffold Cleanup, Dependency Hygiene & Parity Re-Verification

Continuation of `docs/session_4.md` / `docs/session_5.md`. Scope: refresh
workspace → review docs + session logs (4/5 + remediation-plan-session4) →
validate understanding against the codebase → re-audit with live reference
verification → remediate the scaffold-hygiene findings → re-verify →
document → push.

## What was audited

- Workspace refreshed via `git pull` to `9092858` — a docs-only commit (the
  operator's transcript paste that became `docs/session_5.md`); zero code
  delta vs the session-4 audited `265ab71`.
- Read AGENTS.md, CLAUDE.md, README.md, Project_Architecture_Document.md,
  health-care-clinic_SKILL.md, docs/session_4.md,
  docs/remediation-plan-session4.md, worklog.md, docs/session_5.md — then
  validated every claim against the tree. Environment intact from session 4:
  `.env` (operator credentials + `AUTH_SECRET`), `db/custom.db` +
  `db/e2e.db` at the repo root, `node_modules` present.
- Baseline gates before any change: lint 0 / tsc clean / 29 unit / build OK
  (identical route table) / 28 e2e — all green.
- `skills/code-review-and-audit` fallback pipeline (static gates + `bun
  audit` + manual review) with emphasis on the recent changes and the parts
  prior audits hadn't surfaced: the scaffold legacy.
- Live reference verification with `skills/agent-browser` on BOTH the
  reference (`https://health-care-clinic.base44.app/`) and the local clone —
  desktop 1440×900 and mobile 390×844.

## Key findings (full detail: docs/remediation-plan-session6.md)

The session-4 remediation held up — 14 health checks green, live parity
byte-exact. The residuals were all scaffold-hygiene debt the earlier
audits never surfaced:

1. **F1 (High):** 14 predecessor-project scripts (ORBITAL /
   project-management era, commit `5384a0c`) still tracked in `scripts/` —
   referencing nonexistent paths, zero doc references, contradicting the
   documented hierarchy (README lists `scripts/seed.ts` only).
2. **F2 (Medium):** 15 unused dependencies (8× @radix-ui, cva, clsx,
   tailwind-merge, tailwindcss-animate, tw-animate-css, zustand,
   z-ai-web-dev-sdk) + `components.json` aliasing directories that don't
   exist — the shadcn scaffold stack the parity rebuild never used.
3. **F3 (Medium):** `docs/ssh.sh` + `docs/ssh-wrapper.sh` committed in
   violation of the push runbook's explicit "never commit the shim" rule.
4. **F4 (Info):** the two dev-tooling advisories (`braces`, `deepmerge-ts`)
   re-verified unfixable upstream — accepted dev-time risk, re-documented.

## Live parity evidence (reference vs clone, same session)

| Metric | Reference | Clone |
| ------ | --------- | ----- |
| Page height @1440×900 | 7490px | 7490px |
| h2 / h3 computed | 60px / 20px | identical |
| Mobile dropdown panel | 192×148 @ top 80 / right 370, grid, r24, p8, `rgba(38,74,57,.9)`, 3 links | identical (paints the oklab equivalent) |
| Mobile menu link click | closes + `#services` lands at top 0.421875 | identical to the last decimal |
| `<title>` | `Base44 APP` placeholder | semantic titles (recorded deviation) |
| `/login` on reference | Base44 platform 404 page | n/a — ADR-009 extension is ours |

Product loop re-verified under an ACTIVE ambient `DATABASE_URL` (the
parent-dir `.env` exported exactly the hijack value ADR-010 guards against):
`POST /api/appointments` → 201 → row in `<repo>/db/custom.db` → row + stats
on the authenticated dashboard. The `env -u` guards held under the exact
threat they exist for.

## What was remediated

- **Scripts:** removed the 14 ORBITAL-era files from `scripts/` (kept
  `seed.ts`, the documented `db:seed` entry point).
- **Dependencies:** removed all 15 unused packages (14 runtime + 1 dev) and
  the dead `components.json`; lockfile regenerated (`bun install`: 15
  packages removed). Application imports were only ever next / react /
  react-dom / lucide-react / @prisma/client + toolchain — verified by a
  full import inventory.
- **Dependency contract pinned (TDD):** new `tests/deps.test.ts` (4 tests) —
  set-equality allowlist for runtime + dev deps, a "no removed scaffold
  package has crept back" regression check, and a `scripts/` = `seed.ts`
  only pin. Unit suite: 29 → **33 tests**.
- **Shims:** removed `docs/ssh.sh` + `docs/ssh-wrapper.sh` per the runbook;
  the executable shim stays environment-side (`/home/z/my-project/bin/ssh`,
  paramiko 5.0.0 verified), canonical source in the runbook's Appendix A.
- **Screenshots:** 9 key states re-captured post-cleanup (01/03 desktop,
  04/05 mobile hero + open menu, 09/10 appointment form + success, 11 login,
  12/13 dashboard desktop + mobile) — all at exact viewport dimensions.

## Verification gate (final, post-cleanup)

lint 0 errors · typecheck clean · **33/33 unit** · production build OK with
the IDENTICAL route table (4 static + 5 dynamic + /_not-found) · **28/28
e2e** · fresh dev boot: `GET /api/health` → `{"ok":true,"database":"up"}`,
zero errors/hydration issues in `dev.log` · live parity spot-checks
unchanged (7490px; mobile panel 192×148 @ top 80; link-click closes +
jumps) · product loop green end-to-end. The cleanup is proven
behavior-neutral.

## Outcome

Committed on `main` and pushed via `docs/ssh_git_wrapper_v3.py` (runbook:
`docs/how-to-git-push-using-ssh-wrapper_SKILL.md`); the operator key was
shredded after the push and the remote ref verified equal to local HEAD.
