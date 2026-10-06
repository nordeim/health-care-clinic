import { readFileSync } from "node:fs";
import { join } from "node:path";

// The BAKED_ORIGIN derivation seam (session-40 F1, hardened session-42).
// The SEO surfaces (sitemap, canonical/OG tags, robots sitemap reference)
// are STATIC — their absolute URLs are baked at `next build` time from
// NEXT_PUBLIC_SITE_URL. The e2e seo spec must expect the SAME origin the
// build baked, derived from the SAME sources with the SAME precedence,
// or the pins fail under any non-dev .env (the session-34 A4 coupling)
// and a mismatched loc host-rewrite silently re-becomes a no-op — the
// LL-11 never-fetch-the-baked-origin hazard.
//
// Precedence (mirroring @next/env, which `next build` uses):
//   1. ambient process.env.NEXT_PUBLIC_SITE_URL — the initial env beats
//      every .env file WHENEVER the key is present (empty string
//      included; @next/env's processEnv applies a file key only when
//      `typeof initial[key] === "undefined"`).
//   2. the repo .env file (the `npx playwright test` path — bun-run
//      already loads .env into the ambient env). Anchored on
//      process.cwd() because Playwright transpiles specs through its
//      CJS loader (import.meta is unavailable — the global-setup
//      precedent).
//   3. the siteUrl() dev default in src/lib/seo.ts.
//
// RESIDUALS (documented, out of contract): @next/env also loads
// .env.<mode>.local / .env.local / .env.<mode> (none exist in this repo;
// .env is the documented config surface) and applies dotenv-expand
// `$VAR` interpolation after parse (a `$` inside an origin URL is
// pathological and outside every documented configuration).

// dotenv 16.3.1's LINE grammar, ported VERBATIM from the copy @next/env
// bundles (node_modules/@next/env/dist/index.js, module 207 — the exact
// parser `next build` runs over the repo .env). Key-agnostic like the
// original; the caller filters to the one key this derivation needs.
// This is what makes the derivation hold for EVERY dotenv-legal line
// shape: `export ` prefixes, leading whitespace, `=` or `: ` separators,
// single/double/backtick quoting, inline ` # comment` stripping, CR/CRLF
// line endings, and LAST-wins duplicate keys (the session-40 hand-rolled
// regex handled only the two documented formats — the 22nd audit's L1).
const DOTENV_LINE =
  /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/gm;

export function parseEnvKey(text: string, key: string): string | undefined {
  let value: string | undefined;
  // dotenv normalizes CRLF and lone CR to \n before matching.
  const normalized = text.replace(/\r\n?/gm, "\n");
  // matchAll clones the regex (spec), so the module-level /g flag is safe.
  for (const match of normalized.matchAll(DOTENV_LINE)) {
    if (match[1] !== key) continue;
    let v = match[2] ?? "";
    // dotenv's unquoting steps, verbatim: trim, strip one pair of outer
    // matching quotes, expand \n / \r escapes inside double quotes only.
    v = v.trim();
    const quote = v[0];
    v = v.replace(/^(['"`])([\s\S]*)\1$/gm, "$2");
    if (quote === '"') {
      v = v.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
    }
    value = v; // last-wins, like dotenv's object assignment in scan order
  }
  return value;
}

export function resolveBakedOrigin(
  ambient: string | undefined,
  envText: string | null,
): string {
  // Ambient env beats .env WHENEVER the key is present — empty string
  // included (mirrors @next/env: a file key applies only when the key is
  // absent from the initial env, and siteUrl()'s ?? then bakes ""). A
  // broken config must fail the pins loudly, never silently substitute
  // a different origin than the one the build baked.
  if (ambient !== undefined) return ambient;
  if (envText !== null) {
    const fromFile = parseEnvKey(envText, "NEXT_PUBLIC_SITE_URL");
    // Same fail-loud rule for a present-but-empty .env value.
    if (fromFile !== undefined) return fromFile;
  }
  return "http://localhost:3000";
}

export function bakedOrigin(): string {
  return resolveBakedOrigin(
    process.env.NEXT_PUBLIC_SITE_URL,
    (() => {
      try {
        return readFileSync(join(process.cwd(), ".env"), "utf8");
      } catch {
        // No .env (e.g. CI with env vars only) — the default applies.
        return null;
      }
    })(),
  );
}
