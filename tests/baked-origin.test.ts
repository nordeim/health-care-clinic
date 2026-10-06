import { describe, expect, it } from "vitest";

import { parseEnvKey, resolveBakedOrigin } from "./helpers/baked-origin";

// The BAKED_ORIGIN derivation contract (session-42 Track A, the 22nd
// audit's L1): the e2e seo spec must expect the SAME origin the build
// baked, for EVERY dotenv-legal .env line shape — not just the two
// documented repo formats. `next build` parses .env through @next/env,
// which bundles dotenv 16.3.1 verbatim (node_modules/@next/env/dist/
// index.js): its LINE grammar accepts `export ` prefixes, leading
// whitespace, `=` OR `: ` separators, single/double/backtick quotes,
// inline ` # comment` stripping, CR/CRLF line endings, and assigns
// LAST-wins on duplicate keys; @next/env then applies a file key only
// when the key is absent from the initial ambient env (an ambient
// EMPTY string therefore beats .env, and siteUrl()'s ?? bakes "").
// These pins hold the helper to that grammar, class by class — the
// session-40 hand-rolled regex handled only the documented formats
// and diverged on the rest (the RED set this file was born with).

const KEY = "NEXT_PUBLIC_SITE_URL";

describe("parseEnvKey (dotenv 16.3.1 grammar — the exact version @next/env bundles)", () => {
  // -- the documented repo formats (green under the session-40 regex too)

  it("parses an unquoted value", () => {
    expect(parseEnvKey(`${KEY}=https://clinic.example`, KEY)).toBe(
      "https://clinic.example",
    );
  });

  it("parses a double-quoted value (the repo .env's own form)", () => {
    expect(parseEnvKey(`${KEY}="https://clinic.example"`, KEY)).toBe(
      "https://clinic.example",
    );
  });

  it("parses a single-quoted value", () => {
    expect(parseEnvKey(`${KEY}='https://clinic.example'`, KEY)).toBe(
      "https://clinic.example",
    );
  });

  it("normalizes CRLF line endings", () => {
    const file = `OTHER=1\r\n${KEY}="https://clinic.example"\r\n`;
    expect(parseEnvKey(file, KEY)).toBe("https://clinic.example");
  });

  it("trims trailing whitespace after an unquoted value", () => {
    expect(parseEnvKey(`${KEY}=https://clinic.example   `, KEY)).toBe(
      "https://clinic.example",
    );
  });

  it("keeps a trailing slash verbatim (no normalization — the value is used as baked)", () => {
    expect(parseEnvKey(`${KEY}=https://clinic.example/`, KEY)).toBe(
      "https://clinic.example/",
    );
  });

  it("ignores fully commented lines", () => {
    const file = `# ${KEY}=https://commented.example\n${KEY}=https://real.example`;
    expect(parseEnvKey(file, KEY)).toBe("https://real.example");
  });

  it("finds the target key among other keys", () => {
    const file = `DATABASE_URL="file:../db/custom.db"\n${KEY}=https://clinic.example\nAUTH_SECRET=""`;
    expect(parseEnvKey(file, KEY)).toBe("https://clinic.example");
  });

  // -- the divergence classes (session-42 L1: RED under the session-40
  //    regex, GREEN under the dotenv-verbatim port)

  it("parses a backtick-quoted value (dotenv's third quote form)", () => {
    expect(parseEnvKey(`${KEY}=\`https://clinic.example\``, KEY)).toBe(
      "https://clinic.example",
    );
  });

  it("normalizes lone CR line endings (classic Mac files)", () => {
    const file = `OTHER=1\r${KEY}="https://clinic.example"\r`;
    expect(parseEnvKey(file, KEY)).toBe("https://clinic.example");
  });

  it("strips an `export ` prefix (a shell-profile paste)", () => {
    expect(parseEnvKey(`export ${KEY}=https://clinic.example`, KEY)).toBe(
      "https://clinic.example",
    );
  });

  it("tolerates leading whitespace before the key", () => {
    expect(parseEnvKey(`   ${KEY}=https://clinic.example`, KEY)).toBe(
      "https://clinic.example",
    );
  });

  it("accepts the `KEY: value` colon separator (dotenv 16.3.1 grammar)", () => {
    expect(parseEnvKey(`${KEY}: https://clinic.example`, KEY)).toBe(
      "https://clinic.example",
    );
  });

  it("strips an inline comment after an unquoted value", () => {
    expect(
      parseEnvKey(`${KEY}=https://clinic.example # the production origin`, KEY),
    ).toBe("https://clinic.example");
  });

  it("strips an inline comment after a quoted value", () => {
    expect(
      parseEnvKey(`${KEY}="https://clinic.example" # the production origin`, KEY),
    ).toBe("https://clinic.example");
  });

  it("resolves duplicate keys LAST-wins (dotenv assigns in scan order)", () => {
    const file = `${KEY}=https://first.example\n${KEY}=https://second.example`;
    expect(parseEnvKey(file, KEY)).toBe("https://second.example");
  });

  it("returns an empty string for a present-but-empty value (the build bakes \"\" — fail loud, never substitute)", () => {
    expect(parseEnvKey(`${KEY}=`, KEY)).toBe("");
    expect(parseEnvKey(`${KEY}=""`, KEY)).toBe("");
  });

  it("expands \\n escapes inside double-quoted values (dotenv's unquoting step)", () => {
    expect(parseEnvKey(`${KEY}="two\\nlines"`, KEY)).toBe("two\nlines");
  });

  it("returns undefined when the key is absent", () => {
    expect(parseEnvKey("DATABASE_URL=\"file:../db/custom.db\"", KEY)).toBeUndefined();
  });
});

describe("resolveBakedOrigin (the ambient → .env → dev-default precedence)", () => {
  it("ambient beats the .env file", () => {
    expect(
      resolveBakedOrigin("https://ambient.example", `${KEY}=https://file.example`),
    ).toBe("https://ambient.example");
  });

  it("an ambient EMPTY string beats the .env file (mirrors @next/env: a present key wins, empty or not)", () => {
    expect(
      resolveBakedOrigin("", `${KEY}=https://file.example`),
    ).toBe("");
  });

  it("the .env value applies when ambient is unset", () => {
    expect(
      resolveBakedOrigin(undefined, `${KEY}=https://file.example`),
    ).toBe("https://file.example");
  });

  it("a present-but-empty .env value returns empty (mirrors siteUrl()'s ?? under the broken config)", () => {
    expect(resolveBakedOrigin(undefined, `${KEY}=`)).toBe("");
  });

  it("falls to the dev default when the .env lacks the key", () => {
    expect(resolveBakedOrigin(undefined, "DATABASE_URL=\"file:../db/custom.db\"")).toBe(
      "http://localhost:3000",
    );
  });

  it("falls to the dev default when there is no .env at all (envText null)", () => {
    expect(resolveBakedOrigin(undefined, null)).toBe("http://localhost:3000");
  });
});
