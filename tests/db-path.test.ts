import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolveDatabaseUrl, standaloneRepoRoot, moduleSelfRoot } from "@/lib/db-path";

// The db-path contract (docs/parity-remediation-v2.3.md WS-1):
// a RELATIVE `file:` URL resolves against the first "anchor" directory that
// contains prisma/schema.prisma — exactly like the Prisma CLI resolves
// against the schema file — so `file:../db/custom.db` points at
// <anchor>/db/custom.db regardless of the process working directory.
// Absolute file: URLs (POSIX + Windows drive letters) and non-SQLite URLs
// pass through untouched; a missing/blank env value falls back to the
// documented default <anchor>/db/custom.db.

function toPosix(p: string): string {
  return p.split(path.sep).join("/");
}

describe("resolveDatabaseUrl", () => {
  let repo: string;
  let other: string;

  beforeAll(() => {
    // A fake repo layout: <repo>/prisma/schema.prisma + <repo>/db/
    repo = mkdtempSync(path.join(tmpdir(), "dbpath-repo-"));
    mkdirSync(path.join(repo, "prisma"));
    writeFileSync(path.join(repo, "prisma", "schema.prisma"), "datasource db { provider = \"sqlite\" }");
    mkdirSync(path.join(repo, "db"));
    // A directory with no schema (e.g. a random CWD).
    other = mkdtempSync(path.join(tmpdir(), "dbpath-other-"));
  });

  afterAll(() => {
    rmSync(repo, { recursive: true, force: true });
    rmSync(other, { recursive: true, force: true });
  });

  it("resolves a relative file: URL against the schema anchor's prisma/ dir", () => {
    const out = resolveDatabaseUrl("file:../db/custom.db", [repo]);
    expect(toPosix(out)).toBe(`file:${toPosix(path.join(repo, "db", "custom.db"))}`);
  });

  it("picks the FIRST anchor that contains prisma/schema.prisma", () => {
    const out = resolveDatabaseUrl("file:../db/custom.db", [other, repo]);
    expect(toPosix(out)).toBe(`file:${toPosix(path.join(repo, "db", "custom.db"))}`);
  });

  it("falls back to the last anchor when no anchor carries a schema", () => {
    const out = resolveDatabaseUrl("file:../db/custom.db", [other]);
    // Behaves like today's CWD rule: resolve against <anchor>/prisma.
    expect(toPosix(out)).toBe(`file:${toPosix(path.join(other, "prisma", "..", "db", "custom.db"))}`);
  });

  it("defaults to <anchor>/db/custom.db when the env value is missing", () => {
    const out = resolveDatabaseUrl(undefined, [repo]);
    expect(toPosix(out)).toBe(`file:${toPosix(path.join(repo, "db", "custom.db"))}`);
  });

  it("defaults to <anchor>/db/custom.db when the env value is blank/whitespace", () => {
    expect(toPosix(resolveDatabaseUrl("   ", [repo]))).toBe(
      `file:${toPosix(path.join(repo, "db", "custom.db"))}`,
    );
  });

  it("passes absolute POSIX file: URLs through untouched", () => {
    expect(resolveDatabaseUrl("file:/var/data/prod.db", [repo])).toBe("file:/var/data/prod.db");
  });

  it("passes absolute Windows drive-letter file: URLs through untouched", () => {
    expect(resolveDatabaseUrl("file:C:\\data\\prod.db", [repo])).toBe("file:C:\\data\\prod.db");
  });

  it("passes non-SQLite URLs through untouched", () => {
    const pg = "postgresql://user:pass@localhost:5432/app";
    expect(resolveDatabaseUrl(pg, [repo])).toBe(pg);
  });

  it("trims surrounding whitespace from the env value", () => {
    const out = resolveDatabaseUrl("  file:../db/custom.db  ", [repo]);
    expect(toPosix(out)).toBe(`file:${toPosix(path.join(repo, "db", "custom.db"))}`);
  });

  it("treats file:./dev.db as relative to the schema anchor's prisma/ dir", () => {
    const out = resolveDatabaseUrl("file:./dev.db", [repo]);
    expect(toPosix(out)).toBe(`file:${toPosix(path.join(repo, "prisma", "dev.db"))}`);
  });
});

describe("standaloneRepoRoot (the Next standalone chdir trap)", () => {
  // The standalone server.js runs process.chdir(__dirname) into
  // <repo>/.next/standalone before any module executes, and the tracer
  // copies prisma/schema.prisma into that folder — the plain CWD rule would
  // resolve against the BUILD OUTPUT. The detector must recognize that
  // folder and return the real repo two levels up.
  let repo: string;
  let standalone: string;
  let deployed: string;

  beforeAll(() => {
    repo = mkdtempSync(path.join(tmpdir(), "dbpath-std-repo-"));
    mkdirSync(path.join(repo, "prisma"));
    writeFileSync(path.join(repo, "prisma", "schema.prisma"), "// x");
    standalone = path.join(repo, ".next", "standalone");
    mkdirSync(standalone, { recursive: true });
    writeFileSync(path.join(standalone, "server.js"), "// next standalone");
    mkdirSync(path.join(standalone, "prisma"));
    writeFileSync(path.join(standalone, "prisma", "schema.prisma"), "// traced copy");
    // A standalone copy deployed elsewhere: no repo above it.
    deployed = mkdtempSync(path.join(tmpdir(), "dbpath-deployed-"));
    mkdirSync(path.join(deployed, ".next", "standalone"), { recursive: true });
  });

  afterAll(() => {
    rmSync(repo, { recursive: true, force: true });
    rmSync(deployed, { recursive: true, force: true });
  });

  it("recognizes the in-repo standalone dir and returns the repo root", () => {
    expect(standaloneRepoRoot(standalone)).toBe(repo);
  });

  it("ignores a standalone dir with no repo above it (deployed copy)", () => {
    expect(standaloneRepoRoot(path.join(deployed, ".next", "standalone"))).toBeNull();
  });

  it("ignores plain directories that merely contain prisma/schema.prisma", () => {
    expect(standaloneRepoRoot(repo)).toBeNull();
    expect(standaloneRepoRoot("/tmp")).toBeNull();
  });

  it("resolution prefers the repo anchor over the standalone cwd copy", () => {
    // In the standalone context candidateRoots() yields the chunk-derived
    // anchor (no schema — skipped), then the detector's REPO root, then the
    // chdir'd standalone CWD. A relative URL resolved with the standalone
    // CWD would land in <standalone>/db (no such dir → SQLite error 14);
    // with this order it must land in <repo>/db.
    const out = resolveDatabaseUrl("file:../db/custom.db", [repo, standalone]);
    expect(toPosix(out)).toBe(`file:${toPosix(path.join(repo, "db", "custom.db"))}`);
  });
});

describe("moduleSelfRoot (the import.meta.url anchor, session-22 F10)", () => {
  // Anchor 2 of candidateRoots(): the module's own repo root (src/lib → ../../),
  // guarded by the source file existing on disk (the standalone runtime's
  // virtual mapping fails that check and is skipped). The URL pathname is
  // PERCENT-ENCODED — a repo path containing %-escapable characters (space,
  // `#`, non-ASCII) must be decoded before existsSync, or the anchor is
  // silently skipped and resolution falls back to the CWD.
  let repoEscaped: string;
  let repoPlain: string;

  beforeAll(() => {
    // A repo layout whose directory name contains a space.
    repoEscaped = mkdtempSync(path.join(tmpdir(), "dbpath-esc-repo-")) + " esc dir";
    mkdirSync(path.join(repoEscaped, "src", "lib"), { recursive: true });
    writeFileSync(path.join(repoEscaped, "src", "lib", "db-path.ts"), "// x");
    // A plain unescaped repo layout (characterization: unchanged behavior).
    repoPlain = mkdtempSync(path.join(tmpdir(), "dbpath-plain-repo-"));
    mkdirSync(path.join(repoPlain, "src", "lib"), { recursive: true });
    writeFileSync(path.join(repoPlain, "src", "lib", "db-path.ts"), "// x");
  });

  afterAll(() => {
    rmSync(repoEscaped, { recursive: true, force: true });
    rmSync(repoPlain, { recursive: true, force: true });
  });

  it("decodes a percent-escaped module URL and returns the repo root", () => {
    // The on-disk path contains a space; the URL form encodes it as %20.
    const fileOnDisk = path.join(repoEscaped, "src", "lib", "db-path.ts");
    const url = "file://" + encodeURI(toPosix(fileOnDisk));
    expect(url).toContain("%20"); // the fixture must actually exercise encoding
    expect(moduleSelfRoot(url)).toBe(repoEscaped);
  });

  it("returns the repo root for a plain unescaped module URL", () => {
    const fileOnDisk = path.join(repoPlain, "src", "lib", "db-path.ts");
    const url = "file://" + toPosix(fileOnDisk);
    expect(moduleSelfRoot(url)).toBe(repoPlain);
  });

  it("returns null when the module file does not exist on disk (virtual mapping)", () => {
    expect(moduleSelfRoot("file:///nonexistent-virtual/src/lib/db-path.ts")).toBeNull();
  });

  it("returns null for a non-file: URL", () => {
    expect(moduleSelfRoot("https://example.com/src/lib/db-path.ts")).toBeNull();
  });
});

describe("anchor validation", () => {
  it("the repo anchor layout used by the tests actually exists", () => {
    // Sanity for the fixture itself — guards against a broken test setup
    // silently testing the fallback path instead.
    const repo = mkdtempSync(path.join(tmpdir(), "dbpath-check-"));
    try {
      mkdirSync(path.join(repo, "prisma"));
      writeFileSync(path.join(repo, "prisma", "schema.prisma"), "// x");
      expect(existsSync(path.join(repo, "prisma", "schema.prisma"))).toBe(true);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});
