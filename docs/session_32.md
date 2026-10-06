# Session 32 — SEO Discoverability Layer, 17th Audit Cycle, Parity Re-Verification

Continuation of `docs/session_30.md` / `docs/session_31.md`. Scope: refresh
workspace (`git clone` — the workspace had been reset again) → review docs +
session logs (30 + remediation-plan-session30 + worklog + 31) → validate
understanding against the codebase → re-audit with live reference
verification → remediate the new findings (the operator's stated issue:
"No sitemap and SEO hygiene mixed") → re-verify → document → push. The repo
`skills/` folder stayed excluded from checking, testing and compilation
throughout.

## What was audited

- Workspace refreshed via fresh `git clone` → `e6d7476` (= session-30's
  `9aa1747` + the docs-only operator transcript that became
  `docs/session_31.md`); the worktree was clean, but the workspace RESET
  took `.env`, `db/`, and `node_modules` with it — re-bootstrapped from the
  documented workflow (generated credentials never printed;
  `bun install` → `db:push` → `db:seed` → `SEED_DEMO=1` → exactly the 6
  demo rows (2/2/2) + 1 admin in `<repo>/db/custom.db`). The ambient
  `DATABASE_URL` hijack (`file:/home/z/my-project/db/custom.db`) was ACTIVE
  all session; every write landed in the repo DB (live-proven by the
  product loop) — the ADR-010 `env -u` guards held; the hijack target file
  does not exist.
- Read AGENTS.md, CLAUDE.md, README.md, Project_Architecture_Document.md,
  health-care-clinic_SKILL.md (v2.8.6), docs/session_30.md,
  docs/remediation-plan-session30.md, worklog.md, docs/session_31.md —
  then validated the claims against the tree.
- Operator asks verified against the codebase: `.env`
  `DATABASE_URL="file:../db/custom.db"` with `db/` at the repo root
  (live-proven); the vitest + playwright suites present and green
  (re-run live: 121/121 + 53/53 × 2 post-remediation).
- Baseline gates before any change: lint 0 / tsc clean / 107 unit /
  build OK (12-route table) / 44 e2e × 2 (the double-run proof, 54.6s +
  51.5s) — all green, exactly as documented.
- `skills/code-review-and-audit` pipeline (static gates) + a fresh-eyes
  full review dispatched as a read-only sub-agent (Task 32-a) — every
  finding re-verified line-by-line by the orchestrator before acceptance.
- `skills/agent-browser` live parity probes on BOTH the reference and the
  local clone (desktop 1440×900 + mobile 390×844) — viewport verified via
  `innerWidth`/`innerHeight` before every measurement, settle-waits before
  height readings, rasterized-pixel color proofs.
- Scandihaven (tech-stack patterns repo, re-cloned) — same substrate
  doctrine; its `sitemap.ts`/`robots.ts`/`seo-flows.spec.ts` patterns
  (fetch every `<loc>`; group-aware robots assertions) imported for this
  session's enhancement, plus the `nextjs-postgresql-single-app` skill's
  LL-11 host-rewrite lesson.

## Key findings (full detail: docs/remediation-plan-session32.md)

The session-30 remediation held up — all gates green, every prior fix
re-probed with zero regressions. The 17th audit found **zero code bugs**;
the entire finding set (10 findings: 4 Low + 6 Info) is ONE class — the
operator's stated SEO gap, confirmed and characterized:

1. **F1 (Low):** No sitemap and no robots surface at all (the reference
   404s both too — so the fix is beyond-parity, head-only).
2. **F2 (Low):** Zero canonical URLs on any route.
3. **F3 (Low):** openGraph incomplete (no url/siteName/locale/images) + no
   twitter card + no social-card image asset.
4. **F4 (Low):** Root meta description 167 chars — over the ~160 SERP
   truncation bound.
5. **F5 (Info):** No `title.template` — the brand suffix hand-duplicated
   on all 4 sub-pages (safe only atomically).
6. **F6–F7 (Info):** No JSON-LD (deliberately skipped: the NAP copy is
   verbatim-reference placeholder data — schema would advertise fake
   phone/email); no manifest (reference has none either).
7. **F8 (Info):** `NEXT_PUBLIC_SITE_URL` documented merely "optional"
   while canonical/OG/sitemap URLs bake from it at build time.
8. **F9 (Info):** `applicationName` was the repo name, not the brand.
9. **F10 (Info):** The SEO gap class unrecorded in PAD §10.

## Live parity evidence (reference vs clone, same session, same method)

| Metric | Reference | Clone (remediated) |
| ------ | --------- | ----- |
| Page height @1440×900 (viewport VERIFIED) | 7490px | 7490px — before AND after the SEO change |
| Section ids | top/about/services/insurance/providers/contact/faq | identical |
| Mobile dropdown panel (390×844) | 192×148 @ (178,80), grid, r24, p8, `rgba(38,74,57,.9)` — a `<nav>` | identical geometry (also a `<nav>`); rasterized paint [38,74,57,230] EXACT |
| Mobile menu link click | closes + unmounts; `#services` at 0.421875, scrollY 1837 | **identical to the pixel** (0.421875 / scrollY 1837) |
| Mobile page height (settled) | 12164px | 12162px — the documented 2px sub-pixel drift |
| Rasterized pill pixel | rgb(38 74 57 / .8) | [37,74,57,204] (the documented ±1 oklab drift) |

Product loop re-verified with the status transitions included — all 12
steps correct (anonymous 307 → login 200 + httpOnly cookie → dashboard 200
→ POST 201 → PATCH confirm 200 → PATCH complete 200 → anonymous PATCH 401
→ unknown id 404 → invalid status 422 → wrong credentials generic 401 →
logout 200 → post-logout 307) — under the still-active ambient
`DATABASE_URL` hijack, with the write verified in `<repo>/db/custom.db`;
the probe row purged after (exactly the 6 seed rows remain).

## What was remediated (TDD-first; docs/remediation-plan-session32.md)

A second beyond-parity, HEAD-ONLY extension (ADR-011 — the ADR-009
doctrine applied to discoverability; zero rendered-body markup, so the
parity contracts are structurally untouched — live-proven by the unchanged
7490px / panel geometry / link-click / rasterized pixels above):

- **Slice 1 (RED → GREEN):** `tests/seo.test.ts` written FIRST — failing
  on the missing module — then the pure seam `src/lib/seo.ts`: the brand +
  title-template constants, the ≤160-char SERP description bound, the OG
  image 1200×630 contract, the `PUBLIC_PATHS` sitemap allowlist (never the
  noindex routes — the derived-allowlist doctrine), `siteUrl()`,
  `ogTitleFor()`, and the `pageMetadata()` composer. 14 unit cases;
  suite 107 → 121.
- **Slice 2 (atomic title.template):** root `layout.tsx` metadata composed
  via the seam (`title: { default, template }`, `metadataBase`,
  `applicationName` = the brand (F9), canonical "/", complete OG + twitter
  card, the trimmed root description (F4)); both legal pages switched to
  `pageMetadata(...)` with BARE titles; login/dashboard titles
  de-suffixed. Proved atomic by the UNCHANGED e2e title pins
  (legal-pages + landing: 16/16) — the template composes the identical
  rendered strings.
- **Slice 3 (RED → GREEN):** `tests/e2e/seo.spec.ts` written FIRST — both
  new routes 404 — then `src/app/sitemap.ts` (the 3 public routes from
  PUBLIC_PATHS; build-time self-renewing `lastModified` — the S26 F4
  anti-erosion doctrine), `src/app/robots.ts` (ALLOW-ALL + the sitemap
  reference; NO Disallow by decision — the staff pages' noindex METAS
  must stay crawler-visible, Google's documented robots.txt × noindex
  interaction; the spec pins the absent Disallow), and the generated
  `public/og-image.png` (1200×630, on-brand: clinic green, the icon.svg
  heart-rate glyph, DM Sans; the generator lives OUTSIDE the repo per the
  deps contract). 9 e2e tests: robots allow-all + absent Disallow, both
  sitemap 404s proven first, loc parity (every advertised loc fetches 200
  after the LL-11 host rewrite), canonical/OG/twitter head tags on all
  public pages, the og-image PNG IHDR 1200×630 dimension pin, and the
  staff noindex metas (first time e2e-pinned). Suite 44 → 53.
- **Docs:** every living doc swept — README (Key Features + File Hierarchy
  + Tested row + env note + Testing note), AGENTS (codebase description +
  e2e count + rule 11: the baked-origin/LL-11 + allow-all-robots +
  bare-title doctrine), CLAUDE (File Organization + Testing + Success
  Metrics), SKILL.md → v2.8.7 (frontmatter + §5 tree + §11 counts +
  Appendix B [S32]), PAD (ADR-011 + [S32] revision block + §3.2 tree +
  §7.1/§7.3/§7.4 counts + §8.2 env note + §10 rows + §11 rows),
  DEPLOYMENT.md + `.env.example` (NEXT_PUBLIC_SITE_URL upgraded from
  "optional" to production-recommended with the build-time-baking
  rationale), this session record, and the repo worklog entry.

## Verification gate (final, post-remediation)

lint 0 errors (14 correctness rules ON) · typecheck clean under true
strict · **121/121 unit** · production build OK with the expected
**14-route table** (`/robots.txt` + `/sitemap.xml` new static routes) ·
**53/53 e2e × 2 consecutive runs (the double-run proof, 54.8s + 57.3s —
within the 10-min limiter window)** · live re-verification on the
remediated tree: page height 7490px unchanged; mobile panel 192×148 @
(178,80); link-click 0.421875 / scrollY 1837; rasterized trap guards
green (dropdown exact, pill ±1 oklab); `/api/health` up; the full 12-step
product loop green under the still-active ambient `DATABASE_URL` hijack ·
20 screenshots refreshed from the remediated dev server
(03-desktop-full exactly 1440×7490 — the parity height; dashboards show
the 6 seed rows; 05-mobile-menu-open grid-sampled 24/24 green-dominant;
the capture's submission row purged after) · dev.log clean (no hydration
errors, no failed API calls, no PII).

## Outcome

Committed on `main` and pushed via `docs/ssh_git_wrapper_v3.py` (runbook:
`docs/how-to-git-push-using-ssh-wrapper_SKILL.md`); the operator key was
shredded after the push and the remote ref verified equal to local HEAD.

**Suggested next steps** (recorded for a future session; the PAD §10
backlog remains empty of actionable code items): dashboard
filtering/search or CSV export for staff records — both beyond-parity
surfaces, no parity impact; revisit JSON-LD structured data if real
clinic NAP data ever replaces the placeholder parity copy.
