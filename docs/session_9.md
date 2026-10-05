I'll continue this task systematically. Let me set up my task list and start by refreshing the workspace.
The workspace exists with prior sessions completed. Let me refresh with `git pull` and check for the new session docs.
`git pull` brought in new `docs/session_7.md` (commit 683691b). Now let me read the core documentation files.
session_7.md is the operator's transcript of session 6's work. Now let me read the remaining core docs.
Now let me read the SKILL.md and repo worklog, and check the PAD structure.
Let me read the full SKILL.md output and the PAD document.
The SKILL.md is large. Let me read it directly in sections.
Now let me read the Project_Architecture_Document.md.
Let me scan the remaining PAD sections and verify the current codebase state in parallel.
Environment is intact from session 6. Let me update progress and read the remaining PAD sections plus the push runbook.
I have the full picture now. Let me run the baseline verification gates and check the skills catalog in parallel.
Workspace is clean with dependencies installed. Now running the baseline verification gates.
Lint 0 / tsc clean / 33/33 unit. Now the production build and e2e suite.
✅ **Baseline gates all green**: lint 0 / tsc clean / 33/33 unit / build OK (identical route table) / 28/28 e2e — exactly as documented in session 6. The recent commit `683691b` is docs-only (session_7.md transcript).

Now let me proceed to the audit phase. First, let me load the repo's code-review skill.
Audit skill loaded — I'll use the native CLI fallback pipeline (static gates ✅ + bun audit ✅ 2 known accepted dev-tooling advisories + manual review). Now the security pattern scans.
Static scans are clean (only the documented dev-fallback constant and test credentials — both intentional). Now let me dispatch a fresh-eyes code review agent while starting the dev server for live parity verification.
Excellent findings from the code review, and the dev server is up. Let me now verify the key findings myself and check the ambient environment.
Confirmed: timing oracle at line 89 (short-circuit), and ambient `DATABASE_URL` hijack value is again ACTIVE this session (the `env -u` guards remain essential). Let me verify the other key findings.
Let me verify the date-rollover claim empirically and check the client forms + configs.
Finding #4 confirmed empirically (Feb 31 → Mar 3 rollover passes). Let me check the remaining files.
Let me check globals.css, header.tsx, and hero.tsx for the remaining findings.
All key findings verified in code. Now let me clone the scandihaven reference repo (per instructions) and load the agent-browser skill for live parity verification.
Now let me run the live parity verification against the reference site — starting with desktop measurements.
Reference unchanged (7490px, "Base44 APP" title). Now let me probe the NEW parity questions on the reference.
Critical reference facts: date input has NO `min` (parity: don't add one), tel: hrefs are uniformly `tel:+11234567890` (our content.ts deviates — a genuine parity fix), and native validation is active. Now the mobile menu closed-DOM structure:
参考菜单关闭时的 DOM 匹配我们的条件渲染（为了一致性保留；将 `aria-controls` 的残留标记为已记录的增强瑕疵）。现在验证参考移动端菜单打开时的面板契约：
Panel contract matches previous sessions exactly (192×148 @ top 80, grid, r24, p8, rgba(38,74,57,.9), 3 links). Now the link-click behavior:
My selector hit the hidden desktop nav link — let me retest targeting the mobile panel's links specifically:
Reference behavior confirmed identical to sessions 4/6. Now verifying our clone's corresponding state:
Clone parity confirmed at 7490px — and the tel: deviation is confirmed real (clone has `tel:1234567890` in contact/footer vs reference's uniform `tel:+11234567890`). Now the clone mobile menu:
Mobile panel contract byte-exact (oklab paint = documented v4 variance). Now the product loop verification under the active ambient `DATABASE_URL` hijack:
The ambient hijack bit my own probe script (proof the threat is real!). Re-running with `env -u` guards:
Writes landed in the repo DB under the active ambient hijack — `env -u` guards hold. Now the login → dashboard leg:
Product loop fully verified under the active ambient hijack (login → 201 → repo DB → dashboard rows). Now let me review the scandihaven reference repo per instructions:
scandihaven patterns reviewed — same Next.js 16/React 19/Tailwind v4/Vitest+Playwright family, with an even stricter TS posture (supports remediating the strictness gap). Let me check the current e2e spec coverage for the test-gap findings:
Let me run the final pre-plan verification checks (reference `<main>` structure, installed @types/node, layout metadataBase, DEPLOYMENT.md XFF guidance):
The reference HAS a `<main>` element (and no skip link — so skip-link is correctly out of parity scope). Let me check whether our clone has one:
Our clone has `<main>` matching the reference. Let me check the remaining details — reveal e2e assertions, playwright config, and content.ts tel entries:
All verification complete. Now let me write the remediation plan for session 8.
Remediation plan saved. Now executing via TDD — **Phase 1 (Red)**: writing the failing validation tests first. Let me check the existing test style and content.ts services:
Now writing the failing validation tests (TDD Red):
Red confirmed. Now Phase 1 **Green** — implementing the validation seam:
The empty string is correctly treated as "not provided" (optional field) — my test case was wrong, not the code. Fixing the test:
Phase 1 Green (17/17). Now **Phase 2 (Red)** — the rate-limit seam tests:
Red confirmed. Now **Phase 2 (Green)** — implementing the rate-limit seam:
Phase 2 Green (10/10). Now **Phase 3 (Red)** — generating the DUMMY_HASH constant first, then the auth tests:
The repo uses KEYLEN=32 — regenerating to match exactly:
Now writing the Phase 3 tests — appending to auth.test.ts:
Adding the Phase 3 (Red) timing-equalization tests:
Now **Phase 3 (Green)** — adding DUMMY_HASH + verifyLoginPassword to auth.ts:
Phase 3 Green (18/18). Now rewiring both routes to use the seams — appointments route first:
Now the login route:
Both routes rewired. Running the full unit suite + typecheck:
64/64 unit tests pass, but 1 type error. Let me make the seam accept `unknown` directly (also fixing a latent 500-on-null-body edge):
Adding the non-object-body test to pin the new tolerance:
Typecheck clean, 65/65 unit, lint clean. Now **Phase 5** — the client 422 field-error contract:
Now wiring the per-field error rendering into the form inputs:
Now updating the login form (drop `noValidate`, add field-error contract):
Now **Phase 6** — a11y completions. First the heartbeat guard in globals.css:
Now the hero video reduced-motion pause:
Now the reveal bundle-failure fallback. Let me read reveal.tsx first:
Now the inline fallback timer in layout.tsx:
Phases 5-6 + metadataBase done. Quick gate check before the e2e pins:
Clean. Now **Phase 7** — adding the e2e pins. First reading the current specs:
Adding the new e2e pins to appointment-form.spec.ts:
Critical catch — my new API-level tests would exhaust the shared "unknown" bucket and break other specs. Giving each API test an isolated spoofed XFF key:
Now the auth.spec additions — let me see the existing cookie assertion section:
Now adding the enumeration-parity test after the malformed-payload test:
Now the tel: uniformity pin in landing.spec.ts:
Now **Phase 8** — the content.ts tel: parity fix and the reveal comment correction:
Now the reveal.tsx comment correction and the config changes:
Now the @types/node declaration + deps allowlist + playwright AUTH_SECRET:
Now updating DEPLOYMENT.md with the precise XFF guidance:
Now `bun install` (for the @types/node declaration) and the full verification gate:
Build green with identical route table — and now with real type enforcement. Running the e2e suite:
Two failures to diagnose — the cookie `secure` flag (e2e runs NODE_ENV=production, so Secure IS set — my assertion was wrong) and the 429 test. Let me check the 429 failure detail:
Both failures are my test expectations, not the code: the payload is valid (201s), and e2e runs NODE_ENV=production so `secure: true` is correct. Fixing the assertions:
Re-running the full e2e suite:
**34/34 e2e green!** All gates pass. Now Phase 9 — clean dev-server restart and live parity re-verification:
Desktop parity holds (7490px, uniform tel:, fallback timer correctly cancelled by hydration). Now the mobile menu:
Mobile menu byte-exact with identical link behavior. Now the live product loop + the new 422 field-error UX:
Now verifying the 422 field-error UI live (F3 fix):
F3 fix verified live. Now the reveal bundle-failure self-heal test — blocking all JS and verifying the 9s fallback:
The reveal fallback self-heals exactly as designed (8 cards hidden → all visible at 9s when the bundle fails). Verifying normal choreography still works with JS enabled:
All verification green. Now **Phase 10** — capturing the screenshots. Checking the existing convention first:
Re-capturing the 9 key screenshots plus a new one showing the 422 field-error state:
The daemon-cwd trap from session 4 — using absolute paths:
The form inputs are missing from the a11y tree — let me check the DOM directly:
The form vanished from the DOM — checking for render errors:
No errors anywhere. Let me inspect the contact section HTML directly:
The page is stuck in success state with an unexplained INSERT. Let me check what was actually inserted:
Mystery solved — "Casey Rivera" was actually submitted (the fills+click ran; only the screenshot command failed), proving the remediated form works. Let me verify the screenshot state and capture the remaining ones:
10-success captured. Now the field-error state screenshot (fresh reload first):
Now the mobile screenshots (04, 05) and login/dashboard (11, 12, 13):
All screenshots captured. Verifying the full set and cleaning up the browser session:
All screenshots refreshed. Now writing the session documentation — first `docs/session_8.md`:
Now appending the session-8 entry to the repo worklog:
Now updating SKILL.md to v2.3.0:
SKILL.md is at v2.3.0. Now the PAD updates — revision block, test distribution, known issues:
Now updating README.md and CLAUDE.md counts:
Now CLAUDE.md updates:
AGENTS.md needs a brief update for the new seams:
All documentation updated. Now the **final verification gate** before commit:
**FINAL GATE ALL GREEN**: lint 0 / tsc true-strict clean / 65/65 unit / build identical routes / 34/34 e2e. Now staging the commit — first verifying no secrets:
Clean. Committing:
Committed `224d21e` on main. Now the SSH push per the runbook — writing the operator key outside the repo with 0600:
Key verified (ed25519). Now the dry-run push:
Dry-run passed (would fast-forward 683691b..224d21e). Executing the real push:
Push successful — remote main @ 224d21e verified. Now shredding the operator key per the runbook:
The failed `ls-remote` actually proves the key was destroyed (no auth = no access). The wrapper already verified the remote ref. Confirming local state:
Everything verified. Final cleanup — stopping the dev server and updating the shared worklog:
✅ **Session 8 complete and pushed** — commit `224d21e` on `main`, remote-verified via the SSH wrapper, operator key shredded.

**What this session delivered:**

**Audit** (fresh-eyes review + live probes on both sites): found the risks earlier sessions missed — a login **timing-enumeration oracle** (unknown emails skipped scrypt, ~30ms faster), **spoofable rate-limit keying** (first XFF token), the client **discarding 422 field maps** ("check highlighted fields" with nothing highlighted), **impossible dates passing validation** (Feb 31 → Mar 3 rollover, proven empirically), reveal content **lost forever on JS-bundle failure**, a heartbeat reduced-motion guard gap, and a real **tel: href parity deviation**.

**Remediation (all TDD — 32 new unit tests first):**
- Two new pure seams: `validation.ts` (calendar round-trip rejection, specialty allowlist derived from content) + `rate-limit.ts` (last-token XFF keying, 64 KiB body cap)
- `DUMMY_HASH` timing equalization — scrypt burns on both login failure paths
- Per-field 422 errors with `aria-invalid`/`aria-describedby`; reveal self-heal timer (verified live with JS blocked); reduced-motion guards; tel: parity fix

**Verification:** lint 0 / tsc **true strict** / **65 unit** (was 33) / build identical routes / **34 e2e** (was 28). Live parity re-verified **byte-exact** — 7490px, mobile menu 192×148 with identical link behavior — and the product loop held under the still-active ambient `DATABASE_URL` hijack.

**Suggested next steps:** run `bun install && bun run dev` and try the form with a 2-char name to see the new field errors (screenshot 14). The natural next feature remains appointment status management (confirm/complete) on the dashboard.
