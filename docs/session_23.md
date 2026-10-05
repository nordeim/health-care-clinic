I'll start by reading the uploaded file and understanding the current workspace state, then work through this complex multi-phase task systematically.
Let me read the full operating instructions file to internalize it.
I've internalized the operating instructions (production-grade coding standards, TDD, audit discipline, evidence-based verification). Now let me set up the task plan and begin.
Repo cloned. Now let me review the core documentation files.
Now the architecture document (large — reading in parts).
Now let me review the SKILL.md and the session documents.
Now the worklog (recent entries) and session_21.md.
session_21.md is the operator's transcript paste of the prior session (following the repo's session pattern). Let me verify the latest commit state and check the environment.
Current state confirmed: HEAD `c908209` = session-20 remediated tree + docs-only session_21.md operator paste. Workspace needs re-bootstrap (no .env, no db/, no node_modules — same reset pattern as prior sessions; ambient `DATABASE_URL` hijack active). Let me review key SKILL.md sections and the skills catalog.
Now let me check the repo's skills catalog and start the environment bootstrap in parallel.
Let me read the key skill files while bun install runs.
Install complete (424 packages). Now let me check `.env.example` and set up the environment (`.env` with `DATABASE_URL="file:../db/custom.db"`, `db/` at repo root).
Test configs (vitest.config.mts, playwright.config.ts) are already in place and properly configured. Now let me set up the environment — checking what credentials prior sessions used.
Creating `.env` (with the documented dotenv `$`-escaping gotcha exercised) and bootstrapping the database at the repo root.
Environment bootstrapped. Now let me validate my understanding against the codebase — starting with the recent session-20 changes.
Session-20 changes verified in the tree. Now let me run the baseline verification gates.
Build route table matches documented state. Now the e2e suite.
**Baseline gates all green** — lint 0 / tsc clean / 95 unit / build (identical route table) / 43 e2e (53.8s). The tree matches the documented session-20 state exactly. Now let me clone scandihaven and start the dev server for live parity work.
Scandihaven reviewed — same substrate doctrine (Next 16 + React 19 + TS strict + Tailwind v4 CSS-first + Vitest 5/Playwright 1.63), monorepo shape with patterns already diverged-by-ADR in this repo. Let me check the dev server and dispatch the fresh-eyes audit sub-agent.
Dev server healthy. Let me initialize the session worklog and dispatch the fresh-eyes audit sub-agent (per the `code-review-and-audit` skill doctrine used in prior sessions).
Strong audit report: 13 findings (4 Low, 9 Info, zero Critical/High/Medium) — headline: the live staff password matches the doc example (a resurrected credential-hygiene finding). Per audit discipline, I must re-verify every finding myself before acceptance. Let me do that now.
F1 VERIFIED — the live login returns 200 with the doc-printed literal. Now verifying F2–F4 and the Info findings.
All 13 findings verified by orchestrator review. Now the live parity probes — the operator's key concern (mobile nav, Tailwind v4, visual/functional parity). Let me check agent-browser availability.
Now the live parity probes. Setting up a named session and measuring the reference site first (desktop 1440×900).
Reference renders at 6169px initially — the SPA likely needs more time (video hero). Let me wait and re-measure.
Reference stabilized at **7490px** — the documented parity height. Now the clone at the same verified viewport.
**Desktop parity byte-exact** — 7490px both sites, identical section ids, h2/h3 metrics, main present. Now the operator's key concern: the mobile navigation menu at 390×844. Reference first.
Reference mobile panel confirmed: 192×148 @ (178,80), grid, r24, p8, `rgba(38,74,57,.9)`, 3 links. Now the link-click behavior (the critical parity test).
Reference behavior pinned: link-click closes + jumps, `#services` at exactly **0.421875**. Now the clone — same probes.
Clone panel geometry identical (192×148 @ (178,80), grid, r24, p8, oklab-equivalent paint). But the clone's mobile page height reads **12162px vs reference 8114px** — a potential parity gap. Let me investigate carefully.
The earlier 8114px was a transient unsettled state — the settled reference reads **12164px vs clone 12162px** (2px sub-pixel drift in the contact section; every other section byte-identical). Now the clone's link-click behavior.
**Mobile navigation confirmed working — identical to the pixel** (link-click → closes + jumps, `#services` at 0.421875, scrollY 1837 — exact match with the reference). Let me complete the pixel-rasterization check (the Tailwind v4 trap #1 guard) and the full product loop.
**Pixel paints verified**: pill `[37,74,57,204]` (±1 oklab drift, expected), dropdown `[38,74,57,230]` exact — no Tailwind v4 transparency regression. Now the full product loop (login → dashboard → POST → PATCH → logout).
Both 422s are my shell-quoting mistakes (the `$` expanded empty), not app bugs — validation caught them correctly. Let me check the specialty list and redo with proper quoting.
Login 200 with the cookie. Completing the product loop.
Full product loop green end-to-end. Let me verify the dashboard HTML live regions and dev.log health, then check current DB state.
The ad-hoc query hit the documented ambient `DATABASE_URL` hijack — I need `env -u` for direct invocations (exactly why the npm scripts carry it).
dev.log clean, probes purged. Now restoring the documented 6-row realistic seed state through the public API (double-duty live probe).
6 seed rows restored with status transitions via the real PATCH API. Now let me scope the F1 password-literal remediation precisely before writing the plan.
F1 scope confirmed: 4 living docs, no transcripts, no tests. Now let me read `db-path.ts` fully to design the F10 TDD fix.
All conventions understood. Now writing the comprehensive remediation plan (saved under repo `docs/` per the user's instruction).
Plan saved and validated. Executing Phase 1 — F1 credential hygiene (rotate the live credential, then make the doc example un-adoptable).
F1 Green step 2 verified: new password → 200, old doc literal → **401**. Let me record the exact password form for later probes, then fix the four doc literals (step 3).
Let me redo the grep proof with correct exit-code capture.
**F1 complete** — old literal gone from all tracked files, live password untracked, placeholder in exactly 4 docs, login probes green. Now Phase 2 — F10 db-path decode hardening (TDD: Red first).
Adding the RED tests for the new `moduleSelfRoot` seam.
Let me clean up a pointless defensive bit in the test, then run RED.
**RED confirmed** — 4 new tests fail on the missing export. Now GREEN: implement `moduleSelfRoot` with URL decoding.
**GREEN — 19/19.** Now Phase 3: the F6 comment fix and F12 test-title fix.
Phase 4 — the doc-claim honesty pass. Starting with PAD fixes (F2, F4, F5, F13).
Now F13 — the PAD §3.2 docs/ subtree, and F3 — SKILL.md §1 + §5.
Now F7 (AGENTS wording), F8 + F11 (CLAUDE.md), and F9 (seed comment + .env.example caveat).
F9 next — first let me verify header.tsx actually carries the indirection comment my CLAUDE.md sentence references.
Now F9 — the seed.ts comment and .env.example caveat.
All 13 findings remediated. Now Phase 5 — the full verification gate.
99/99 unit (95 + 4 new — the plan said 3, correcting it), build route table identical. Let me fix the plan count and run e2e.
**Full gate green: 43/43 × 2 (double-run proof).** Now live re-verification on the remediated tree.
Now the parity spot-checks on the remediated tree via agent-browser.
Parity byte-exact on the remediated tree. Completing the product loop, then moving to screenshots.
Product loop green, probe purged. Phase 6 — screenshots. Let me check the existing 20-shot set.
Writing the screenshot capture script (workspace scripts/ — the repo's `scripts/` is pinned by deps.test.ts to hold only seed.ts).
All 20 captured. Verifying dimensions and purging the capture's submission row.
Screenshots verified (03-desktop-full exactly 1440×7490), DB back to 6 seed rows. Let me check the sub-agent's worklog entry, then write the session documentation.
Sub-agent's entry is in place. Now writing the session docs. First, checking SKILL.md's version header and Appendix B.
Now updating SKILL.md to v2.8.2 with the session-22 entries.
Now the Appendix B session-22 entry.
Now I must update every 95-unit test-count reference across the living docs (the count is now 99).
Updating all live count references (95→99, db-path 15→19) — leaving historical revision-block entries untouched.
Now the PAD [S22] revision block entry.
The entry landed before the Revision Block heading (matched the first `---`). Fixing the placement.
Revision block correct. Now writing `docs/session_22.md`.
Now the repo worklog orchestrator entry.
Final verification pass and pre-commit checks. First, let me read the SSH push runbook and wrapper script.
Gate re-confirmed green. Secret-scan the full diff before committing.
Clean — the 4 old-literal hits are the removal lines of the doc edits. Now the SSH push runbook.
Let me examine the wrapper script to confirm the remote argument.
No ssh binary and paramiko is missing for the default python. Let me set up the environment (as prior sessions did).
paramiko ready. Deploying the ssh shim outside the repo (Appendix A).
Shim deployed, key verified (ed25519). Now committing the remediated tree.
Committed `b4e0717`. Now the dry-run push via the wrapper (explicit `--remote`).
Dry-run clean (fast-forward `c908209..b4e0717`). Executing the real push.
**Push verified: remote main @ `b4e0717` == local HEAD, key shredded, tree clean.** Finalizing the worklog and closing out.
**Session 22 complete — pushed `b4e0717` to `main`, remote-verified, key shredded.**

What happened: workspace re-bootstrapped, all docs reviewed and validated against the tree (baseline gates exactly as documented). The fresh-eyes audit found 13 residuals — headline: the **live staff password matched the doc-printed example** (a resurrected leak from a prior session's fix). I rotated the credential, made the doc examples un-adoptable placeholders, TDD-hardened the db-path seam (95→99 unit tests), and aligned every doc claim. **Mobile navigation verified byte-exact against the live reference** — panel 192×148 @ (178,80), link-click lands at 0.421875 on both sites, pixel-rasterized colors green. Full gate: lint 0 / tsc / 99 unit / build / **43 e2e × 2 consecutive runs**, 20 screenshots refreshed.

**Suggested next steps:** run `bun run test:e2e` twice back-to-back to watch the determinism guarantee hold; review the dashboard status flow (login → confirm/complete); the recorded next-session candidate is dashboard filtering or CSV export. Since the deploy key transited chat, consider rotating it on GitHub when convenient.
