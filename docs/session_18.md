# Session 18 — e2e Unknown-Bucket Determinism, Dashboard Status Annunciation & Full Doc-Claim Honesty Pass

Continuation of `docs/session_16.md` / `docs/session_17.md`. Scope: refresh
workspace → review docs + session logs (16/17 + remediation-plan-session16)
→ validate understanding against the codebase → re-audit with live reference
verification → remediate the new findings → re-verify → document → push. The
repo `skills/` folder stayed excluded from checking, testing and compilation
throughout.

## What was audited

- Workspace refreshed via `git pull` to `ba7d4d1` (the session-16 remediated
  tree `9e63e5f` + the docs-only operator transcript paste that became
  `docs/session_17.md`). Environment intact: `.env` (operator credentials +
  `AUTH_SECRET`, leading-`$` escaped per the dotenv gotcha), `db/custom.db`
  at the repo root, node_modules present; the ambient `DATABASE_URL` hijack
  was ACTIVE in the shell — the npm-script `env -u` guards held through
  every probe.
- Read AGENTS.md, CLAUDE.md, README.md, Project_Architecture_Document.md,
  health-care-clinic_SKILL.md, docs/session_16.md,
  docs/remediation-plan-session16.md, worklog.md, docs/session_17.md — then
  validated every claim against the tree.
- Baseline gates before any change: lint 0 / tsc clean / 95 unit / build OK
  (identical route table) / 43 e2e — all green, exactly as documented.
- `skills/code-review-and-audit` pipeline (static gates + `bun audit` — same
  two known dev-tooling advisories, accepted) + a fresh-eyes full review
  dispatched as a read-only sub-agent (Task 18-a) — every finding
  re-verified empirically or line-by-line by the orchestrator before
  acceptance.
- `skills/agent-browser` live parity probes on BOTH the reference and the
  local clone (desktop 1440×900 + mobile 390×844 — the documented contract
  viewports), before AND after the remediation.

## Key findings (full detail: docs/remediation-plan-session18.md)

The session-16 remediation held up — all gates green, live parity
byte-exact, every session-2/4/6/8/10/12/14/16 fix re-probed with zero
regressions. The 11 new findings (0 Critical/High/Medium, 1 Low-class
determinism gap + doc drift) were the residuals seven prior audits hadn't
surfaced:

1. **F8 (Low, test determinism):** the session-16 F2 claim "a
   `reuseExistingServer` instance can never poison another run's limiter
   bucket" was overstated for BROWSER-DRIVEN requests — the suite made 3
   XFF-less appointments POSTs per run into the shared "unknown" bucket
   (limit 5/10min), so a second consecutive run 429-flaked auth.spec's POST.
   **Empirically proven with a double-run repro: run 1 green, run 2 failed
   at the 6th unknown-bucket POST.**
2. **F1-F4 (Low, doc accuracy):** README/CLAUDE still said "13 correctness
   rules" (the gate is 14) and CLAUDE said "41 tests" (43) — plus the
   client-island lists omitted StatusButton everywhere.
3. **F5/F6/F7 (Low/Info, doc drift):** SKILL.md body staleness ("9-section",
   unit breakdown summing to 85, Appointment type missing status/updatedAt,
   API contracts missing the PATCH route) and PAD sections beyond
   §1/§2/§7/§10/§11 never refreshed across sessions — worst: §6.3 still
   claimed "no accounts by design, use NextAuth" (contradicting ADR-008)
   and §5.3 claimed Radix deps "remain installed" (removed session 6,
   pinned by deps.test.ts).
4. **F9/F10/F11 (Info):** a stale landing.spec tel: comment, the dashboard
   status badge missing live-region semantics (WCAG 4.1.3), and an
   incomplete README Vitest row.

## Live parity evidence (reference vs clone, same session, same method)

| Metric | Reference | Clone (remediated) |
| ------ | --------- | ----- |
| Page height @1440×900 | 7490px | 7490px |
| h2 / h3 computed | 60px/63px / 20px/25px | identical |
| Mobile dropdown panel | 192×148 @ (178, 80), grid, r24, p8, `rgba(38,74,57,.9)`, 3 links | identical geometry; oklab-equivalent paint (documented v4 variance, e2e-rasterized) |
| Mobile menu link click | closes + unmounts; `#services` at 0.421875 | **identical to the pixel** (re-verified post-remediation) |
| `<title>` | `Base44 APP` placeholder | semantic titles (recorded deviation) |

Product loop re-verified with the status transitions included: login → 200
→ dashboard → form POST → 201 → PATCH confirm → 200 → PATCH complete → 200
→ dashboard reflects Confirmed/Completed badges; anonymous PATCH → 401;
invalid status → 422; unknown id → 404.

## What was remediated (all TDD — Red confirmed before every Green)

- **Red phase first:** the double-run e2e flake repro (a persistent
  standalone server on :3100 + `reuseExistingServer`: run 1 = 43/43, run 2
  FAILED at auth.spec:59 — the 6th XFF-less POST 429'd against the
  exhausted "unknown" bucket) + the `role="status"` assertion (confirmed
  failing on the badge-less DOM).
- **e2e per-run key coverage for EVERY request (F8):** all browser-driven
  POSTs/PATCHes now carry pid-derived per-run keys — injected via
  `page.route` + `route.continue` header merge on the two appointment-form
  browser submits (`UI_KEY 198.51.106.${pid}`), the two auth.spec browser
  logins (`LOGIN_UI_KEY 192.0.6.${pid}`) and both appointments-status
  browser logins (`LOGIN_UI_KEY 198.51.107.${pid}`); the auth.spec
  `page.request` appointments POST carries `APPOINTMENTS_UI_KEY
  192.0.5.${pid}` explicitly; the StatusButton's browser PATCHes get
  `PATCH_KEY` injected (idempotent with the API-level pins). **No request
  the suite makes touches the "unknown" bucket anymore — proven with a
  TRIPLE-consecutive-run proof: 43/43 × 3 against one persistent server
  inside the 10-min limiter window.**
- **Dashboard status annunciation (F10):** the status badge span gained
  `role="status"` (implicit `aria-live="polite"` — WCAG 4.1.3); after
  `router.refresh()` only the mutated badge text announces (rows reconcile
  in place keyed by appointment id). Red-first e2e pin added.
- **Claim honesty (F8 docs):** AGENTS.md + CLAUDE.md determinism claims now
  state the full truth (every request-level key AND every browser-driven
  injection — the "unknown" bucket is never touched).
- **Doc pass (F1-F7, F9, F11):** README 13→14 + Vitest row completed;
  CLAUDE 41→43, 13→14, State Management + island lists completed; AGENTS
  island list + StatusButton; SKILL.md body (8 sections, breakdown
  +status 10, Appointment type, API contracts +PATCH/413) → v2.8.0; PAD
  §3.2 tree completed, §4.1 ER + AdminUser + status/updatedAt, §5.3 Radix
  corrected, §5.4 CTA wording, §6.1 APPOINTMENT_SPECIALTIES, §6.3 rewritten
  to the ADR-008 reality, §8.2 env table completed, §9.1 +db:seed, §11
  re-measured; landing.spec tel: comment corrected.

## Verification gate (final, post-remediation)

lint 0 errors (14 correctness rules ON) · typecheck clean under true
strict · **95/95 unit** (unchanged) · production build OK with the
identical documented route table · **43/43 e2e** (1 assertion extended)
· **the triple-consecutive-run proof: 43/43 × 3 against one persistent
server** (the F8 acceptance — the flake is gone, not just undetected) ·
fresh dev boot healthy · live parity spot-checks unchanged (7490px; mobile
panel 192×148 @ (178,80); link-click closes + jumps to 0.421875 —
identical to the reference) · the full product loop with status
transitions green under the still-active ambient `DATABASE_URL` hijack ·
`role="status"` live regions confirmed in the served dashboard HTML (6,
one per row) · audit + loop + capture probe rows purged (6 realistic seed
rows retained) · 20 screenshots refreshed from the remediated dev server
(03-desktop-full is exactly 1440×7490 — the parity height; the dashboard
shots show the status column with live-region badges).

## Outcome

Committed on `main` and pushed via `docs/ssh_git_wrapper_v3.py` (runbook:
`docs/how-to-git-push-using-ssh-wrapper_SKILL.md`); the operator key was
shredded after the push and the remote ref verified equal to local HEAD.

**Suggested next steps** (recorded for a future session; the PAD §10
backlog is empty): appointment filtering/search on the dashboard, or CSV
export for staff records — both beyond-parity surfaces, no parity impact.
