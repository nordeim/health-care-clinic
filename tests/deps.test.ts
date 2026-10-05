import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Dependency contract (docs/remediation-plan-session6.md F2): the application
// imports exactly next / react / react-dom / lucide-react / @prisma/client
// (runtime) and the build/test toolchain (dev) — the README "Architecture"
// table is the allowlist. The scaffold this repo was booted from shipped a
// shadcn/Radix/zustand/z-ai stack that the parity rebuild never used; that
// dead weight was removed in session 6. This pin exists so a future
// `bun add` cannot silently drag the scaffold leftovers (or their transitive
// audit exposure) back into the install surface — the removal is a recorded
// decision, and recorded decisions in this repo get tests.
//
// The allowlist asserts SET equality (not "contains"), because half of the
// value is catching reintroductions of the removed packages.

const RUNTIME_ALLOWLIST = [
  "@prisma/client",
  "lucide-react",
  "next",
  "prisma",
  "react",
  "react-dom",
] as const;

const DEV_ALLOWLIST = [
  "@playwright/test",
  "@tailwindcss/postcss",
  "@types/node",
  "@types/react",
  "@types/react-dom",
  "bun-types",
  "eslint",
  "eslint-config-next",
  "tailwindcss",
  "typescript",
  "vitest",
] as const;

// The scaffold stack removed in session 6 — re-adding any of these needs an
// ADR entry (and an update to this list), not a silent `bun add`.
const REMOVED_SCAFFOLD_PACKAGES = [
  "@radix-ui/react-alert-dialog",
  "@radix-ui/react-dialog",
  "@radix-ui/react-label",
  "@radix-ui/react-popover",
  "@radix-ui/react-radio-group",
  "@radix-ui/react-select",
  "@radix-ui/react-slot",
  "@radix-ui/react-toast",
  "class-variance-authority",
  "clsx",
  "tailwind-merge",
  "tailwindcss-animate",
  "tw-animate-css",
  "z-ai-web-dev-sdk",
  "zustand",
] as const;

function readPackageJson(): {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} {
  const pkgPath = path.resolve(import.meta.dirname, "..", "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  return {
    dependencies: pkg.dependencies ?? {},
    devDependencies: pkg.devDependencies ?? {},
  };
}

describe("dependency contract", () => {
  it("runtime dependencies equal the documented architecture allowlist", () => {
    const { dependencies } = readPackageJson();
    expect(Object.keys(dependencies).sort()).toEqual([...RUNTIME_ALLOWLIST].sort());
  });

  it("dev dependencies equal the documented toolchain allowlist", () => {
    const { devDependencies } = readPackageJson();
    expect(Object.keys(devDependencies).sort()).toEqual([...DEV_ALLOWLIST].sort());
  });

  it("no removed scaffold package has crept back", () => {
    const { dependencies, devDependencies } = readPackageJson();
    const installed = new Set([...Object.keys(dependencies), ...Object.keys(devDependencies)]);
    const regressions = REMOVED_SCAFFOLD_PACKAGES.filter((p) => installed.has(p));
    expect(regressions).toEqual([]);
  });

  it("scripts/ contains only the documented db:seed entry point", () => {
    // The predecessor project's probe/capture scripts (ORBITAL era) were
    // removed alongside the deps; seed.ts is the documented tool.
    const scriptsDir = path.resolve(import.meta.dirname, "..", "scripts");
    const entries = readdirSync(scriptsDir).sort();
    expect(entries).toEqual(["seed.ts"]);
  });
});
