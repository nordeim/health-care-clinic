# Session 8 — HTTP-Edge Hardening, Validation Seams & A11y Completion

Continuation of `docs/session_6.md` / `docs/session_7.md`. Scope: refresh
workspace → review docs + session logs (6/7 + remediation-plan-session6) →
validate understanding against the codebase → re-audit with live reference
verification → remediate the HTTP-edge findings → re-verify → document →
push. The repo `skills/` folder stayed excluded from checking, testing and
compilation throughout.

## What was audited

- Workspace refreshed via `git pull` to `683691b` — a docs-only commit (the
  operator's transcript paste that became `docs/session_7.md`); zero code
  delta vs the session-6 remediated `010b800`.
- Read AGENTS.md, CLAUDE.md, README.md, Project_Architecture_Document.md,
  health-care-clinic_SKILL.md, docs/session_6.md,
  docs/remediation-plan-session6.md, worklog.md, docs/session_7.md — then
  validated every claim against the tree. Environment intact: `.env`
  (operator credentials + `AUTH_SECRET`), `db/custom.db` + `db/e2e.db` at
  the repo root, `node_modules` present, `.env.example` matching the
  codebase.
- Baseline gates before any change: lint 0 / tsc clean / 33 unit / build OK
  (identical route table) / 28 e2e — all green, exactly as documented.
- `skills/code-review-and-audit` native-CLI fallback pipeline (static gates
  + `bun audit` + a full fresh-eyes review of every application file —
  findings verified line-by-line before acceptance).
- `skills/agent-browser` live parity probes on BOTH the reference and the
  local clone (desktop 1440×900 + mobile 390×844), including four NEW
  reference probes: date-input attributes, `tel:` href formats, form
  validation posture, and the mobile panel's closed-state DOM.
- `skills/tdd` doctrine: every new behavior got a failing test first.

## Key findings (full detail: docs/remediation-plan-session8.md)

The session-6 remediation held up — all gates green, live parity
byte-exact, product loop verified under an ACTIVE ambient `DATABASE_URL`
hijack value (this session's own un-guarded probe script was even
redirected by it — the threat is real and the `env -u` guards held). The
new findings concentrated at the HTTP edge:

1. **F1 (High):** login user-enumeration TIMING oracle — unknown-email
   requests short-circuited scrypt (`admin !== null && verifyPassword(…)`),
   answering ~30ms faster than wrong-password requests.
2. **F2 (Medium):** rate-limit key was the FIRST `x-forwarded-for` token —
   client-controllable on direct exposure and behind append-style proxies.
3. **F3 (Medium):** both forms discarded the server's 422 `fields` map —
   "Please check the highlighted fields." with nothing highlighted, no
   `aria-invalid`/`aria-describedby` wiring.
4. **F4 (Medium):** impossible calendar dates (`2025-02-31`) passed
   validation via JS Date rollover (verified: parses to Mar 3) and
   persisted as garbage.
5. **F5 (Medium):** reveal content stayed invisible forever if the JS
   bundle failed while `scripting: enabled` — the port inverted the
   reference's failure direction.
6. **F6 (Medium):** `animate-heartbeat` lacked the reduced-motion guard the
   badge and reveal already carried; hero video had no reduced-motion
   handling.
7. **F7 (Medium — parity bug):** the clone's contact + footer `tel:` hrefs
   (`tel:1234567890`) deviated from the reference's uniform
   `tel:+11234567890` (probed live).
8. Plus config/doc contradictions (tsconfig `noImplicitAny: false` +
   `ignoreBuildErrors: true` vs the "TypeScript strict" claims;
   `NEXT_PUBLIC_SITE_URL` declared but never read), a phantom `@types/node`
   dependency, playwright's implicit `.env`-dependent `AUTH_SECRET`, no
   body-size cap, a hand-duplicated specialty allowlist, and zero tests
   for the rate limiters.

## Live parity evidence (reference vs clone, same session)

| Metric | Reference | Clone |
| ------ | --------- | ----- |
| Page height @1440×900 | 7490px | 7490px |
| h2 / h3 computed | 60px / 20px | identical |
| Mobile dropdown panel | 192×148 @ top 80, grid, r24, p8, `rgba(38,74,57,.9)`, 3 links | identical (oklab-equivalent paint) |
| Mobile menu link click | closes + `#services` lands at top 0.421875 | identical (re-measured via the visible panel) |
| `<title>` | `Base44 APP` placeholder | semantic titles (recorded deviation) |
| `tel:` hrefs | uniformly `tel:+11234567890` | NOW uniform too (F7 fixed; was split) |
| Date input `min` attr | absent | absent (parity kept — server validation is the guard) |
| Mobile panel closed DOM | unmounted | unmounted (matches) |

Product loop re-verified under the active ambient hijack: POST → 201 →
row in `<repo>/db/custom.db` → dashboard renders it. The impossible-date
probe now 422s with a field error instead of persisting garbage.

## What was remediated (all TDD — failing tests first)

- **New pure seams + 32 unit tests:** `src/lib/validation.ts`
  (`validateAppointmentPayload` with the calendar round-trip check and the
  specialty allowlist DERIVED from `content.ts` services — 18 tests) and
  `src/lib/rate-limit.ts` (`clientKey` with LAST-XFF-token keying +
  `createRateLimiter` + `bodyTooLarge` — 10 tests; 4 more in auth.test.ts
  for the timing seam). Unit suite: 33 → **65 tests**.
- **Login timing equalization (F1):** `DUMMY_HASH` + `verifyLoginPassword`
  in `src/lib/auth.ts` — scrypt ALWAYS runs, both failure paths burn
  identical CPU; the route decides success after the password work.
- **Rate-limit keying (F2):** last XFF token (the proxy-appended address —
  correct behind both append-style and overwrite-style proxies);
  DEPLOYMENT.md §6 now documents the exact proxy contract and the accepted
  direct-exposure limitation.
- **413 body cap (F12):** 64 KiB `content-length` check before JSON
  parsing on both POST routes.
- **Client 422 field errors (F3):** both forms render the server's field
  map per-input with `aria-invalid`/`aria-describedby`; login drops
  `noValidate` (native validation now matches the site's form posture).
  Verified live: "Al" submit → per-field message + preserved input.
- **A11y completions (F6):** `animate-heartbeat` reduced-motion guard;
  hero video pauses under `prefers-reduced-motion` (DOM-only effect).
- **Reveal bundle-failure self-heal (F5):** an inline timer in the layout
  flips still-hidden `[data-reveal]` elements to "shown" after 9s; the
  first Reveal mount cancels it. Verified live BOTH ways: with all .js
  requests aborted, 8 cards self-heal at 9s; with JS loading, the timer is
  cancelled and the scroll choreography is untouched.
- **Parity fix (F7):** `content.ts` phone hrefs → `tel:+11234567890`
  (reference-identical; e2e-pinned).
- **Config hygiene (F8-F11):** true TS strict (`noImplicitAny` now
  implied by `strict`), `ignoreBuildErrors` removed (the build itself
  enforces types), `metadataBase` wired to `NEXT_PUBLIC_SITE_URL`,
  `@types/node` declared (+ deps allowlist updated), playwright webServer
  `AUTH_SECRET` made explicit.

## Verification gate (final, post-remediation)

lint 0 errors · typecheck clean under TRUE strict · **65/65 unit** ·
production build OK with the IDENTICAL route table (4 static + 5 dynamic +
/_not-found) · **34/34 e2e** (28 + 6 new: impossible dates, 422 field
errors UI, 429 under a dedicated spoofed XFF key, 413 body cap, login
enumeration parity, tel: uniformity) · fresh dev boot healthy · live
parity spot-checks unchanged (7490px; mobile panel 192×148 @ top 80;
link-click closes + jumps to 0.421875) · product loop green end-to-end ·
11 screenshots refreshed (01/03/04/05/09/10/11/12/13 + NEW
14-appointment-field-errors, 15-dashboard-mobile-390-full).

## Outcome

Committed on `main` and pushed via `docs/ssh_git_wrapper_v3.py` (runbook:
`docs/how-to-git-push-using-ssh-wrapper_SKILL.md`); the operator key was
shredded after the push and the remote ref verified equal to local HEAD.
