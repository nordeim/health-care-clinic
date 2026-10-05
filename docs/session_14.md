# Session 14 — Footer Link Completion, e2e Cross-Run Keys, Security Headers, Login Email Bound & Transport-Message Curation

Continuation of `docs/session_12.md` / `docs/session_13.md`. Scope: refresh
workspace → review docs + session logs (12/13 + remediation-plan-session12) →
validate understanding against the codebase → re-audit with live reference
verification → remediate the new findings → re-verify → document → push.
The repo `skills/` folder stayed excluded from checking, testing and
compilation throughout.

## What was audited

- Workspace refreshed via `git pull` to `fcd6a33` (the session-12 remediated
  tree `8b52c73` + the docs-only operator transcript paste that became
  `docs/session_13.md`). Environment intact from the prior session:
  `.env` (operator credentials + `AUTH_SECRET`, leading-`$` escaped per the
  dotenv gotcha), `db/custom.db` at the repo root, node_modules present;
  the ambient `DATABASE_URL` hijack was ACTIVE again in the shell — the
  npm-script `env -u` guards held through every probe.
- Read AGENTS.md, CLAUDE.md, README.md, Project_Architecture_Document.md,
  health-care-clinic_SKILL.md, docs/session_12.md,
  docs/remediation-plan-session12.md, worklog.md, docs/session_13.md — then
  validated every claim against the tree.
- Baseline gates before any change: lint 0 / tsc clean / 85 unit / build OK
  (identical route table) / 38 e2e — all green, exactly as documented.
- `skills/code-review-and-audit` native-CLI fallback pipeline (static gates +
  `bun audit` — same two known dev-tooling advisories, accepted + a fresh-eyes
  full review dispatched as a read-only sub-agent — every finding
  re-verified empirically or line-by-line by the orchestrator before
  acceptance).
- `skills/agent-browser` live parity probes on BOTH the reference and the
  local clone (desktop 1440×900 + mobile 390×844 — the documented contract
  viewports).

## Key findings (full detail: docs/remediation-plan-session14.md)

The session-12 remediation held up — all gates green, live parity
byte-exact, every session-2/4/6/8/10/12 fix re-probed with zero
regressions. The new findings were the residuals five audits hadn't
surfaced:

1. **F1 (Low):** the two footer legal links still shipped as plain `<a>`
   MPA navigations — invisible to the enabled
   `no-html-link-for-pages` rule, which is structurally blind to non-root
   App-Router routes (the plugin's href normalization appends a trailing
   slash the route regexes lack, so only root-href anchors can ever match).
   Session-12's "three real hits" claim was true-as-the-rule-sees-it but
   five conversions existed in total.
2. **F2 (Low):** the impossible-dates e2e spec sent 3 requests under a
   FIXED spoofed XFF key (max 5/10 min) — a second suite run within 10
   minutes against a reused server would 429-flake it. The session-10 F6
   per-run-key doctrine had covered only the limiter/413 specs.
3. **F3 (Low):** zero standard security headers on any response and an
   exposed `X-Powered-By` (live-verified).
4. **F4 (Low):** `next build` embeds a byte-identical copy of `.env`
   (including the staff password + `AUTH_SECRET`) at
   `.next/standalone/.env` — the deployment runbook never warned shippers.
5. Plus: the login email had no length bound while appointments capped at
   254 (contract asymmetry), the dev PII query-log comment overstated
   exposure for Prisma 6.11 (bound parameters are NOT printed), and
   transport-level fetch failures surfaced the raw browser message
   ("Failed to fetch") verbatim in both forms.

## Live parity evidence (reference vs clone, same session, same method)

| Metric | Reference | Clone (remediated) |
| ------ | --------- | ----- |
| Page height @1440×900 | 7490px | 7490px |
| h2 / h3 computed | 60px/63px / 20px | identical |
| Mobile dropdown panel | 192×148 @ (178, 80), grid, r24, p8, `rgba(38,74,57,.9)`, 3 links | identical geometry; oklab-equivalent paint (documented v4 variance, e2e-rasterized) |
| Mobile menu link click | closes + unmounts; `#services` at 0.421875 | **identical to the pixel** (re-verified post-remediation) |
| `<title>` | `Base44 APP` placeholder | semantic titles (recorded deviation) |

Product loop re-verified twice (pre- and post-remediation): login → 200 →
dashboard → form POST → 201 → row visible on the authenticated dashboard.

## What was remediated (all TDD — Red confirmed before every Green)

- **Red phase first:** 3 new e2e tests written and confirmed failing
  against the current tree (login 300-char email → 401 not 422; header
  assertions absent; alert showed the raw "Failed to fetch").
- **Footer link completion (F1):** the two legal anchors converted to
  `next/link` (identical rendered markup — pinned by the existing
  legal-pages spec); the eslint config now documents the rule's blind spot
  so future audits know to grep for page-href anchors manually.
- **Per-run XFF keys everywhere (F2):** every request-level e2e spec now
  derives its spoofed key from the run timestamp with a spec-unique third
  octet — module-level constants that can collide neither within a run nor
  across runs (198.51.10x / 192.0.2.x bases, disjoint from the
  limiter/413/login-limiter pins' ranges).
- **Baseline security headers (F3):** `next.config.ts` now applies
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin` to every route and
  suppresses `X-Powered-By` (response headers are invisible to rendering —
  parity untouched; e2e-pinned; full CSP documented as the proxy-seam's
  job in DEPLOYMENT.md).
- **Login email bound (F5):** the login route imports `EMAIL_MAX_LENGTH`
  from the validation seam — one bound, both consumers; 300-char
  pattern-valid emails → 422 with the same message the appointments route
  gives (no new oracle: the 422 fires before DB/scrypt and the sender
  already knows the address is too long).
- **Curated transport failures (F7):** both forms map fetch's network
  `TypeError` to a warm curated message instead of the engine-specific raw
  string; every other Error keeps its already-curated message; e2e-pinned
  via `page.route(…).abort()` (no server sabotage needed).
- **Doc corrections (F4, F6):** DEPLOYMENT.md now warns that `.env`
  travels with the standalone artifact (strip or rotate); the db.ts dev-log
  comment corrected to Prisma 6.11 reality — query logs print SQL
  templates with `?` placeholders, bound values are NOT printed.

## Verification gate (final, post-remediation)

lint 0 errors · typecheck clean under true strict · **85/85 unit** (no unit
changes — the new pins are e2e-level) · production build OK with the
IDENTICAL route table · **41/41 e2e** (38+3: login email bound, security
headers, transport-failure message) · fresh dev boot healthy · live parity
spot-checks unchanged (7490px; mobile panel 192×148 @ (178,80); link-click
closes + jumps to 0.421875 — identical to the reference) · product loop
green end-to-end under the still-active ambient `DATABASE_URL` hijack ·
F3/F5 re-probed live (all three headers present, `X-Powered-By` gone;
300-char login email → 422) · audit probe rows purged from the dev DB ·
20 screenshots refreshed from the remediated dev server
(03-desktop-full is exactly 1440×7490 — the parity height).

## Outcome

Committed on `main` and pushed via `docs/ssh_git_wrapper_v3.py` (runbook:
`docs/how-to-git-push-using-ssh-wrapper_SKILL.md`); the operator key was
shredded after the push and the remote ref verified equal to local HEAD.
