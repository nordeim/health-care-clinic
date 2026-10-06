# Remediation Plan — Session 40 (21st Audit Cycle, BAKED_ORIGIN Coupling Closure, Live-Secret Redaction, Repo Hygiene)

Repo: `nordeim/health-care-clinic` @ `a4109d5` (session-38 tree `89a2046` +
docs-only operator pastes `docs/session_39.md` + `docs/start_server_log.txt`).
Session-40 outputs: `docs/session_40.md` + this plan. The `skills/` folder
remains excluded from review, testing and compilation.

---

## Part 1 — Audit Findings (21st cycle, Task 40-a + orchestrator verification)

**Baseline re-established first** (fresh clone — the workspace was reset this
session): `.env` per operator spec (`DATABASE_URL="file:../db/custom.db"`,
`NEXT_PUBLIC_SITE_URL=https://family-clinic.jesspete.shop`),
`bun install` (424 pkgs), `db:push` + `db:seed` + `SEED_DEMO=1` → exactly 6
demo rows (2/2/2) + 1 admin at `<repo>/db/custom.db`. Gates with the dev
default origin: lint 0 (14 rules ON) / tsc true-strict / 166/166 unit /
build 14-route table / 63/63 e2e × 1 — exactly as documented. The ambient
`DATABASE_URL` hijack (`file:/home/z/my-project/db/custom.db`) is ACTIVE —
the ADR-010 `env -u` guards held all session.

The 21st fresh-eyes audit (read-only subagent) returned **1 Critical + 1
High + 1 Medium + 1 Low + 5 Info** — the first Critical in 21 cycles, and it
came from an *operator* commit that bypassed the SSH-wrapper gate discipline
(the repo's own code and tests are blameless). Every finding was re-verified
by the orchestrator at file:line precision before acceptance:

| ID | Sev | Finding | Verified evidence |
|----|-----|---------|-------------------|
| A1 | **Critical** | **Live `AUTH_SECRET` + live staff credentials committed & pushed** — `docs/start_server_log.txt:3-7` is a `grep -v '^#' .env` paste containing the LIVE `AUTH_SECRET` (64-hex, byte-identical to the operator-provided production `.env`), `NEXT_PUBLIC_SITE_URL=https://family-clinic.jesspete.shop`, `ADMIN_EMAIL` / `ADMIN_PASSWORD` (identical to the live values). The file landed in operator commit `a4109d5` and is already on the public GitHub remote. With the HMAC key public, anyone can forge a valid staff session cookie and read the dashboard + CSV export (patient PII). Violates PAD §6.1 rule 5 ("secrets never committed"). | `git log --oneline -- docs/start_server_log.txt` → `a4109d5`; file content diffed against the operator `.env` — identical |
| F1 | **High** | **`BAKED_ORIGIN` hardcode breaks the e2e gate against a production-baked build** — `tests/e2e/seo.spec.ts:16` pins `http://localhost:3000`, but the build bakes `NEXT_PUBLIC_SITE_URL` from the repo `.env` (now the production URL per the operator's config) → exactly 5/63 e2e failures (robots `Sitemap:` pin :34, sitemap `<loc>` pin :47, landing canonical :80, legal canonicals :115/:117). The documented session-34 A4 note in AGENTS.md anticipated exactly this ("running e2e against a production-baked artifact requires deriving it from the build env first") but the derivation was never implemented. **Hidden hazard:** at :66 `loc.replace(BAKED_ORIGIN, "")` becomes a no-op under the mismatch, so the "every advertised loc resolves 200" test silently fetches the LIVE production origin — an external-network false-green (that is why the failure count is 5, not 6). | Full e2e run with the production `.env` build: `5 failed / 58 passed` — failure list quoted above |
| A2 | Medium | **Stray root `package-lock.json` (8,349 lines) in a bun-locked repo** — added in the same operator commit `a4109d5`; dual-lockfile resolution drift (`npm ci` diverges from the audited `bun.lock`), absent from every doc inventory; `deps.test.ts` cannot see it. The deployment log itself uses bun. | `git ls-files \| grep package-lock` → root file tracked (the `skills/` copies are out of audit scope) |
| A3 | Low | **`.gitignore` misses WAL sidecars** — covers `db/*.db` + `db/*.db-journal` but not `db/*.db-wal` / `db/*.db-shm`; a WAL sidecar surviving a crash could be committed. No leak today. | `.gitignore:33-35` |
| A4 | Info | README Architecture-table e2e row ("Landing, mobile nav, form, legal pages, auth loop, appointment status management") omits the `seo` + `dashboard-filters` specs (correctly named in the tree listing and the Tested row). | `README.md:74` |
| A5 | Info | PAD §11 line estimates drifted for three rows: auth.spec "~263" → 283, mobile-nav "~170" → 178, seo.spec "~150" → 160 (session-38 re-measured only its own three rows). | `wc -l` — confirmed |
| A6 | Info | Dashboard parses `searchParams` (line 75) before the session guard (77-92) — pure seam, no DB read, no leak; invariant (d) intact. Recorded so a future reader doesn't re-flag it. | `src/app/dashboard/page.tsx:75-92` |
| A7 | Info | `space-y-10` in the legal shell is SAFE under v4 trap #4 — direct children carry no `mt-*`/`mb-*`. Mobile menu correctly uses grid (`header.tsx:195`). | `src/components/site/legal-page.tsx:32` |
| A8 | Info | ESLint ignores list carries nonexistent workspace dirs (`delivery/**`, `tool-results/**`, `mini-services/**`, `.zscripts/**`) — harmless sandbox leftovers. | `eslint.config.mjs:83` |

**All six documented invariants re-verified HEALTHY** at file:line precision
(env -u guards incl. `db:generate`; 64 KiB stream cap on all POST/PATCH;
async scrypt + DUMMY_HASH equalization; 401-before-DB-read on every guarded
surface incl. the A6 nuance; XFF last-token limiter keying; security headers
incl. the documented 308 exception). **Doc-alignment verdict: ALIGNED** —
the 166/63 counts, file trees, `.env.example` ↔ codebase contract, and
sessions 34-38 code (BOM, formula guard, first-wins, query layer, SEO layer)
all verified exact, zero contract drift between the dashboard page and the
export route.

### Live-site + parity verification (before remediation)

- **LIVE production site (`https://family-clinic.jesspete.shop`)**: all
  routes healthy (`/` 200, `/api/health` `{"ok":true,"database":"up"}`,
  robots/sitemap 200, `/login` 200, anon `/dashboard` 307, legal pages 200);
  canonical/OG/robots/sitemap all correctly baked with the production origin;
  **12-step product loop 16/16 GREEN** (anon 307 → login 200 + httpOnly →
  authed dashboard 200 → public POST 201 → PATCH confirmed → PATCH completed
  → anon PATCH 401 → unknown 404 → invalid 422 → CSV export 200 with UTF-8
  BOM + probe row present → wrong creds 401 → logout 200 → post-logout 307).
  One clearly-labeled probe row ("Live Verification Probe Safe To Delete",
  status completed) remains in the live DB for operator deletion (no DELETE
  API exists by design).
- **Parity probes (agent-browser, verified viewports)**: reference desktop
  1440×900 height **7490px exact** / 7/7 section ids / 7 h2s byte-identical;
  LIVE site **identical** (7490px, same h2s incl. the "thewhole you." quirk);
  local clone identical. Mobile 390×844: panel **192×148 @ (178,80), grid,
  radius 24px, padding 8px** — IDENTICAL on all three sites; link-click →
  panel closes AND unmounts (nav 3→2) + `scrollY` 1837 + services-at-top
  0.0005 — IDENTICAL on all three. Mobile heights 12164 (reference) vs
  12162 (live + clone) — the documented 2px contact drift. **Mobile
  navigation works correctly everywhere — NO Tailwind v4 bug** (seventh
  consecutive session to confirm).
- **Route table**: the live site remains a SUPERSET of the reference (the
  reference's 3 routes + `/login` + guarded `/dashboard` + `robots.txt` +
  `sitemap.xml` + `/api/*`).

---

## Part 2 — Remediation Plan

### Track A — BAKED_ORIGIN derivation (F1, TDD-first)

**Rationale.** The e2e suite must stay green under ANY repo `.env`
configuration — the dev default AND the production origin the operator now
carries. The build resolves the baked origin as: ambient
`NEXT_PUBLIC_SITE_URL` → repo `.env` value → `http://localhost:3000` (the
`siteUrl()` fallback in `src/lib/seo.ts:71`). The spec must derive its
expectation from the SAME sources with the SAME precedence. This also
restores the LL-11 never-fetch-the-baked-origin invariant for the loc-parity
test (the no-op `replace` currently turns it into an external fetch of the
live production origin).

**TDD sequence.**
1. **RED (already proven)** — full e2e against the production-baked
   artifact: exactly the 5 seo failures quoted in F1. (No new test to write:
   the existing pins ARE the red proof — the suite is red under the
   operator's documented config.)
2. **GREEN** — replace `const BAKED_ORIGIN = "http://localhost:3000"` in
   `tests/e2e/seo.spec.ts` with a derivation: `process.env.NEXT_PUBLIC_SITE_URL`
   (bun-run loads the repo `.env` into the Playwright process, and ambient
   env beats `.env` — identical to what `next build` resolves; the
   playwright.config AUTH_SECRET comment documents the same bun-run env
   behavior) → fs-parse `<cwd>/.env` fallback (the `npx playwright test`
   path; anchored on `process.cwd()` per the documented global-setup.ts
   precedent — Playwright transpiles specs through its CJS loader, so
   `import.meta` is unavailable) → `"http://localhost:3000"` default (the
   seo.ts fallback). Update the spec's ORIGIN NOTE comment to record the
   derivation contract.
3. **Verify** — `bun run build` (production `.env`) → `bun run test:e2e` →
   63/63. The loc-parity test now fetches ONLY the local e2e server.

### Track B — live-secret redaction + regression guard (A1, TDD-first)

**Rationale.** The leaked `AUTH_SECRET` is the HMAC key for staff sessions:
public knowledge of it lets anyone forge a session cookie and read the
dashboard + CSV export (patient PII) on the live site. The tracked file must
be redacted, the leak class must be guarded so it cannot silently recur, and
the operator must rotate the live secret (code changes here cannot do that —
advisory documented in Part 3).

**TDD sequence.**
1. **RED** — new `tests/secrets.test.ts` (deps.test.ts style — fs-based, no
   git dependency, scans the documentation surfaces where paste-leaks land:
   repo-root `*.md`/`*.txt`, `docs/**/*.{md,txt}`, `.env.example`):
   (a) **no 64-hex runs** (`/[0-9a-fA-F]{64,}/` — the pasted-key class;
   currently matches exactly the leaked secret and nothing else);
   (b) **`AUTH_SECRET=` must be empty-valued** in doc surfaces (the only
   legitimate doc value is the `AUTH_SECRET=""` placeholder);
   (c) **`ADMIN_PASSWORD=` must be a placeholder** (allow: `change-me`,
   empty, `$`-prefixed escaped examples, `<`-containing placeholder markers).
   Run: expect exactly the A1 violations to fail (the leaked hex + the
   non-empty AUTH_SECRET assignment in start_server_log.txt).
2. **GREEN** — redact `docs/start_server_log.txt` lines 3-7: replace the
   `AUTH_SECRET` value with a `<redacted>` marker + a rotation note, and
   mark the credential block as redacted (the log's instructional value —
   the exact command sequence — is preserved).
3. **Guard stays** — the test is the permanent regression pin for the
   paste-leak class. Unit count 166 → 169.

**Operator advisories (documented, not executable here):** rotate the live
`AUTH_SECRET` (edit `.env` on the server → restart; invalidates all staff
sessions), change `ADMIN_PASSWORD` (re-run `bun run db:seed` with the new
value — the upsert rewrites the hash), and consider a history purge
(`git filter-repo` + force push) for the already-pushed blob — a destructive
operation requiring an explicit operator decision, deliberately NOT
attempted autonomously.

### Track C — repo hygiene (A2 + A3)

- `git rm package-lock.json` (root only; `skills/` is out of scope) — the
  repo is bun-locked (`bun.lock` is the lockfile of record; AGENTS/README/
  deployment log all document bun). Recorded as the A2 decision.
- `.gitignore`: add `db/*.db-wal` + `db/*.db-shm` beside the existing
  `db/*.db` lines (A3).
- **Commit the re-synced `bun.lock`** (plan-validation correction): the
  working-tree drift is NOT spurious churn — the operator's `a4109d5`
  bumped `package.json` ranges (`^6.19.3` / `^16.3.8` / …) without
  regenerating the lockfile (last synced at session-28's `9757e5d`). The
  30-line diff is exclusively the root block's range mirror — zero resolved
  versions changed — so committing it restores package.json ↔ bun.lock
  consistency per bun doctrine (restoring the stale HEAD lockfile would
  re-introduce the inconsistency).

### Track D — doc residuals (A4 + A5)

- README Architecture e2e row: add the `seo` + `dashboard-filters` specs.
- PAD §11: re-measure the three drifted rows (auth.spec 283, mobile-nav 178,
  seo.spec 160).
- A6/A7/A8 recorded as accepted residuals (no action — see Part 3).

### Track E — documentation alignment, verification, screenshots, commit + push

- README: Tested row 166 → 169 + the secrets-guard mention.
- AGENTS: Testing quirks gains the secrets-test note (doc-surface scan
  doctrine); the e2e A4 note in rule 11 is superseded by the derivation
  (update the wording).
- CLAUDE: Testing Strategy unit list gains the secrets seam; VERIFY counts.
- SKILL.md → v2.9.1 (frontmatter project_state + sessions list + §11 gate
  counts + Appendix B [S40]).
- PAD: [S40] revision block + §7.1/§7.3/§7.4 counts (169 unit / 63 e2e) +
  §10 known-issues row for the A1 operator-action residual (rotation
  pending) + §11 re-measured rows.
- `docs/session_40.md` + repo worklog Task 40 entry + workspace worklog.
- `.env.example` re-verified unchanged (no new env vars; tracked in the
  commit).
- Full gate re-held post-remediation **under the production `.env`** (the
  operator's documented config — the meaningful one for the derivation
  proof): lint / tsc / 169 unit / build / 63 e2e × 2 (double-run proof).
- Live parity re-verification on the remediated tree (no rendered surface
  changed — the Track A/B/C/D changes are test/docs/config only; re-probe
  the local dev server: desktop 7490px, mobile panel 192×148 @ (178,80),
  link-click scrollY 1837) + the 12-step product loop against the local
  server + probe rows purged (6 seed rows retained).
- Screenshots re-captured from the remediated dev server (the 20-shot set,
  per-run XFF key disjoint from every documented base).
- Commit on `main` (single `feat:` commit per convention) → SSH wrapper
  push (`docs/ssh_git_wrapper_v3.py`, explicit
  `--remote git@github.com:nordeim/health-care-clinic.git`) → remote-ref
  verification → operator key shredded.

### Considered and deliberately NOT remediated (doctrine)

- **History rewrite for A1** (`git filter-repo` + force push) — the blob is
  already on the public remote; a rewrite invalidates every clone and
  requires an explicit operator decision + coordination with the live
  deployment. Redaction + guard + rotation advisory is the safe autonomous
  scope. If the operator wants the purge, it is a follow-up session.
- **Live-site rotation** — no server access from this workspace; the
  advisory in Part 3 / Track B is the deliverable.
- **A6 reorder** (`searchParams` before the guard) — narrative only; the
  seam is pure, the invariant holds; reordering is churn without behavior.
- **A8 prune** — the eslint ignores are defensive against the operator's
  sandbox workspaces; removing them could break lint outside this repo
  checkout. Left as-is, documented.
- **npm-compat package-lock retention** — rejected: no doc or toolchain
  references npm; the deployment log uses bun; dual lockfiles are drift
  risk (the A2 evidence).
