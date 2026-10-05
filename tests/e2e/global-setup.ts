import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

/* Global setup: give the e2e run its own scratch SQLite database.
 * `prisma db push` is idempotent, so a stale e2e.db from a previous run is
 * simply brought back in sync.
 *
 * NOTE: Playwright loads this file through its own CJS transpiler when the
 * package.json has no "type": "module" — avoid import.meta here and anchor
 * on process.cwd() (playwright test always runs from the repo root). */

const repoRoot = process.cwd();
const dbDir = path.join(repoRoot, "db");

export default function globalSetup() {
  mkdirSync(dbDir, { recursive: true });
  execSync("bunx prisma db push --skip-generate", {
    cwd: repoRoot,
    stdio: "pipe",
    env: {
      ...process.env,
      DATABASE_URL: "file:../db/e2e.db",
    },
  });
}
