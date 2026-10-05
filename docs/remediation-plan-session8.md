# Remediation Plan — Session 8 (HTTP-Edge Hardening, Validation Seams & A11y Completion)

**Date:** 2026-10-05
**Scope:** Full re-audit of the session-6 remediated tree (`010b800`…`683691b`;
the latter is docs-only — the operator transcript paste that became
`docs/session_7.md`), with live re-verification against the reference site,
plus remediation of the new findings. The repo `skills/` folder is excluded
from checking, testing and compilation per the operating instructions.
**Method:** `skills/code-review-and-audit` native-CLI fallback pipeline
(static gates + `bun audit` + a fresh-eyes full-tree review), `skills/agent-browser`
for live parity probes on both the reference and the local clone (desktop
1440×900 + mobile 390×844), `skills/tdd` doctrine — the green 33-unit +
28-e2e suite is the characterization net; every new behavior gets a failing
test first.

---

## Part 1 — Audit Findings

### 1.1 Verified healthy (re-confirmed this session)

| # | Check | Evidence |
|---|-------|----------|
| H1 | Lint gate | `bun run lint` → 0 errors |
| H2 | Type gate | `bun run typecheck` → clean |
| H3 | Unit layer | `bun run test` → 33/33 (db-path 15 + auth 14 + deps 4) |
| H4 | Production build | `bun run build` → OK; route table identical to the documented one (4 static + 5 dynamic + /_not-found) |
| H5 | E2E layer | `bun run test:e2e` → 28/28 (5 spec files, single worker) |
| H6 | Live landing parity | Reference vs clone at 1440×900: page height **7490px both**; h2 `60px` both; h3 `20px` both; all 7 section ids present both; reference `<title>` still the `Base44 APP` placeholder (recorded deviation, e2e-pinned) |
| H7 | Mobile navigation (operator's key concern) | Panel geometry **byte-exact both sides**: `192×148 @ top 80`, `display: grid`, radius `24px`, padding `8px`, paint `rgba(38,74,57,.9)` (clone computes the oklab equivalent — documented v4 format variance; e2e rasterizes the pixel); trigger ARIA contract on both; 3 links both |
| H8 | Mobile menu behavior | Link activation closes + jumps: `#services` lands at viewport top **0.421875 on BOTH sites** (re-measured this session via the *visible* panel — an earlier probe in this session accidentally clicked the hidden desktop link and briefly suggested otherwise; the visible-panel probe matches sessions 4/6 exactly) |
| H9 | Env determinism | Shell carried an ACTIVE ambient `DATABASE_URL=file:/home/z/my-project/db/custom.db` (parent-dir `.env`); this session's own un-guarded probe script was even redirected by it (Error 14) — `POST /api/appointments` → `201` → rows verified in `<repo>/db/custom.db`, absent from the hijack location; dashboard renders both probe rows. The `env -u` guards held under the exact threat they exist for |
| H10 | Staff auth loop | Operator-credential login → `200` → `/dashboard` renders stats + the new rows |
| H11 | Reference drift | Reference unchanged since session 6: same title placeholder, 7490px, panel contract, `servicesTop 0.421875`, `/login` platform-404 |
| H12 | Reference structure probes (NEW this session) | Reference date input has **no `min` attribute**; reference `tel:` hrefs are uniformly `tel:+11234567890`; reference form uses native validation (`noValidate=false`); reference body HAS a `<main>` element (clone matches) and NO skip link; reference mobile panel is **unmounted when closed** (clone matches) |
| H13 | Environment | `.env` = `DATABASE_URL="file:../db/custom.db"` + operator credentials + `AUTH_SECRET`; `.env.example` matches the codebase; `db/` at repo root with `custom.db` + `e2e.db`; vitest + playwright configs correct and green |
| H14 | Security scans | Secret-pattern scan (excl. `skills/`): only the documented dev-fallback constant + e2e test credentials; zero `eval`/`innerHTML`/`child_process`; zero TODO/FIXME; console usage is structured error logging only |
| H15 | `bun audit` | Same two known dev-tooling advisories (`braces` via eslint-config-next, `deepmerge-ts` via prisma) — re-verified unfixable upstream, accepted dev-time risk |

### 1.2 Issues found (remediation required)

All verified line-by-line in the source this session before acceptance:

| ID | Severity | Finding | Evidence |
|----|----------|---------|----------|
| F1 | **High (security)** | **Login user-enumeration timing oracle.** `login/route.ts:89` — `admin !== null && verifyPassword(…)`: the `&&` short-circuits, so unknown-email requests skip scrypt entirely and return ~30ms faster than wrong-password requests (scrypt N=16384 ≈ 30ms — far above network jitter). The header comment's "no user-enumeration oracle" claim is true of the response body only, not the timing channel. | `src/app/api/auth/login/route.ts:87-97` |
| F2 | **Medium (security)** | **Rate-limit key is client-controllable.** Both limiters key on the FIRST `x-forwarded-for` token (`appointments/route.ts:81`, `login/route.ts:52`). Direct clients rotate fabricated XFF values for unlimited fresh buckets; behind an append-style proxy (`proxy_add_x_forwarded_for`) the first token is still client-supplied. Converse failure: all XFF-less requests share one `"unknown"` bucket. | both route files |
| F3 | **Medium (UX/a11y)** | **Client discards the server's 422 `fields` map.** Both forms read only `body.error` ("Please check the highlighted fields.") and drop `body.fields` — nothing is highlighted, no `aria-invalid`/`aria-describedby` wiring. Reachable today: a 2-char name or a crafted past date. | `appointment-form.tsx:49-54`, `login-form.tsx:44-48` |
| F4 | **Medium (validation)** | **Impossible calendar dates pass validation via JS Date rollover** (verified live): `"2025-02-31"` → Mar 3, `"2025-04-31"` → May 1 — the `Number.isNaN` guard never trips for day overflow; garbage strings persist into `preferredDate` and flow into the dashboard's upcoming-visits `gte`. | `appointments/route.ts:129-139`; node repro this session |
| F5 | **Medium (robustness)** | **Reveal content is permanently invisible if the JS bundle fails while `scripting: enabled`.** The hiding CSS reflects the browser *preference*, not whether scripts loaded — a failed/blocked chunk (the exact class of the documented Next 16 dev-origin trap) leaves the 8 service cards at `opacity: 0` forever. The reference's Framer `whileInView` applies the hidden state from JS, so its failure direction is *visible*. | `globals.css:253-267` + `reveal.tsx` |
| F6 | **Medium (a11y)** | **Inconsistent reduced-motion guards.** `badge-enter` and `[data-reveal]` have `prefers-reduced-motion` guards; `animate-heartbeat` (services ECG, infinite alternate) does not; the autoplaying hero video has no reduced-motion handling. WCAG 2.2.2. | `globals.css:52,230,272`; `hero.tsx:42-53` |
| F7 | **Medium (parity bug)** | **`tel:` href formats deviate from the reference.** Reference is uniformly `tel:+11234567890`; the clone's contact + footer (from `content.ts:186,193`) use `tel:1234567890`. | live probe both sites this session |
| F8 | **Low (config/doc)** | **"TypeScript strict" claims vs actual config.** `tsconfig.json:13` sets `noImplicitAny: false` (undermining `strict: true`); `next.config.ts:11` sets `typescript.ignoreBuildErrors: true`. Docs claim strict (README, CLAUDE.md, PAD). `tsc --noEmit` is green today — enforcement is what's missing. | config files |
| F9 | **Low (config)** | **`NEXT_PUBLIC_SITE_URL` documented as "used for metadata tags" but never read** — `layout.tsx` sets no `metadataBase`, so OG/metadataBase URLs stay request-relative. | grep zero refs; `.env.example` claim |
| F10 | **Low (supply chain)** | **`@types/node` is a phantom dependency** — imported everywhere via `node:*` builtins, provided transitively by vitest (^24 declared vs 26.6.4 installed — drift), absent from `package.json`; the deps allowlist pin would even fail if someone declared it. | `node_modules/@types/node/package.json` |
| F11 | **Low (test infra)** | **Playwright webServer `AUTH_SECRET` is implicit** — spread from `process.env` and only present because bun auto-loads `.env`; run via `npx playwright test` (or CI without .env) and every login 500s (production signing throws). | `playwright.config.ts:40-48` |
| F12 | **Low (robustness)** | **No request body size cap** — App Router route handlers buffer `await request.json()` with no built-in limit; combined with F2, oversized POSTs are a memory-exhaustion vector. | both route files |
| F13 | **Low (maintainability)** | **`ALLOWED_SPECIALTIES` hand-duplicates `content.ts` services** (9 strings in a second place). Content drift would make the API reject valid select options. | `appointments/route.ts:18-28` |
| F14 | **Info (test gaps)** | Zero tests for either rate limiter (no `429` anywhere in `tests/`); cookie contract pins `httpOnly` only (`sameSite`/`secure` unpinned); no impossible-date or client-422-UI tests. | `tests/` grep |

### 1.3 Considered and deliberately NOT remediated (parity doctrine)

| Item | Decision | Rationale |
|------|----------|-----------|
| Skip-to-content link | Keep out | The reference verifiably has NO skip link (probed this session). The landing page is the byte-faithful parity surface; the fixed header is small (3 links + CTA). Recorded as a reference-shared WCAG 2.4.1 limitation in the PAD known-issues table. |
| `aria-controls` dangling while closed; focus drop on link activation | Keep | The reference unmounts the panel when closed (probed) and its link activation also leaves focus on `<body>` — both behaviors match the reference exactly. Our `aria-controls`/label-swap is a documented enhancement; making the panel persistent would deviate from the reference's DOM for a cosmetic axe score. |
| `min` attribute on the date input | Keep out | The reference's date input has NO `min` (probed). Server-side validation is the guard; the client 422 field rendering (F3) closes the user-facing gap instead. |
| Dead arbitrary CSS vars in `contact.tsx` (`--panel-x/y`) + `md:min-h-[100svh]` duplicate in `hero.tsx` | Keep | Class strings are ported verbatim from the reference — these tokens exist in the reference's own markup and are inert in both engines. Removing them would deviate from the verbatim-port doctrine for zero gain. Fix the *comment* in `reveal.tsx` that overstates the choreography scope instead. |
| Phone validation is length-only | Keep | Documented deliberate choice (header comment in the route); no regex on free text by doctrine. |
| `tee` masks exit codes in `dev`/`start` scripts | Keep | The gate scripts (lint/typecheck/test/build) don't use `tee`; the dev/start convenience logging is worth the cosmetic exit-code nuance. Documented here. |
| Rate limiter is per-process memory | Keep | Documented deployment shape (single standalone process); horizontal scaling is out of scope. |
| `ref as never` in `reveal.tsx` | Keep | Documented bought exception to the no-`any` rule. |
| e2e XFF-less "unknown" bucket sharing | Mitigated by design | e2e 429 probes use a dedicated spoofed XFF key (isolated bucket), so the suite can never poison itself; production behind the mandated proxy always sets XFF. |

---

## Part 2 — Remediation Plan (TDD)

All changes land on `main` (no new branches). `skills/` stays out of
lint/typecheck/test/build. New behaviors get failing tests first; the full
gate re-runs after every phase.

### Phase 1 — Pure validation seam + impossible-date rejection (F4, F13) — TDD

1. **Red:** create `tests/validation.test.ts` covering: valid payload →
   `{ok:true}` with cleaned values; `2025-02-31` / `2025-04-31` /
   `2025-02-30` rejected (round-trip component check); month 13 rejected;
   past date rejected; today accepted; non-`YYYY-MM-DD` rejected; all 9
   specialties accepted; unknown specialty rejected; specialty allowlist is
   DERIVED from `content.ts` services (drift-impossible by construction);
   fullName/phone/email bounds; defaulting (`specialty` → "Primary Care",
   `email`/`preferredDate` → null).
2. **Green:** create `src/lib/validation.ts` exporting
   `validateAppointmentPayload(payload, now?)` returning
   `{ok:true, value} | {ok:false, fields}`; move the validators out of the
   route; `APPOINTMENT_SPECIALTIES` = `new Set(["Primary Care", ...services.map(s => s.title)])`.
3. Rewire `appointments/route.ts` to the seam (422 shape and every message
   string unchanged for currently-valid inputs).

### Phase 2 — Rate-limit seam + XFF last-token keying (F2) — TDD

4. **Red:** create `tests/rate-limit.test.ts`: fixed-window expiry (fake
   clock), max-exceeded boundary (5th ok / 6th trips), key isolation,
   `clientKey()` parsing — last XFF token wins (`"a, b"` → `b`, trimmed),
   single token passes through, `x-real-ip` fallback, `"unknown"` default.
5. **Green:** create `src/lib/rate-limit.ts` exporting `clientKey(request)`
   and `createRateLimiter({windowMs, max, now?})` (module-level buckets +
   unref'd sweeper preserved); both routes use the shared seam with their
   existing windows (5/10min appointments, 10/10min login).
6. Update `docs/DEPLOYMENT.md` §6: the proxy must set or append
   `X-Forwarded-For` (append-style is now safe — the limiter keys on the
   LAST token, which only the proxy controls); direct exposure without a
   proxy still allows XFF spoofing (documented limitation — App Router route
   handlers cannot read the socket address).

### Phase 3 — Login timing equalization (F1) — TDD

7. **Red:** extend `tests/auth.test.ts`: `DUMMY_HASH` parses as the
   documented `scrypt$salt$hash` format; `verifyLoginPassword` (new seam)
   returns `false` for `null` stored-hash AND burns real scrypt time
   (≥10ms floor — two orders of magnitude above the <1ms non-scrypt path,
   safe margin against flake).
8. **Green:** `src/lib/auth.ts` gains `DUMMY_HASH` (precomputed scrypt hash
   of random bytes) + `verifyLoginPassword(password, storedHash | null)`;
   the login route calls it UNCONDITIONALLY, then `ok = admin !== null && passwordOk`
   — scrypt runs on both failure paths, response times converge.

### Phase 4 — Request body size cap (F12) — TDD

9. Both POST routes: `content-length > 64 KiB` → `413` with a friendly
   message, before `request.json()`. e2e pins it (Phase 7).

### Phase 5 — Client 422 field-error contract (F3)

10. `appointment-form.tsx`: capture `body.fields` on 422; render per-field
    messages under the inputs (`aria-invalid`, `aria-describedby`, existing
    destructive color); clear on resubmit; the generic `role="alert"`
    stays for non-field errors (401/429/500/network). Error-state DOM is
    our extension surface — the reference never renders it (no backend).
11. `login-form.tsx`: drop `noValidate` (native validation matches the
    site's form posture and the reference's `noValidate=false`); render
    422 field errors the same way if ever reached (crafted requests).

### Phase 6 — A11y completions + reveal degradation fix (F5, F6)

12. `globals.css`: `@media (prefers-reduced-motion: reduce) {
    .animate-heartbeat { animation: none; } }` — same pattern as the
    existing `badge-enter` guard.
13. `hero.tsx`: pause the video when `prefers-reduced-motion: reduce`
    (matchMedia listener, DOM-only effect — no hydration impact; everyone
    else sees identical autoplay behavior).
14. Reveal bundle-failure fallback: inline `<script>` in `layout.tsx` body
    sets a 9s `window.__revealFallback` timer that flips any still-hidden
    `[data-reveal]` to `"shown"`; every `Reveal` mount cancels the timer
    (bundle loaded → observer drives; bundle failed → content self-heals
    at 9s). Zero change when JS loads; SSR bytes gain one inert script tag.

### Phase 7 — e2e pins for the new contracts (F14)

15. `appointment-form.spec.ts`: 429 pin (6 requests under one dedicated
    spoofed XFF key — isolated bucket, no suite poisoning); 413 size-cap
    pin; client 422 UI pin (2-char name via the real form → per-field
    error visible + `aria-invalid` wired).
16. `auth.spec.ts`: unknown-email vs wrong-password → identical status +
    body (enumeration pin); cookie contract extended (`httpOnly` AND
    `sameSite: "Lax"`; `secure` only in production — absent over http).
17. `landing.spec.ts`: `tel:` href uniformity pin (`tel:+11234567890`
    everywhere — guards the F7 fix).

### Phase 8 — Config & supply-chain hygiene (F8, F9, F10, F11)

18. `tsconfig.json`: remove `noImplicitAny: false` (strict implies it);
    fix any surfaced errors; gate must stay green.
19. `next.config.ts`: remove `typescript.ignoreBuildErrors: true`
    (redundant once the gate is clean — belt-and-braces enforcement).
20. `layout.tsx`: `metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL
    ?? "http://localhost:3000")` — wires the documented env var.
21. `package.json`: declare `@types/node` (^26, the version actually
    installed) in devDependencies; update `tests/deps.test.ts` allowlist.
22. `playwright.config.ts`: explicit `AUTH_SECRET` (test value) in
    `webServer.env` — no more implicit bun-`.env` dependency.
23. `content.ts`: both `phoneHref` values → `tel:+11234567890` (F7 parity
    fix); `reveal.tsx` comment corrected (choreography drives the service
    cards, not the appointment panel).

### Phase 9 — Full verification (the TDD net)

24. `bun run lint && bun run typecheck && bun run test && bun run build &&
    bun run test:e2e` — acceptance: lint 0, tsc clean, unit suite green at
    its new count, build with the IDENTICAL route table, e2e green at its
    new count.
25. Fresh dev-server boot; live parity spot-checks on both sites (desktop
    7490px; mobile panel 192×148 @ top 80; link-click closes + jumps) +
    product loop under the active ambient `DATABASE_URL` hijack.

### Phase 10 — Screenshots, session docs, commit, push

26. Re-capture the 9 key screenshots into `docs/screenshots/` (existing
    filename convention).
27. `docs/session_8.md` (this session's structured log); repo `worklog.md`
    entry; SKILL.md → v2.3.0 (§9 trap additions, §11 counts, Appendix B
    Session 8); PAD `[S8]` revision + test-distribution table + known
    issues; README/CLAUDE/AGENTS count updates.
28. Conventional Commits message on `main`; push via
    `docs/ssh_git_wrapper_v3.py` per the runbook (operator key from the
    session brief; shredded after push; remote ref verified).

### Validation of this plan against the codebase (pre-execution)

- `login/route.ts:89` short-circuit verified by direct read ✔
- Date rollover verified empirically (`2025-02-31` → Mar 3; `2025-13-01`
  → NaN) ✔
- XFF first-token keying at `appointments/route.ts:81` +
  `login/route.ts:52` verified by direct read ✔
- `tsconfig.json:13` / `next.config.ts:11` / `playwright.config.ts:40-48`
  read and confirmed ✔
- `content.ts:186,193` = `tel:1234567890`; reference uniformity probed
  live ✔
- No e2e spec asserts `data-reveal` attributes (fallback script is safe) ✔
- `services` in `content.ts` = 8 entries + "Primary Care" default = the 9
  allowlist entries ✔
- Ambient `DATABASE_URL` hijack value ACTIVE this session (H9) — the
  `env -u` guards demonstrably still hold ✔
