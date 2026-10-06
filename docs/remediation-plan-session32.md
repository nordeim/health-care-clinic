# Remediation Plan — Session 32 (SEO Discoverability Layer, 17th Audit Cycle, Parity Re-Verification)

**Date:** 2026-10-06
**Scope:** Full fresh-eyes audit of the session-30 tree (`e6d7476` = `9aa1747`
+ the docs-only operator transcript that became `docs/session_31.md`), with
live re-verification against the reference site, then remediation of the new
findings. The repo `skills/` folder is excluded from checking, testing and
compilation per the operating instructions.
**Method:** `skills/code-review-and-audit` doctrine (static gates + a
fresh-eyes full review dispatched as a read-only sub-agent — every finding
re-verified by the orchestrator before acceptance), `skills/agent-browser`
live parity probes on the reference and the local clone (desktop 1440×900 +
mobile 390×844, viewport verified via `innerWidth`/`innerHeight` before every
measurement, settle-waits before height readings, rasterized-pixel color
proofs — never computed-string comparisons), `skills/tdd` doctrine
(red → green, one vertical slice at a time, seams agreed up front).
Reference patterns imported from `skills/nextjs-postgresql-single-app`
(sitemap.ts/robots.ts/seo.spec.ts shapes + the LL-11 host-rewrite lesson) and
the scandihaven repo (`seo-flows.spec.ts`: fetch every `<loc>`; group-aware
robots assertions).

---

## Part 1 — Audit Findings

### 1.1 Verified healthy (re-confirmed this session)

| # | Check | Evidence |
|---|-------|----------|
| H1 | Diff `9aa1747..e6d7476` is docs-only | exactly `docs/session_31.md` (+86); worktree clean after re-bootstrap |
| H2 | Baseline gates after workspace-reset re-bootstrap | lint 0 (14 correctness rules ON) · tsc clean under true strict · **107/107 unit** · build OK (identical 12-route table) · **44/44 e2e × 2** (the double-run proof, 54.6s + 51.5s) |
| H3 | Workspace-reset re-bootstrap | `.env` regenerated (generated credentials, never printed), `db:push` + `db:seed` + `SEED_DEMO=1` → exactly 6 demo rows (2/2/2) + 1 admin in `<repo>/db/custom.db`; the ambient `DATABASE_URL` hijack (`file:/home/z/my-project/db/custom.db`) stayed ACTIVE all session — `env -u` guards held (the hijack target file does not exist; every write landed in the repo DB, live-proven by the product loop) |
| H4 | Live desktop parity | Clone at VERIFIED 1440×900: page height **7490px** (byte-exact with the documented reference measurement), all 7 section ids (`top,about,services,insurance,providers,contact,faq`) |
| H5 | Mobile navigation (operator's key concern) | Reference AND clone at VERIFIED 390×844, same session, same method: panel geometry **byte-exact** (`192×148 @ (178, 80)`, `display: grid`, radius `24px`, padding `8px`; the panel is a `<nav>` in both); link activation closes + unmounts the panel and jumps — `#services` viewport-top **0.421875**, `scrollY 1837` — IDENTICAL on both sites; trigger label flips Open/Close on both |
| H6 | Tailwind v4 trap guards (live, rasterized) | Dropdown paint `[38,74,57,230]` **EXACT** (no bare-HSL transparency regression — trap #1); pill `[37,74,57,204]` — the documented ±1 oklab quantization drift inside the e2e near() tolerance; mobile page height 12162px vs reference 12164px — the documented 2px sub-pixel drift (contact section) |
| H7 | Full product loop + status transitions | anonymous `/dashboard` `307` → login `200` + httpOnly cookie (proven by the subsequent authorized `200`) → `/dashboard` `200` → public form POST `201 {ok,id}` → PATCH confirm `200` → PATCH complete `200` → anonymous PATCH `401` (curl — browser fetch cannot strip cookies, probe artifact only) → unknown id `404` → invalid status `422` → wrong credentials generic `401` → logout `200` → post-logout dashboard `307` — **all 12 steps correct**; the probe row purged after (exactly the 6 seed rows remain) |
| H8 | Operator asks verified | `DATABASE_URL="file:../db/custom.db"` with `db/` at the repo root (live-proven); vitest (`vitest.config.mts`) + Playwright (`playwright.config.ts`) suites present and green (re-run live: 107/107 + 44/44 × 2) |
| H9 | Reference site | UP and unchanged (title "Base44 APP"; robots.txt **404**; sitemap.xml **404**; no meta description/canonical/og: in served HTML — title is JS-set only) |
| H10 | Scandihaven (tech-stack patterns) | Same substrate doctrine (Next 16 + React 19 + TS strict + Tailwind v4 CSS-first + Vitest/Playwright); its `sitemap.ts`/`robots.ts`/`seo-flows.spec.ts` patterns (fetch every `<loc>`; group-aware robots assertions; sitemap/OG host from `NEXT_PUBLIC_SITE_URL`) are the imported reference for this session's enhancement; Turborepo/Drizzle/Better-Auth remain deliberate divergences |
| H11 | Session-30 fixes held | `seed-demo` in README tree/parenthetical/prose + CLAUDE File Organization + unit list; `motion.ts` in SKILL §5 tree; all four file-tree inventories complete (8/8 lib files, 13+3 components, 7 unit seams, 6 e2e specs) |
| H12 | Test counts exact | 107 unit (10+27+20+19+19+4+8) / 44 e2e (3+7+13+2+10+9) by declaration count — every "107/44" doc claim true |
| H13 | dev.log hygiene | No hydration errors, no failed API calls, no PII (only the expected probe responses) |

### 1.2 Issues found (remediation required)

All findings originate from the fresh-eyes sub-agent (Task 32-a, 17th audit
cycle) and were **re-verified by the orchestrator** (line-by-line reads +
greps + character-count arithmetic) before acceptance. **Zero
Critical/High/Medium; zero code bugs.** The entire finding set is ONE class:
**SEO discoverability hygiene** — the operator's stated issue ("No sitemap
and SEO hygiene mixed") confirmed and characterized. The reference app has
NO SEO infrastructure either (H9), so every fix is a **beyond-parity,
head-only enhancement** — the same doctrine class as the login/dashboard
extension (ADR-009) and the recorded S4-title / S24-favicon deviations:
nothing touches rendered body markup, so the 7490px/12162px parity
contracts and the rasterized trap guards are structurally unaffected.

| ID | Severity | Finding | Evidence |
|----|----------|---------|----------|
| F1 | **Low** | No sitemap and no robots surface at all: no `src/app/sitemap.ts`, no `src/app/robots.ts`, no `public/robots.txt`, no `public/sitemap.xml` | `ls src/app/ public/`; reference also 404s both (H9) — the gap is real but the fix is beyond-parity |
| F2 | **Low** | Zero canonical URLs — no `alternates.canonical` on any of the 5 routes | `rg alternates src/app/` → no matches |
| F3 | **Low** | openGraph incomplete (missing `url`, `siteName`, `locale`, `images`) + no twitter card + no social-card image asset in `public/` | `layout.tsx:31-36`; `ls public/` (7 media files only) |
| F4 | **Low** | Root meta description is 167 chars — over the ~160-char SERP truncation bound (serves the landing page, which has no per-page metadata) | char-count arithmetic; all other page descriptions 88/101/93/54/41 chars (fine) |
| F5 | **Info** | No `title.template` — the `"— Green Grove Family Clinic"` suffix is hand-duplicated on all 4 sub-pages. Safe ONLY atomically (template + shortened page titles in one change), else the suffix doubles and breaks `legal-pages.spec.ts:10,33` | 5 title strings read; pins at `legal-pages.spec.ts:10,33` (suffixed) + `landing.spec.ts:17` (root default) |
| F6 | **Info** | No JSON-LD structured data (MedicalClinic/LocalBusiness schema). DELIBERATELY NOT REMEDIATED: the legal/contact copy is verbatim-reference **placeholder data** (`info@mysite.com`, `123-456-7890`) — publishing schema would advertise fake NAP | `rg "ld+json"` → none; `privacy-policy/page.tsx:56-62` |
| F7 | **Info** | No web manifest. DELIBERATELY NOT REMEDIATED: the reference has none either; not a ranking factor; parity doctrine keeps it out | `ls public/ src/app/` |
| F8 | **Info** | `metadataBase` silently falls back to `http://localhost:3000` while `docs/DEPLOYMENT.md:93` + PAD §8.2 mark `NEXT_PUBLIC_SITE_URL` merely "optional" — the moment canonical/OG/sitemap URLs exist, a production deploy without the env emits localhost URLs | `layout.tsx:12`; `DEPLOYMENT.md:93` |
| F9 | **Info** | `applicationName: "Health Care Clinic"` vs the brand "Green Grove Family Clinic" — cosmetic naming inconsistency | `layout.tsx:22` vs `:19` |
| F10 | **Info** | The SEO gap class is unrecorded in PAD §10 Known Issues (the "every accepted limitation is recorded" doctrine — §10 has rows for the favicon gap and skip-link but nothing for sitemap/canonical/OG) | PAD §10 table read |

### 1.3 Considered and deliberately NOT remediated (doctrine)

| Item | Decision | Rationale |
|------|----------|-----------|
| JSON-LD structured data (F6) | Skip | The site's NAP copy is placeholder parity content; MedicalClinic schema with fake phone/email is dishonest SEO. Revisit when real clinic data exists. |
| Web manifest (F7) | Skip | Reference has none; not a ranking factor; a manifest implies PWA semantics this marketing site does not claim. |
| `Disallow: /login`, `/dashboard`, `/api` in robots.txt | Skip — allow-all | SEO-correct choice: both staff pages emit `noindex,nofollow` metas (ADR-009); blocking them in robots.txt would HIDE the noindex directive from crawlers (Google's documented interaction — blocked pages can still be indexed URL-only from links). `/api` GETs are harmless (405/404/JSON) with zero crawl-budget concern at this scale. The e2e spec pins the ABSENCE of Disallow so a future blanket-block regression cannot land silently. |
| Per-page canonical/OG on `/login` + `/dashboard` | Skip | noindex surfaces: canonical is semantically contradictory there and OG is pointless. Both inherit the root OG (status quo); their titles DO get the template treatment (suffix composed identically to today's strings — no rendered change). |
| Rewriting legal-page copy with real NAP | Skip | Copy is verbatim-parity (the content discipline: all copy changes go through `src/lib/content.ts` and reference copy stays verbatim). |
| Static `lastModified` dates in the sitemap | Skip — use build time | Calendar-coupled literals erode (the S26 F4 doctrine); `new Date()` stamps at build time and self-renews. The e2e spec asserts locs + resolvability, never timestamps. |
| Any rendered-body change | Hard skip | The parity contracts (7490px / 12162px / rasterized pixels / byte-exact section markup) are load-bearing; every fix in this plan is head-only or a new route file. |

---

## Part 2 — Remediation Plan

All changes land on `main` (no new branches). `skills/` stays out of
lint/typecheck/test/build. **Zero new npm dependencies** (the dependency
contract `tests/deps.test.ts` pins the allowlist; sitemap/robots use Next's
built-in `MetadataRoute` types) and **zero new `scripts/` entries** (the same
contract pins `scripts/` = `seed.ts`; the og-image generator and the
screenshot capture script live in the WORKSPACE `scripts/` dir, outside the
repo).

### New seam: `src/lib/seo.ts` (pure, unit-tested — the metadata composer)

The metadata composition becomes a tested seam like `auth.ts` /
`validation.ts`, instead of hand-duplicated objects in five page files.

```
SITE_NAME                    "Green Grove Family Clinic"
SITE_TITLE_TEMPLATE          `%s — Green Grove Family Clinic`
OG_IMAGE                     { path: "/og-image.png", width: 1200, height: 630, alt }
PUBLIC_PATHS                 ["/", "/privacy-policy", "/accessibility-statement"]
ROOT_DESCRIPTION             ≤160 chars (F4 trim)
MAX_DESCRIPTION_LENGTH       160 (SERP bound — the invariant's independent truth)
siteUrl(): string            process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
ogTitleFor(title, path)      plain at "/", suffixed below root
pageMetadata({title, description, path}): Metadata
                             → title, description, alternates.canonical,
                               complete openGraph (title/description/type/url/
                               siteName/locale/images), twitter card
```

### Phase 1 — RED: the seam contract (`tests/seo.test.ts`) → GREEN: `src/lib/seo.ts`

TDD slice 1 (one seam, red before green):

1. Write `tests/seo.test.ts` FIRST — failing on the missing module. Cases
   (~12):
   - `pageMetadata` composes `alternates.canonical` = the given path
   - `openGraph.url` = the path; `siteName` = SITE_NAME; `locale` = "en_US"
   - `openGraph.images` = exactly the OG_IMAGE entry (path/width/height/alt)
   - `twitter.card` = "summary_large_image"
   - `ogTitleFor` is plain SITE_NAME at "/", suffixed `— SITE_NAME` below
   - ROOT_DESCRIPTION length ≤ MAX_DESCRIPTION_LENGTH (independent bound: 160)
   - PUBLIC_PATHS equals exactly the 3 public routes and NEVER contains
     "/login" or "/dashboard" (the noindex surfaces — derived-allowlist
     doctrine, mirrors validation.ts)
   - `siteUrl()` falls back to `http://localhost:3000` (env unset in unit runs)
   - SITE_TITLE_TEMPLATE ends with SITE_NAME and contains `%s`
2. Implement `src/lib/seo.ts` minimally to pass.
3. Acceptance: `bunx vitest run tests/seo.test.ts` green; unit suite
   107 → 119.

### Phase 2 — Atomic title.template + metadata wiring (root + 4 pages)

TDD slice 2 — the EXISTING e2e title pins are the net (they pin the composed
strings; a broken template composition fails them):

4. Root `layout.tsx`: metadata composed via the seam — `title:
   { default: SITE_NAME, template: SITE_TITLE_TEMPLATE }`,
   `metadataBase: new URL(siteUrl())`, `applicationName: SITE_NAME` (F9),
   root canonical "/" (F2), complete OG (F3) + twitter card, root
   description from the seam (F4), robots index/follow kept, keywords kept.
5. `privacy-policy/page.tsx` + `accessibility-statement/page.tsx`:
   `export const metadata = pageMetadata({ title: "Privacy Policy" |
   "Accessibility Statement", description: <unchanged>, path })` — titles
   LOSE the hand-written suffix (the template composes it back identically).
6. `login/page.tsx` + `dashboard/page.tsx`: title strings lose the suffix
   (template composes the identical rendered string); robots noindex kept.
7. Acceptance: `bunx playwright test tests/e2e/legal-pages.spec.ts` green
   (the atomicity proof — composed titles unchanged) + `landing.spec.ts:17`
   green; unit suite still green.

### Phase 3 — RED: the served SEO surface (`tests/e2e/seo.spec.ts`) → GREEN: `sitemap.ts` + `robots.ts` + `og-image.png`

TDD slice 3–5 (each new surface goes red on a 404 first, then green):

8. Write `tests/e2e/seo.spec.ts` FIRST — failing while the routes 404.
   Tests (~12):
   - `robots.txt`: 200 · text/plain · contains `User-agent: *` · contains
     `Allow: /` · contains `Sitemap: <origin>/sitemap.xml` · does NOT
     contain `Disallow` (the allow-all contract, pinned — see §1.3)
   - `sitemap.xml`: 200 · XML content type · contains exactly the 3 public
     locs at the served origin · does NOT reference `/login` or `/dashboard`
   - **Sitemap parity (scandihaven R5-3):** host-rewrite every `<loc>`
     origin → the e2e base URL (LL-11 — the build bakes `.env`'s
     localhost:3000 origin into the static sitemap), then fetch each loc →
     200
   - Landing head: `link[rel=canonical]` href = `<origin>/` ·
     `og:title` / `og:description` / `og:site_name` / `og:url` /
     `og:locale` (en_US) / `og:image` (contains `/og-image.png`) ·
     `twitter:card` = summary_large_image
   - Legal pages: canonical href + suffixed `og:title` each
   - `og-image.png`: 200 · `image/png` · PNG IHDR dimensions 1200×630
     (parse the 8-byte signature + IHDR width/height — a real dimension pin)
   - `/login` + `/dashboard`: `<meta name="robots" content="noindex">`
     present (the ADR-009 contract, first time e2e-pinned)
9. GREEN A: implement `src/app/sitemap.ts` —
   `MetadataRoute.Sitemap` from PUBLIC_PATHS (priority 1 for "/", 0.7
   below; `changeFrequency: "monthly"`; `lastModified: new Date()` —
   build-time, self-renewing).
10. GREEN B: implement `src/app/robots.ts` — allow-all +
    `sitemap: ${siteUrl()}/sitemap.xml` (no Disallow — §1.3 doctrine,
    commented in the file).
11. GREEN C: generate `public/og-image.png` (1200×630) —
    workspace-script Playwright render of an on-brand HTML card (clinic
    green `#264a39`, the icon.svg heart-rate roundel in warm sand
    `#f3ead0`, DM Sans name + tagline). The generator lives OUTSIDE the
    repo (deps contract); the PNG is a committed public asset (same class
    as the vendored `public/media/*`).
12. Acceptance: `bunx playwright test tests/e2e/seo.spec.ts` green; full
    e2e 44 → 56; build route table 12 → 14 routes (`/robots.txt`,
    `/sitemap.xml` static).

### Phase 4 — Full verification gate (the regression net)

13. `bun run lint && bun run typecheck && bun run test && bun run build &&
    bun run test:e2e` — acceptance: lint 0 under the 14 ON rules, tsc
    clean, **119/119 unit**, build OK with the expected 14-route table,
    e2e **56/56** plus the **double-run proof** (a SECOND consecutive
    `test:e2e` within the 10-min limiter window must ALSO be 56/56).
14. Live re-verification on the remediated tree: page height 7490px
    unchanged; mobile panel 192×148 @ (178,80); link-click 0.421875 /
    scrollY 1837; rasterized trap guards green; `/api/health` up; the
    12-step product loop green under the still-active ambient
    `DATABASE_URL` hijack; dev.log clean.

### Phase 5 — Screenshots refresh (20 captures)

15. Re-capture all 20 screenshots in one scripted Playwright pass from the
    remediated dev server (the hardened session-26/28/30 patterns:
    viewport set before goto, settle-waits, per-run XFF key injection on
    browser POSTs via `page.route` — this session's base 198.51.125.x,
    disjoint from every documented base — hash-nav form remount fix
    [reload after the success state], native-validation-aware field-error
    path ["Al" + valid phone], dashboard via real login, legal pages
    guarded on `<main>`); dashboards must show the 6 seed rows;
    03-desktop-full exactly 1440×7490; the capture's submission row purged
    after (6 seed rows retained). The capture script is rebuilt this
    session in the WORKSPACE `scripts/` dir (the workspace was reset; the
    prior persisted script is gone).

### Phase 6 — Documentation alignment (every living doc swept)

16. **README.md**: Key Features + Architecture notes gain the SEO layer
    (sitemap/robots/canonical/OG/twitter); File Hierarchy gains
    `seo.ts`, `sitemap.ts`, `robots.ts`, `og-image.png`; Testing section
    counts 107→119 / 44→56 + the new `seo` spec in the e2e list; the
    Environment Variables note for NEXT_PUBLIC_SITE_URL explains the
    sitemap/canonical/OG resolution.
17. **AGENTS.md**: the codebase description gains the SEO surfaces; the
    e2e count 44→56; the non-obvious rules gain the LL-11 host-rewrite
    note (sitemap locs are build-time-baked) and the allow-all robots
    doctrine.
18. **CLAUDE.md**: File Organization + Testing + Success Metrics updated
    (119/56, seo seam + seo spec).
19. **health-care-clinic_SKILL.md**: frontmatter → v2.8.7 (sessions list,
    project_state) + §5 tree gains `seo.ts` + the e2e/unit counts + §3
    (bootstrapping unchanged) + Appendix B `[S32]` entry.
20. **Project_Architecture_Document.md**: new **ADR-011** (SEO
    discoverability layer as a beyond-parity head-only extension — the
    ADR-009 pattern applied to discoverability); `[S32]` revision block;
    §3.2 tree + §7.1 test distribution + §7.3/§7.4 counts + §8.2 env note
    (F8) + §10 rows (F10: the SEO gap recorded as Closed session-32;
    robots-allow-all decision recorded).
21. **docs/DEPLOYMENT.md** + **.env.example**: NEXT_PUBLIC_SITE_URL note
    upgraded from "optional" to "recommended in production — canonical,
    OG, and sitemap URLs resolve against it; unset means localhost URLs
    are baked into those tags at build time" (F8).
22. **docs/session_32.md** (the session record) + the repo `worklog.md`
    orchestrator entry (Task 32; 32-a already appended to the workspace
    worklog).

### Phase 7 — Commit + push

23. Secret scan (`git grep` for the live credentials — 0 hits expected),
    `git add` the remediated tree (NEVER `.env`, `db/*.db`, logs),
    Conventional Commit on `main`, push via `docs/ssh_git_wrapper_v3.py`
    (runbook: `docs/how-to-git-push-using-ssh-wrapper_SKILL.md` — dry-run
    first, explicit `--remote`, remote ref verified == local HEAD,
    operator key shredded after).
