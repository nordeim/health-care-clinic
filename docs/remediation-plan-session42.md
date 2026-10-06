# Remediation Plan — Session 42 (22nd Audit Cycle, BAKED_ORIGIN Parse-Grammar Hardening, Secrets-Guard Key-Block Class, Doc-Drift Sweep)

Repo: `nordeim/health-care-clinic` @ `eeac368` (session-40 remediation tree
`f3f4505` + two docs-only operator commits: `b33fb9a` adds
`docs/session_41.md` — the session-40 transcript paste; `eeac368` refreshes
`docs/start_server_log.txt` — the operator's redeploy log: REDACTED `.env`
paste, `rm -rf db` fresh-DB rebuild, `db:push` + `db:seed` WITHOUT
`SEED_DEMO` (production-correct per session-28 F1), 14-route production
build, `PORT=3001` standalone start). Session-42 outputs:
`docs/session_42.md` + this plan. The `skills/` folder remains excluded
from review, testing and compilation.

---

## Part 1 — Audit Findings (22nd cycle, Task 42-a + orchestrator verification)

**Baseline re-established first** (workspace survived the session break —
`.env`/db/node_modules intact; `git pull` → `eeac368`): DB at the exact
seed state (6 demo rows 2/2/2 + 1 admin); ambient `DATABASE_URL` hijack
ACTIVE all session — the ADR-010 `env -u` guards held. Gates under the
operator's production `.env` (the session-40 derivation's meaningful
config): lint 0 / tsc true-strict / **169/169 unit** / build 14-route
table / **63/63 e2e** — exactly as documented, the BAKED_ORIGIN derivation
holding.

**Live-site verification (the redeployed instance)**: all routes healthy
(`/` 200, `/api/health` `{"ok":true,"database":"up"}`, legal pages 200,
anon `/dashboard` 307, robots/sitemap 200 with the production origin
baked in canonical/OG); **the 12-step product loop 16/16 GREEN on the
redeployed live site** (anon 307 → login 200 + httpOnly → authed 200 →
public POST 201 → PATCH confirmed → PATCH completed → anon PATCH 401 →
404 → 422 → CSV export 200 with the UTF-8 BOM + probe row present →
wrong-creds 401 → logout 200 → post-logout 307). One clearly-labeled
probe row ("Live Verification Probe Safe To Delete", completed) again
left for operator deletion. **The live `AUTH_SECRET`/`ADMIN_PASSWORD`
were NOT rotated** — login with the seeded placeholder still returns 200
post-redeploy; the PAD §10 HIGH advisory remains open (re-flagged).

**Parity (agent-browser, viewport set + verified before every
measurement)**: reference desktop 1440×900 height **7490px exact** / 7/7
section ids / 7 h2s byte-identical (incl. "thewhole you."); LIVE identical;
local clone identical. Mobile 390×844: panel **192×148 @ (178,80), grid,
radius 24px, padding 8px** — IDENTICAL on all three sites; link-click →
closes AND unmounts (nav 3→2) + `scrollY` 1837 + services-at-top
0.421875 — IDENTICAL on all three. Mobile heights 12164 (reference) vs
12162 (live + clone) — the documented 2px drift. **Mobile navigation
works correctly everywhere — NO Tailwind v4 bug (eighth consecutive
session to confirm).**

The 22nd fresh-eyes audit (read-only subagent, every finding
orchestrator-re-verified at file:line) returned **zero
Critical/High/Medium + 4 Low + 5 Info** — the third consecutive clean
sheet at the top bands, and the session-40 remediation holds up under
the hardest pass:

| ID | Sev | Finding | Verified evidence |
|----|-----|---------|-------------------|
| L1 | Low | **BAKED_ORIGIN `.env`-parse divergence under exotic line formats** — the session-40 derivation's hand-rolled regex (`tests/e2e/seo.spec.ts:38` `/^NEXT_PUBLIC_SITE_URL=["']?([^"'\r\n]+?)["']?\s*$/m`) parses the two documented repo formats exactly (proven 63/63 ×2), but diverges from what `next build` actually parses for other dotenv-legal line shapes: `export KEY=…` (dotenv strips the prefix), leading whitespace (dotenv trims), `KEY: value` colon syntax (dotenv 16.3.1's LINE grammar accepts it), inline `# comment` after a value (dotenv strips it), and duplicate keys (dotenv is LAST-wins; the regex is first-match). Under such a `.env` the build bakes the real origin while the spec derives localhost → the loud 5-pin failure signature returns AND the mismatched `loc.replace()` re-becomes a no-op → the loc-parity test silently fetches the baked (possibly external) origin — the LL-11 hazard again. Also: `if (fromEnv)` at :34 treats an ambient EMPTY-STRING as unset, while `@next/env` keeps it (initialEnv beats `.env` whenever the key is present, empty or not — `replaceProcessEnv` restores it verbatim; `siteUrl()`'s `??` then bakes `""`). | Probe-verified 12 cases against dotenv 16.3.1 (the exact version `@next/env` bundles — `node_modules/@next/env/dist/index.js` module 207: `l=/(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'\|[^'])*'\|\s*"(?:\\")*"[^"]\|...)/gm`, parse assigns last-wins; `processEnv` applies a file key only when `typeof p[t]==="undefined"`) |
| L2 | Low | **SKILL §2 stale version ranges** — `health-care-clinic_SKILL.md:76,77,81,83` pins `^16.1.1` / `^19.0.0` / `^6.11.1` / `^5.0.1` vs `package.json` actual `^16.3.8` / `^19.3.0` / `^6.19.3` / `^5.0.3` (the operator's `a4109d5` range bump; session-40's SKILL sweep touched frontmatter/§11/Appendix only). | `grep` both files — confirmed |
| L3 | Low | **PAD §11 seo.spec line count** — `Project_Architecture_Document.md:995` says 160; actual `wc -l` = **190** (session-40's Track D re-measure recorded the pre-remediation number — the derivation added 30 lines). | `wc -l tests/e2e/seo.spec.ts` — confirmed |
| L4 | Low | **Secrets-guard residual leak classes** — `tests/secrets.test.ts` pins 64-hex runs + the two assignment forms, but NOT: PEM/OpenSSH private-key blocks (`-----BEGIN … PRIVATE KEY-----` — the most plausible NEXT paste class given the operator's log-paste workflow and the SSH-push runbook context), GitHub token prefixes (`ghp_`/`github_pat_`), or non-md/txt doc surfaces. Documented trade-offs (in-file comment :18-23); the key-block class is cheap and zero-false-positive to pin. | `tests/secrets.test.ts:30-64` read; no key-block rule exists |
| I1 | Info | **Operator redeploy vs `docs/DEPLOYMENT.md`**: the `rm -rf db` fresh-DB rebuild is not in the runbook — it wiped the live appointment data (incl. the session-40 probe row — that advisory is now moot) with no warning; the relative `DATABASE_URL="file:../db/custom.db"` works only because the server starts from the repo root (§2's rule) — §3 recommends ABSOLUTE for deployed copies. | `docs/start_server_log.txt` vs `docs/DEPLOYMENT.md` §2/§3 |
| I2 | Info | Live `ADMIN_PASSWORD` is still the doc placeholder (`change-me` — login 200 post-redeploy); rotation advisory open. | live login probe this session |
| I3 | Info | The rotation advisory is carried prominently (PAD §10, SKILL §11, AGENTS, both session logs, the redaction markers). No action. | grep — confirmed |
| I4 | Info | `collectDocFiles` walk skips symlinked dirs (`withFileTypes` + `isDirectory()` false for symlinks). No symlinks in `docs/` today; git tracks them only via explicit action. Accepted residual. | `tests/secrets.test.ts:36-43` |
| I5 | Info | `start_server_log.txt` redaction complete tree-wide: the only 64-hex run outside `skills/` is the deliberate `DUMMY_HASH` in `src/lib/auth.ts`. | sweep — confirmed |

**All six documented invariants re-verified HEALTHY** at file:line
precision (env -u guards incl. `db:generate`; 64 KiB stream cap on all
three body routes; async scrypt + DUMMY_HASH equalization; 401-before-
DB-read on every guarded surface; XFF last-token keying; security
headers incl. the 308 exception). **Doc-alignment verdict: ALIGNED**
(169 unit / 63 e2e runtime / 14 routes exact everywhere; trees exact;
`.env.example` = exactly the 5 code-read env vars) with the two L2/L3
drifts. **Both operator commits verified docs-only + guard-clean**
(3/3 secrets pins pass against the new content).

### Considered and deliberately NOT remediated (doctrine)

- **`.env.local` / `.env.production.local` chain parsing in the
  derivation** — `@next/env` loads four files in precedence order; the
  repo's documented config surface is `.env` alone (README,
  `.env.example`, every doc), those alternates are gitignored, and none
  exists. Documented as a residual in the helper's comment.
- **dotenv-expand `$VAR` interpolation in the derivation** — applied by
  `@next/env` after parse; a `NEXT_PUBLIC_SITE_URL` containing `$` is
  pathological for an origin URL and outside every documented config.
  Documented as a residual.
- **I4 symlink walk, sub-64-hex/base64/other-variable false-negative
  classes** — diminishing returns against zero realistic surfaces;
  the guard's scope statement already documents the trade-off. The
  key-block + token-prefix classes (Track B) are the realistic ones.
- **A6-style reorderings / cosmetic churn** — none found; no action.

---

## Part 2 — Remediation Plan

### Track A — BAKED_ORIGIN parse-grammar hardening (L1, TDD-first)

**Rationale.** The derivation must resolve the SAME origin the build
bakes for EVERY dotenv-legal line shape, not just the two documented
formats. `@next/env` bundles dotenv **16.3.1** — its LINE grammar (read
verbatim from `node_modules/@next/env/dist/index.js`) accepts `export `
prefixes, leading whitespace, `:` separators, three quote forms, inline
comments, CR/CRLF, and assigns LAST-wins on duplicates; and its
`processEnv` applies a file key only when the key is absent from the
initial ambient env (an ambient empty-string therefore beats `.env`,
and `siteUrl()`'s `??` bakes `""`). Port that grammar verbatim into a
unit-testable seam instead of a hand-rolled regex.

**TDD sequence.**
1. **EXTRACT (behavior-preserving)** — move the session-40 logic
   verbatim into `tests/helpers/baked-origin.ts`: `parseEnvKey(text,
   key)` with the OLD regex + `resolveBakedOrigin(ambient, envText)`
   with the OLD `if (ambient)` truthiness + `bakedOrigin()` (reads
   `process.env` / `<cwd>/.env`, anchors on `process.cwd()` per the
   documented CJS-loader precedent). `tests/e2e/seo.spec.ts` imports
   the helper (the local copy + now-unused fs/path imports deleted).
   e2e stays 63/63 — extraction proven behavior-preserving.
2. **RED** — new `tests/baked-origin.test.ts` (~20 pins) on the pure
   seam: the documented formats (unquoted / double-quoted /
   single-quoted / CRLF / lone CR / trailing whitespace / trailing
   slash passthrough / commented lines) AND the divergence classes
   (export prefix, leading whitespace, colon syntax, inline comment
   after quoted value, duplicate keys LAST-wins, empty value
   faithfully `""`, ambient empty-string beats `.env`, ambient beats
   `.env`, no `.env` → localhost fallback, absent key → localhost).
   Run against the extracted OLD logic: exactly the divergence pins
   fail (the RED proof).
3. **GREEN** — swap in the dotenv-16.3.1-verbatim port: the LINE
   grammar restricted to one key (module-level regex, `matchAll` is
   lastIndex-safe), CR/CRLF normalization, trim → outer-quote strip →
   double-quote `\n`/`\r` expansion (exactly dotenv's parse steps),
   last-wins assignment; `resolveBakedOrigin` mirrors `??` semantics
   (`ambient !== undefined`) and `.env`-present-empty (`fromFile !==
   undefined`) — both documented as fail-loud mirrors of the build's
   behavior under broken configs. All pins GREEN.
4. **Verify** — full unit suite (169 → ~189), `bun run build` (the
   production `.env` stays) → `bun run test:e2e` → 63/63 ×2.

### Track B — secrets-guard key-block class (L4, TDD-first)

**Rationale.** The operator's workflow pastes terminal logs into
tracked docs and pushes via an SSH key — a pasted private key or
GitHub token is the most plausible next leak class. Zero
false-positive risk (no legitimate doc carries a PEM block).

**TDD sequence.**
1. **RED (planted fixture)** — add the 4th pin to
   `tests/secrets.test.ts`: no `-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----
   BLOCK?` header and no `ghp_…`/`github_pat_…` token prefixes in any
   doc surface. Plant a FAKE OpenSSH key block in a scratch
   `docs/*.{md,txt}` file → run → the pin FAILS (the honest RED for a
   guard on a clean tree — the session-40 RED was a real leak; this
   one is a planted fixture, recorded as such). Remove the plant.
2. **GREEN** — the clean tree passes (the pin is the permanent
   regression guard for the paste class).
3. Unit count +1 (the pin), surfaces unchanged.

### Track C — doc drifts (L2 + L3)

- SKILL §2: re-measure the four stale range rows (`^16.3.8` /
  `^19.3.0` / `^6.19.3` / `^5.0.3`); verify the lucide/Playwright/
  TypeScript rows while there.
- PAD §11: `tests/e2e/seo.spec.ts` 160 → 190 (+ the new
  `tests/helpers/baked-origin.ts` + `tests/baked-origin.test.ts`
  rows while re-measuring).

### Track D — DEPLOYMENT.md redeploy notes (I1)

- §3 gains the fresh-rebuild warning: `rm -rf db` + `db:push` +
  `db:seed` is a **data-loss operation** (wipes every appointment
  row — the operator's session-42 redeploy did exactly that); a
  schema refresh that keeps data is `db push` alone.
- §3 clarifies the relative-URL nuance: `file:../db/custom.db` works
  when the server starts from the repo root (§2's rule — the
  operator's log does); the ABSOLUTE recommendation stands for
  deployed copies that move the artifact out of the repo layout.

### Track E — documentation alignment, verification, screenshots, commit + push

- README: Tested row unit count + the derivation-hardening note; the
  secrets-guard note gains the key-block class.
- AGENTS: rule 11's derivation note updated (dotenv-verbatim port +
  the unit seam); Testing-quirks unchanged in substance.
- CLAUDE: Testing Strategy unit list gains the baked-origin seam;
  VERIFY counts updated.
- SKILL.md → v2.9.2 (frontmatter project_state + sessions list + §2
  ranges + §11 counts + Appendix B [S42]).
- PAD: [S42] revision block + §7.1/§7.3/§7.4 counts + §11 re-measured
  rows + §10 HIGH row refreshed (rotation STILL pending — re-observed
  post-redeploy).
- `docs/session_42.md` + repo worklog Task 42 entry + workspace
  worklog; `.env.example` re-verified unchanged (no new env vars).
- Full gate re-held post-remediation under the production `.env`:
  lint / tsc / unit (new count) / build / e2e ×2 (double-run proof).
- Parity re-verified on the remediated tree (Tracks A/B are
  test-only — zero `src/` changes, no rendered surface touched;
  re-probe the local server: desktop 7490px, mobile panel 192×148 @
  (178,80), link-click scrollY 1837) + the 12-step product loop
  against the local server + probe row purged (6 seed rows retained).
- 20 screenshots re-captured from the remediated dev server (per-run
  XFF base disjoint from every documented base; the exact
  "Request my visit" locator; DB restored to the 6-row seed state
  after the flow captures).
- Commit on `main` (single `feat:` commit per convention) → SSH
  wrapper push (`docs/ssh_git_wrapper_v3.py`, explicit
  `--remote git@github.com:nordeim/health-care-clinic.git`) →
  remote-ref verification → operator key shredded.
