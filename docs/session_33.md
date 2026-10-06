I'll start by setting up a structured plan for this comprehensive task, then execute it phase by phase.
**Phase 1: Refresh workspace.** Let me check the current state of the workspace first.
The workspace has been reset — only a `download/README.md` exists. Per the instructions, I'll clone the repo fresh.
Repo cloned successfully, on `main`, clean tree. Let me survey the structure.
Workspace refreshed. Now **Phase 2: Review core docs.** Reading all five core documents in parallel.
The PAD is large. Let me read it in strategic chunks.
Now let me review the SKILL doc structure and the session documents.
Session 31 shows the last completed cycle. Now reading session_30, remediation-plan-session30, and the worklog.
Context established. Let me verify the latest commit's contents and check the environment state.
State confirmed: HEAD = session-30 tree + session_31 transcript; workspace **reset again** (no `.env`, no `db/`, no `node_modules`); ambient `DATABASE_URL` hijack ACTIVE (the documented ADR-010 trap). Let me bootstrap the environment — starting `bun install` while I review the skills catalog.
`bun install` done (424 packages). The `nextjs-postgresql-single-app` skill has concrete sitemap/robots/SEO patterns. Let me extract those and audit the current SEO state of the codebase.
Now let me audit the current SEO state of the codebase.
**Issue confirmed: NO sitemap and NO robots.txt exist.** Let me check the per-page metadata and the reference site's own SEO state.
Now let me probe the reference site's own SEO state to frame the parity context, and check next.config.ts.
Reference confirmed: Base44 SPA shell, no meta description/robots/sitemap — so SEO work is a **beyond-parity enhancement** (same doctrine class as login/dashboard). Let me bootstrap the environment now.
DB bootstrapped with 6 demo rows. Verifying the write landed in the repo DB (not the hijack target):
Ad-hoc invocation hit the documented ambient-env trap (ADR-010). Re-running with `env -u`:
DB state verified: 2/2/2 demo rows + 1 admin in the repo DB. Now cloning the scandihaven reference repo and running baseline gates.
**107/107 unit green.** Now build + e2e double-run proof:
Build OK with identical route table. Running e2e twice (double-run proof):
**All baseline gates GREEN**: lint 0 / tsc clean / 107 unit / build identical routes / **44 e2e × 2**. Now reviewing the scandihaven tech-stack reference.
Scandihaven's sitemap/robots/SEO e2e patterns validated the approach. Let me review the key config/code files myself before dispatching the audit.
Header/mobile nav code verified against the documented Tailwind v4 mitigations. Now dispatching the fresh-eyes audit subagent (17th cycle) while I run live parity probes.
Strong audit — zero code bugs, the entire finding set is the SEO/discoverability class. Per audit discipline, let me re-verify the key findings myself before acceptance.
All findings re-verified and **accepted** (F1–F10: the SEO class — zero code bugs). Before writing the remediation plan, let me run the live parity probes. Starting the dev server and loading the agent-browser skill:
Now running live parity probes — reference site first (mobile 390×844):
Menu is open — the panel is the second `<nav>`. Measuring its geometry:
Reference panel geometry byte-exact with the documented contract. Now the link-click behavior:
Reference link-click: panel unmounts, scrollY 1837, servicesTop 0.421875 — identical to documented. Now the clone, same probes:
Geometry identical; bg is oklab-format (the documented v4 variance). Now the rasterized pixel proof + link-click:
Shell escaping issue — persisting the probe as a script file instead:
**Rasterized paint [38,74,57,230] — EXACT.** No v4 trap regression. Now the clone's link-click:
**Clone link-click IDENTICAL to the pixel: 0 panels, scrollY 1837, servicesTop 0.421875.** Mobile navigation fully verified — no Tailwind v4 bug. Now desktop parity + pill rasterization:
**Clone desktop: 7490px byte-exact.** Now rasterizing the desktop nav pill:
Pill [37,74,57,204] — the documented ±1 oklab drift. **All trap guards GREEN.** Now the full 12-step product loop:
Steps 4–6, 8–11 green. Steps 1/2/7 show probe artifacts (browser fetch hides Set-Cookie + forbids Cookie override + opaque redirects). Verifying those three properly via curl:
**Full 12-step product loop GREEN** (307/200+cookie/200/201/200/200/401/404/422/401-generic/200/307). The write landed in the repo DB under the active hijack. Purging the probe row and checking dev.log:
All probes green; DB back to exactly 6 seed rows; dev.log clean. Closing browser sessions and checking implementation details for the plan:
deps contract confirmed: zero new dependencies allowed, `scripts/` must stay `seed.ts`-only. Checking content.ts structure for the SEO seam placement:
Now checking e2e title pins and route-table references across living docs before finalizing the plan:
All pre-plan verification complete. Now writing the comprehensive remediation plan as `docs/remediation-plan-session32.md`:
Plan saved and pre-validated against the codebase (every finding has line-level evidence; pins and contracts mapped). Now executing **Phase 1 — TDD RED: the seam contract first**:
**RED confirmed** (missing module). Now GREEN — implementing the seam:
**GREEN: 14/14 seam tests.** Phase 2 — atomic title.template + metadata wiring. Root layout first:
Now wiring the four pages (legal pages via the factory; login/dashboard titles de-suffixed):
Phase 2 wiring complete. Fast gates first (lint/typecheck/unit), then build for the e2e atomicity proof:
121/121 unit green, but tsc flags `TwitterMetadata.card`. Checking the actual type in Next 16:
The union type `Twitter` includes a card-less base variant — property access on the union fails. Let me see the full error list:
Single error in the test — fixing with `toMatchObject` (no union property access):
Gates clean. Now the **atomicity proof** — title pins against the rebuilt tree:
**Atomicity proof GREEN: 16/16.** Now Phase 3 RED — the served SEO surface spec. Checking existing spec conventions first:
Writing the served SEO surface spec (RED expected — routes don't exist yet):
RED confirmed (5 failed: robots/sitemap/og-image 404s + landing head). Let me see exactly which landing assertion failed — the root metadata should already emit some tags:
Next normalizes the root canonical to the bare origin (no trailing slash). Let me inspect the actual emitted head tags on the dev server to pin exact values:
All tags emitted as designed; root canonical + og:url normalize to the bare origin. Fixing the two assertions:
Now GREEN — implementing `sitemap.ts` and `robots.ts`:
Now the og-image asset. Reading `icon.svg` to reuse its glyph:
Writing the OG-image card HTML + generator script (workspace scripts/, outside the repo per the deps contract):
og-image.png: 1200×630, 240KB. Quick visual sanity check — sampling rendered pixels:
Card verified: green background + sand text + glyph. Closing session and rebuilding for the GREEN run:
14 routes — `/robots.txt` + `/sitemap.xml` added. GREEN run:
Next capitalizes `User-Agent` and may emit an extra character. Checking raw bytes from the dev server:
Raw output is clean — the only mismatch is `User-Agent` capitalization. Fixing the pin:
**GREEN: 9/9.** Phase 4 — full verification gate:
**FULL GATE GREEN: 121 unit / 53 e2e × 2.** Now live re-verification on the remediated tree:
Viewport wasn't set — fixing per the documented methodology (verify viewport before every measurement):
**7490px unchanged — head-only changes moved nothing.** Mobile probes on the remediated tree:
All parity metrics held. dev.log check, then Phase 5 — screenshots refresh:
dev.log clean. Now Phase 5 — rebuilding the screenshot capture script (workspace was reset; the prior persisted script is gone). First, checking the form's field structure:
Writing the full capture script (hardened session-26/28/30 patterns):
Module resolution issue — the script sits outside the repo. Patching to absolute-path imports:
Wrong button label — checking the actual submit button text:
Fixing the submit button label (it's "Request my visit"):
All 20 captures written, row purged, 6 seed rows intact. Verifying capture health (dimensions + content):
All 20 verified — 03-desktop-full exactly **1440×7490**. Quick visual spot-check of the two key captures:
Denser panel-region sample to conclusively verify the open menu:
**24/24 panel pixels green-dominant — captures verified.** Now Phase 6 — documentation alignment sweep. Finding all count references first:
Now the doc sweep — README first:
Now README's File Hierarchy, env note, and Testing section:
README aligned. Now AGENTS.md:
Now CLAUDE.md:
Six of seven edits applied; the Success Metrics edit failed on whitespace. Fixing:
CLAUDE.md done. Now SKILL.md — frontmatter, §5 tree, counts, Appendix B:
SKILL.md frontmatter/tree/counts done. Appending the Appendix B [S32] entry:
Now the PAD — the largest update. Reading the exact edit points:
The revision block structure needs precise inspection:
Adding the [S32] revision entry after [S30]:
[S32] revision entry in. Now adding ADR-011 after ADR-010:
ADR-011 recorded. Now §3.2 tree, §7, §8.2, §10, §11:
§3.2 tree complete. Now §7 test sections:
Now §10 Known Issues rows and §11 Key Files:
PAD aligned. Now DEPLOYMENT.md + .env.example:
Now the session record `docs/session_32.md`:
Now the repo worklog orchestrator entry:
Appending the orchestrator entry to the workspace worklog too:
**Phase 7 — pre-commit checks**: secret scan + change-set review:
14 screenshots changed, 6 byte-identical (deterministic static pages). Verifying all 20 were actually re-captured:
All 20 captured this session. Now reading the SSH push runbook + wrapper before committing:
Runbook internalized. Checking the sandbox SSH infrastructure:
No ssh binary + no paramiko — deploying the runbook's Appendix A shim path. Installing paramiko:
Now creating the shim (outside the repo, per runbook rule 5):
Shim on PATH. Now committing the remediated tree on main:
Committed `227fb11`. Now the SSH push sequence — materializing the operator key outside the repo:
Dry-run clean (fast-forward `e6d7476..227fb11`). Executing the real push:
**Push verified — remote main @ `227fb11` == local HEAD.** Shredding the operator key:
Final verification — skills/ untouched in the commit:
**Session 32 complete — pushed `227fb11` to `main`, remote-verified, operator key shredded.**

**What happened:** Workspace refreshed (it had been reset — re-bootstrapped with `DATABASE_URL="file:../db/custom.db"`, `db/` at repo root, 6 demo seed rows restored). All docs + session logs reviewed; baseline gates green. The **17th fresh-eyes audit confirmed your issue**: no sitemap, no robots.txt, no canonicals, incomplete OpenGraph, no twitter card, no og-image, description 167 chars, no title template — zero code bugs otherwise. **Mobile navigation verified identical to the pixel with the reference** (panel 192×148 @ (178,80); link-click 0.421875/scrollY 1837 on both sites; rasterized paint exact — no Tailwind v4 bug), and the full 12-step product loop stayed green.

**Remediated TDD-first** as a head-only beyond-parity layer (ADR-011): `src/lib/seo.ts` seam (14 unit tests) → `sitemap.ts` + allow-all `robots.txt` → canonicals + complete OG + twitter card → generated 1200×630 `og-image.png` → root `title.template` (atomic, title pins unchanged). Unit **107→121**, e2e **44→53** (×2 double-run), build 12→14 routes. Parity re-verified byte-exact after the change; 20 screenshots refreshed (03-desktop-full exactly 1440×7490); all living docs aligned; `.env.example` included in the commit.

**Suggested next steps:**
- `bun run dev` → visit `/robots.txt`, `/sitemap.xml`, and view the new head tags (`view-source:` on `/`)
- For production deploys, set `NEXT_PUBLIC_SITE_URL` **before** `bun run build` (canonical/OG/sitemap URLs bake from it)
- Try `SEED_DEMO=1 bun run db:seed` + double `bun run test:e2e` to watch the determinism proofs
