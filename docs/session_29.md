I'll continue the task from where we left off. Let me start by checking the workspace state and refreshing it via git pull.
The workspace has been reset — the repo is missing. I'll clone it fresh as instructed.
Repo cloned successfully, on main branch with clean tree. Let me set up a task plan and begin the meticulous doc review.
Now let me read the remaining core docs.
Let me read the PAD's key sections — the known issues and developer handbook parts.
Now let me read the SKILL.md and the session docs.
I have a thorough understanding of the project now. Let me update my todo and bootstrap the environment.
Environment state understood: ambient `DATABASE_URL` hijack is active (the documented ADR-010 trap), `db/` missing (fresh clone). Let me bootstrap.
DB bootstrapped. Now running the baseline verification gates.
**All baseline gates GREEN**: lint 0 / tsc clean / 99/99 unit / build OK / 44/44 e2e — exactly as documented. Now let me check the skills catalog and start the dev server + scandihaven clone in parallel.
Skills identified. Now let me start the dev server, clone scandihaven, and begin the audit phase.
Scandihaven cloned. Now let me set up the worklog and dispatch the fresh-eyes audit sub-agent (read-only), following the established session workflow.
Strong audit: 3 findings (1 Low, 2 Info), zero Critical/High/Medium, zero regressions. Per audit discipline, let me re-verify every finding myself before acceptance.
F1 CONFIRMED (0 appointments in custom.db, e2e.db in documented healthy 9-row state). Now verifying F2 and F3.
All 3 findings confirmed. Now let me study the seed doctrine question — reading the session-26 plan's rejection rationale and the current seed.ts.
The doctrine question is clear. Let me check the deps pin contract and DEPLOYMENT.md to design the F1 root-cause fix properly.
Confirmed: DEPLOYMENT.md instructs `db:seed` in production — so demo rows must be opt-in. Let me check the content.ts specialty export for the seam derivation.
Content derivation confirmed. Now the live parity probes (the operator's key concern — mobile nav + Tailwind v4). Let me check the agent-browser tooling.
The viewport flag on open didn't take. Per the documented measurement-hygiene note, I'll use `set viewport` explicitly.
Reference: 7490px at verified 1440×900 — matches documentation. Now the clone.
Desktop parity byte-exact. Now the operator's key concern — the mobile navigation menu at 390×844.
Panel geometry byte-exact (192×148 @ (178,80), grid, r24, p8; oklab = documented v4 format of rgba(38,74,57,.9)). Now the critical link-click behavior.
**Mobile nav IDENTICAL to the pixel** (0.421875 / scrollY 1837 — exact reference values). Now the v4 trap #1 guard: rasterize the dropdown paint.
The e2e suite already rasterizes this pixel properly (44/44 passed). Let me verify the spec's method to confirm the trap guard is what I think it is.
The e2e guard passed 44/44 already. Let me replicate its exact rasterization method live for double-verification.
[38,74,57,230] EXACT — no v4 trap regression. Let me check the pill + mobile page height, then run the full product loop.
Pill [37,74,57,204] (±1 oklab, within tolerance) + mobile height 12162 (documented 2px drift). Now the full product loop probe with status transitions.
**Full product loop GREEN** — all 10 steps correct, write landed in repo DB (env -u guard held). Let me quickly re-confirm the scandihaven tech-stack review (task 4).
Scandihaven patterns re-confirmed (same substrate; its idempotent-seeding doctrine actually supports my F1 design). Let me check the services list for the demo seam design.
All design inputs gathered. Now writing the comprehensive remediation plan.
Plan saved. Executing **Phase 1 — F1 (TDD)**. First, let me check the validation seam's date format for consistency.
Validation contract fully understood. Now writing the RED test first (TDD Step 2).
**RED CONFIRMED** — fails on the missing module. Now the GREEN implementation.
**GREEN — 8/8 pass.** Now extending `scripts/seed.ts` with the opt-in demo mode.
Now verifying: default run creates no rows, demo mode restores 6, re-run is idempotent.
Default behavior correct (no demo line; the 1 row is the earlier probe row, purged in Phase 5). Now the demo restore + idempotency proof.
All Phase 1 acceptance criteria met (default safe, 6 created, idempotent re-run, argv form works, self-renewing dates). Now the 6 living-surface doc updates.
README done (F2 included). Now AGENTS.md, .env.example, DEPLOYMENT.md.
Now the PAD §9.1 and SKILL §3 seed references.
Phase 1 complete. Now **Phase 3 — F3**: bun.lock workspace name fix + stability proof.
F3 fixed with stability proof. Now **Phase 4 — Full verification gate**.
107/107 unit, but tsc has an error in my test (for...of annotation) and lint failed. Fixing both.
Gate part 1 green (lint 0 / tsc clean / 107 unit). Now build + e2e double-run proof.
**FULL GATE GREEN: 107/107 unit, 44/44 e2e × 2 (double-run proof).** Now Phase 5 — purge probe row + verify dashboard state.
Probe row purged (first run's deleteMany succeeded); exactly 6 seed rows in 2/2/2 state. Now verifying the dashboard renders them.
Dashboard HTML verified — all 6 rows render. Now the screenshot capture script (persisted per script-persistence rule).
Let me check the login form selectors, then write the capture script.
Script is outside the repo so bun can't resolve the module. Fixing with an absolute import path.
19/20 correct. Shot 15 is 1258 vs prior 1324 — let me check whether any doc pins that height, or if it's honest content-dependent variance.
No doc pins that height — 1258 is honest content-dependent variance (only 03-desktop-full's 7490 is pinned, and it's exact). Let me spot-check the key captures aren't blank/broken.
All captures have real content. Now purging the capture's submission row (leaving the 6 seed rows).
DB state clean: exactly 6 seed rows. Now **Phase 6 — session docs + count-alignment pass**. First, find all unit-count references (99 → 107).
All count references located. Updating each (99 → 107, +seed-demo 8).
The MultiEdit was atomic and failed — let me apply the unit-list addition separately.
Both changes are already in place (the MultiEdit applied edit 1; my single Edit fixed edit 2). Verifying.
Now PAD §11 rows — seed.ts re-measured + two new rows.
Now the SKILL.md updates — gate block, frontmatter, Appendix B.
Now the SKILL Appendix B [S28] entry — checking the format first.
Now the PAD [S28] revision block entry.
The edit accidentally replaced the [S26] entry instead of appending after it. Restoring [S26] immediately.
Revision block fixed ([S26] preserved, [S28] appended). Updating the PAD header date and writing the session record.
Now appending the orchestrator entry to the repo worklog.
Now the pre-commit checks: final lint sanity + secret scan.
26 changes — exactly the expected set (8 screenshots byte-identical: static deterministic sections re-encode identically — a strong parity signal; 12 changed where dynamic content lives: video frames + the new demo dashboard rows). Now reading the SSH push runbook before committing.
Runbook internalized. Committing on main now.
Committed `9757e5d`. Now preparing the SSH push infrastructure per the runbook.
No ssh binary and no paramiko — the documented sandbox case. Installing paramiko and deploying the Appendix A shim.
Paramiko 5.0.0 installed. Now deploying the field-tested shim from the runbook's Appendix A.
Key verified (ed25519). Now the dry-run push with the explicit remote.
Dry-run clean (fast-forward 7357ea1..9757e5d). Executing the real push.
**Push verified — remote main @ `9757e5d` == local HEAD, key shredded.** Final housekeeping: stop the dev server and complete the workspace worklog.
**Session complete — pushed `9757e5d` to `main`, remote-verified, key shredded.**

**What happened:** Workspace refreshed (fresh clone), all docs reviewed and validated (baseline gates exactly as documented). The 15th fresh-eyes audit found 3 residuals — the headline: the 6 dashboard seed rows were absent for the **4th consecutive reset**, because the documented demo state was never reproducible by bootstrap. I closed it at the root, TDD-first: a new unit-tested seam (`src/lib/seed-demo.ts` — 6 rows, 2/2/2 statuses, self-renewing dates, derived allowlists, valid API payloads by construction) + an opt-in `SEED_DEMO=1`/`--demo` seed mode (default production-safe, idempotent). Unit suite 99 → 107. Also fixed the README screenshot index gap and the bun.lock "orbital" name.

**Verification:** lint 0 / tsc clean / 107/107 unit / build OK / **44/44 e2e × 2** (double-run proof). **Mobile navigation verified identical to the pixel** (panel 192×148 @(178,80); link-click 0.421875/scrollY 1837 on both sites; rasterized dropdown [38,74,57,230] exact — no Tailwind v4 regression). Full product loop green under the ambient DB hijack; 20 screenshots refreshed (dashboards show the restored rows).

**Suggested next steps:**
- Try the new demo state: `SEED_DEMO=1 bun run db:seed` (idempotent — safe to re-run)
- Run `bun run test:e2e` twice back-to-back to watch the determinism proof hold
- Consider rotating the deploy key on GitHub (it transited chat), per the session-27 note
- Next-session candidates remain: dashboard filtering/search or CSV export (beyond-parity, no parity impact)
