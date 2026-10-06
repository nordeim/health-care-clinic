import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Secrets-hygiene contract (session-40, the 21st audit's A1 — the first
// Critical in 21 cycles): an operator paste of the LIVE .env
// (docs/start_server_log.txt) shipped the production AUTH_SECRET — the
// HMAC key that signs staff session cookies — to the public remote. With
// the key public, anyone can forge a staff session and read the
// dashboard + CSV export (patient PII). This pin scans the DOCUMENTATION
// SURFACES where paste-leaks land (repo-root *.md / *.txt, the docs/
// tree, .env.example) for the leak classes:
//   (a) 64-hex-char runs — pasted HMAC/API keys (the A1 class),
//   (b) non-empty AUTH_SECRET assignments — legitimate doc values are the
//       "" placeholder or an explicit <...> redaction/placeholder marker,
//   (c) non-placeholder ADMIN_PASSWORD assignments — placeholders are
//       change-me, empty, the escaped $-form, or a <...> marker form.
// Code and test files are deliberately NOT scanned: crypto vectors are
// legitimate there (tests/auth.test.ts hashes by design). The remediation
// for A1 was redaction + an operator rotation advisory; this test is the
// regression guard so the paste-leak class cannot silently recur. A doc
// that legitimately needs a hex literal must be allowlisted HERE, in
// writing, with a reason — recorded decisions in this repo get tests.

const REPO_ROOT = path.resolve(import.meta.dirname, "..");

// Files exempt from the hex-run rule, with reasons. None today.
const HEX_RUN_ALLOWLIST: Record<string, string> = {};

function collectDocFiles(): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(REPO_ROOT)) {
    const full = path.join(REPO_ROOT, entry);
    if (statSync(full).isFile() && /\.(md|txt)$/i.test(entry)) files.push(full);
  }
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(md|txt)$/i.test(entry.name)) files.push(full);
    }
  };
  walk(path.join(REPO_ROOT, "docs"));
  files.push(path.join(REPO_ROOT, ".env.example"));
  return files;
}

const HEX_RUN = /[0-9a-fA-F]{64,}/g;
const ASSIGNMENT = /\b(AUTH_SECRET|ADMIN_PASSWORD)\s*=\s*("[^"\r\n]*"|'[^'\r\n]*'|\S+)/g;

function stripQuotes(value: string): string {
  return value.replace(/^["']|["']$/g, "");
}

function isPlaceholderPassword(value: string): boolean {
  const bare = stripQuotes(value);
  return (
    bare === "" ||
    bare === "change-me" ||
    bare.startsWith("$") || // the dotenv example form ($<your-password>)
    bare.startsWith("\\$") || // the ESCAPED dotenv example form (\$<your-password>)
    bare.includes("<") // the <...> placeholder marker form
  );
}

describe("secrets hygiene (doc surfaces)", () => {
  it("no 64-hex-char runs in documentation surfaces (the pasted-key class)", () => {
    const offenders = collectDocFiles()
      .map((file) => {
        const rel = path.relative(REPO_ROOT, file);
        const exempt = HEX_RUN_ALLOWLIST[rel] !== undefined;
        const runs = exempt ? [] : (readFileSync(file, "utf8").match(HEX_RUN) ?? []);
        return { file: rel, runs };
      })
      .filter(({ runs }) => runs.length > 0)
      .map(({ file, runs }) => `${file}: ${runs.join(", ")}`);
    expect(offenders, `pasted key material found:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("AUTH_SECRET appears only as the empty placeholder in doc surfaces", () => {
    const offenders: string[] = [];
    for (const file of collectDocFiles()) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(ASSIGNMENT)) {
        if (match[1] !== "AUTH_SECRET") continue;
        // A captured value starting with a backtick is a markdown inline-code
        // MENTION of the variable name (``AUTH_SECRET=``), not an assignment.
        if (match[2].startsWith("`")) continue;
        // Allowed values: the empty placeholder ("") and explicit <...>
        // redaction/placeholder markers (consistent with the password rule
        // below — a real secret paste is never angle-bracketed).
        const bare = stripQuotes(match[2]);
        if (bare !== "" && !bare.includes("<")) {
          offenders.push(`${path.relative(REPO_ROOT, file)}: AUTH_SECRET=${match[2]}`);
        }
      }
    }
    expect(offenders, `non-placeholder AUTH_SECRET found:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("ADMIN_PASSWORD appears only as documented placeholders in doc surfaces", () => {
    const offenders: string[] = [];
    for (const file of collectDocFiles()) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(ASSIGNMENT)) {
        if (match[1] !== "ADMIN_PASSWORD") continue;
        // Markdown inline-code mention of the variable name, not an assignment.
        if (match[2].startsWith("`")) continue;
        if (!isPlaceholderPassword(match[2])) {
          offenders.push(`${path.relative(REPO_ROOT, file)}: ADMIN_PASSWORD=${match[2]}`);
        }
      }
    }
    expect(offenders, `non-placeholder ADMIN_PASSWORD found:\n${offenders.join("\n")}`).toEqual([]);
  });
});
