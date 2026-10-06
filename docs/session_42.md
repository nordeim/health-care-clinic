# Session 42 — 22nd Audit Cycle, BAKED_ORIGIN Parse-Grammar Hardening, Secrets-Guard Key-Block Class, Redeploy Notes

Continuation of `docs/session_40.md` / `docs/session_41.md`. Scope:
workspace refresh via `git pull` → `eeac368` (the session-40 remediation
tree `f3f4505` + two docs-only OPERATOR commits: `b33fb9a` adds
`docs/session_41.md` — the session-40 transcript paste; `eeac368`
refreshes `docs/start_server_log.txt` — the operator's redeploy log:
REDACTED `.env` paste, `rm -rf db` fresh-DB rebuild, `db:push` +
`db:seed` WITHOUT `SEED_DEMO` (production-correct per session-28 F1 —
the log's output shows only the admin upsert), 14-route production
build, `PORT=3001` standalone start). Docs + session logs reviewed
(40 + 41 + remediation-plan-40 + both worklogs + the redeploy log),
understanding validated against the codebase, the REDEPLOYED live site
verified, the 22nd fresh-eyes audit cycle dispatched, findings
remediated TDD-first, re-verified, documented, pushed. The repo
`skills/` folder stayed excluded from checking, testing and compilation
throughout.

## What was audited

- Workspace SURVIVED the session break (no reset): `.env` per operator
  spec intact, DB at the exact seed state (6 demo rows 2/2/2 + 1
  admin), node_modules intact; the ambient `DATABASE_URL` hijack
  (`file:/home/z/my-project/db/custom.db`) still ACTIVE — the ADR-010
  `env -u` guards held all session.
- Baseline gates under the operator's production `.env` (the
  session-40 derivation's meaningful config): lint 0 (14 rules ON) /
  tsc true-strict / **169/169 unit** / build 14-route table /
  **63/63 e2e** — exactly as documented; the BAKED_ORIGIN derivation
  holding under the production-baked artifact.
- The operator's two new commits verified **docs-only + guard-clean**
  (3/3 secrets pins pass against the new content; no code changes).
- A fresh-eyes full review dispatched as a read-only sub-agent (Task
  42-a, 22nd cycle) — every finding re-verified by the orchestrator at
  file:line precision before acceptance.

## Live-site verification (the redeployed instance)

- All routes healthy: `/` 200, `/api/health` `{"ok":true,"database":"up"}`,
  legal pages 200, `/login` 200, anon `/dashboard` 307, robots/sitemap
  200 with the production origin baked in canonical/OG/robots/sitemap.
- **The 12-step product loop 16/16 GREEN on the redeployed site**
  (anon 307 → login 200 + httpOnly → authed dashboard 200 → public
  POST 201 → PATCH confirmed → PATCH completed → anon PATCH 401 → 404 →
  422 → CSV export 200 with the UTF-8 BOM + probe row present →
  wrong-creds 401 → logout 200 → post-logout 307). One clearly-labeled
  probe row ("Live Verification Probe Safe To Delete", completed)
  again left for operator deletion (no DELETE API exists by design).
- **The live `AUTH_SECRET`/`ADMIN_PASSWORD` were NOT rotated** — login
  with the seeded placeholder still returns 200 on the redeployed
  site. The PAD §10 HIGH advisory remains open and was refreshed with
  the re-observation.
- **Parity (agent-browser, viewport set + verified before every
  measurement, settle-waits)**: reference desktop 1440×900 height
  **7490px exact** / 7/7 section ids / 7 h2s byte-identical (incl. the
  "thewhole you." quirk); LIVE site identical; local clone identical.
  Mobile 390×844: panel **192×148 @ (178,80), grid, radius 24px,
  padding 8px** — IDENTICAL on all three sites; link-click → closes
  AND unmounts (nav 3→2) + `scrollY` 1837 + services-at-top 0.421875 —
  IDENTICAL on all three. Mobile heights 12164 (reference) vs 12162
  (live + clone) — the documented 2px drift. **Mobile navigation works
  correctly everywhere — NO Tailwind v4 bug (the eighth consecutive
  session to confirm).** Route table: the live site remains a SUPERSET
  of the reference.

## The 22nd audit (Task 42-a) — findings

**Zero Critical/High/Medium — the third consecutive clean sheet at the
top bands — + 4 Low + 5 Info** (every finding orchestrator-re-verified
at file:line):

- **L1 (Low)** the session-40 BAKED_ORIGIN derivation's hand-rolled
  regex parses only the two documented `.env` formats — `export `
  prefixes, leading whitespace, `KEY: value` colon syntax, inline `#`
  comments, and duplicate keys (dotenv is LAST-wins; the regex was
  first-match) all diverge from what `next build` actually parses
  (@next/env bundles **dotenv 16.3.1** — its LINE grammar read
  verbatim from the installed bundle); also `if (fromEnv)` treats an
  ambient EMPTY-string as unset while `@next/env` keeps present keys
  (empty or not — `siteUrl()`'s `??` then bakes `""`). Under such a
  `.env` the loud 5-pin failure signature returns AND the mismatched
  `loc.replace()` re-becomes a no-op → the LL-11 external-fetch
  hazard.
- **L2 (Low)** SKILL §2 stale version ranges (4 rows pre-dating the
  operator's `a4109d5` range bump).
- **L3 (Low)** PAD §11 `seo.spec.ts` line count recorded as the
  pre-session-40-remediation 160 (actual 190 at audit time).
- **L4 (Low)** the secrets guard pins hex keys + credential
  assignments but NOT private-key blocks or GitHub token prefixes —
  the most plausible NEXT paste class given the operator's log-paste
  workflow and the SSH-push runbook context.
- **Info (5)**: the redeploy's `rm -rf db` fresh-DB rebuild is a
  data-loss operation no runbook warned about (it wiped the live
  request history — the session-40 probe-row advisory is now moot);
  the relative `DATABASE_URL` works only under §2's repo-root start
  rule; the placeholder credential is still live (I2); the rotation
  advisory is carried prominently (I3); the guard's doc-walk skips
  symlinked dirs (I4, accepted residual); the tree-wide redaction is
  complete (I5).

All six documented invariants re-verified HEALTHY at file:line
precision; doc-alignment verdict ALIGNED (169/63/14 exact everywhere,
trees exact, `.env.example` = exactly the 5 code-read config vars).

## Remediation (TDD-first, `docs/remediation-plan-session42.md`)

- **Track A — BAKED_ORIGIN parse-grammar hardening (L1):**
  behavior-preserving EXTRACTION first (the session-40 logic moved
  verbatim into `tests/helpers/baked-origin.ts`; the e2e spec imports
  it) → **RED**: the new `tests/baked-origin.test.ts` (25 cases: the
  documented formats + every divergence class) run against the
  extracted OLD logic — exactly the 11 divergence pins failed →
  **GREEN**: the dotenv-16.3.1-verbatim port (the LINE grammar + the
  CR/CRLF normalization + the trim/outer-quote-strip/`\n`-`\r`
  -expansion unquoting steps, copied from the installed `@next/env`
  bundle and cited at the regex; `resolveBakedOrigin` mirrors `??`
  semantics — an ambient empty-string or a present-but-empty `.env`
  value fails the pins LOUDLY instead of silently substituting a
  different origin than the one the build baked). The e2e suite
  imports the seam — green under ANY `.env` line shape.
- **Track B — secrets-guard key-block class (L4):** the 4th pin in
  `tests/secrets.test.ts` — no `-----BEGIN … PRIVATE KEY-----` blocks
  and no `ghp_`/`github_pat_` token prefixes in doc surfaces —
  RED-proven with a planted fixture (a fake OpenSSH block in a scratch
  doc file failed exactly the new pin; the technique is the honest RED
  for a guard on a clean tree), GREEN on the clean tree after the
  plant's removal.
- **Track C — doc drifts (L2/L3):** SKILL §2 five range rows
  re-measured (`^16.3.8` / `^19.3.0` / `^5.9.3` / `^6.19.3` /
  `^5.0.3`); PAD §11 seo.spec re-measured (172 post-extraction) + the
  new helper/test rows added.
- **Track D — redeploy notes (I1):** DEPLOYMENT.md §3 gained the
  fresh-DB-rebuild DATA-LOSS warning (`rm -rf db` + reseed wipes every
  appointment row — the operator's redeploy did exactly this;
  `db:push` alone refreshes the schema without data loss) + the
  relative-`DATABASE_URL`-from-repo-root nuance (works under §2's
  rule; ABSOLUTE stays the recommendation for moved artifacts).
- Unit 169 → **195** (+25 baked-origin pins, +1 key-material pin);
  e2e stays 63.

## Post-remediation verification

- **Full gate under the production `.env`**: lint 0 / tsc true-strict
  / **195/195 unit** / build OK (the 14-route table unchanged) /
  **63/63 e2e × 2 consecutive runs (the double-run proof)**.
- **Parity re-verified on the remediated tree** (Tracks A/B are
  test-only — zero `src/` changes, no rendered surface touched):
  desktop 7490px unchanged; mobile panel 192×148 @ (178,80)
  identical; link-click close+unmount + `scrollY` 1837 + svc-top
  0.421875 identical.
- **Local 12-step product loop 16/16 green**; probe row purged (6
  seed rows + 1 admin retained).
- **20 screenshots re-captured** (per-run XFF bases
  `198.51.135.<pid>` and `198.51.136.<pid>` — disjoint from every
  documented base); 03-desktop-full exactly 1440×7490. The first pass
  RE-CAUGHT the documented session-40 screenshot gotcha — the
  workspace's capture script (reset since session 40) again carried
  the too-loose `/book/i` button regex and clicked the header's "Book
  a visit" CTA instead of the form's "Request my visit" (caught by
  the DB-state cross-check: 0 POSTs, 6 rows); fixed to the exact
  locator, re-captured, the success-state POST PROVEN by the row's
  presence, then purged; 12-dashboard-desktop re-captured with the
  clean 6-row DB after the purge.
- dev.log clean (no hydration errors, no failed API calls, no PII).

## Documentation alignment

SKILL.md → v2.9.2 (frontmatter project_state + sessions list + §2
ranges + §11 gate counts + Appendix B [S42]) · PAD ([S42] revision
block + §7.1 distribution + §7.3/§7.4 counts + §11 rows + §10 HIGH row
refreshed with the session-42 re-observation) · README (Tested row 195
+ the dotenv-verbatim derivation note + the key-block class +
Architecture row + tree + seam list) · AGENTS (rule 11 derivation note
→ the unit-tested seam; Testing-quirks secrets pin → 4 classes) ·
CLAUDE (Testing Strategy gains the baked-origin seam + key-block class
+ 195 VERIFY + the tests/helpers/ tree row) · DEPLOYMENT.md (§3 the
two redeploy notes) · `.env.example` re-verified unchanged (no new env
vars; tracked in the commit).

## Outcome

Committed on `main` and pushed via `docs/ssh_git_wrapper_v3.py`
(runbook: `docs/how-to-git-push-using-ssh-wrapper_SKILL.md`); the
operator key shredded after the push and the remote ref verified equal
to local HEAD.

**Operator advisories carried in the docs (outside the code's reach):**
(1) **rotate the live `AUTH_SECRET` and change the `ADMIN_PASSWORD`**
— still unrotated on the redeployed site (PAD §10 HIGH); (2) delete
the labeled probe row ("Live Verification Probe Safe To Delete") from
the live dashboard DB when convenient; (3) the fresh-DB rebuild wipes
appointment data — DEPLOYMENT.md §3 now warns (a schema refresh
without data loss is `db:push` alone).

**Suggested next steps** (recorded for a future session): the PAD §10
backlog still carries the A1 rotation residual; a paginated query
layer if volumes outgrow the latest-100 window; revisit JSON-LD
structured data if real clinic NAP data ever replaces the placeholder
parity copy.
