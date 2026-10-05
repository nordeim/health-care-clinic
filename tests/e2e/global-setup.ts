import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { createHash, randomBytes, scryptSync } from "node:crypto";

/* Global setup: give the e2e run its own scratch SQLite database.
 * `prisma db push` is idempotent, so a stale e2e.db from a previous run is
 * simply brought back in sync. A staff account (E2E_ADMIN_EMAIL /
 * E2E_ADMIN_PASSWORD, test-only values) is then (re-)seeded through the same
 * scrypt hashing rule the app uses, so the auth spec can exercise the real
 * login flow.
 *
 * NOTE: Playwright loads this file through its own CJS transpiler when the
 * package.json has no "type": "module" — avoid import.meta here and anchor
 * on process.cwd() (playwright test always runs from the repo root). The
 * admin seeding goes through `prisma db execute` (the Prisma CLI speaks
 * SQLite natively) so this file stays free of bun-only module types. */

const repoRoot = process.cwd();
const dbDir = path.join(repoRoot, "db");

export const E2E_ADMIN_EMAIL = "e2e-admin@greengrove.test";
export const E2E_ADMIN_PASSWORD = "e2e-password-123";

/* scrypt hash in the app's stored format (`scrypt$saltHex$hashHex`) — kept
 * in sync with src/lib/auth.ts. */
function scryptStoredHash(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export default function globalSetup() {
  mkdirSync(dbDir, { recursive: true });
  const e2eDbUrl = `file:${path.join(dbDir, "e2e.db")}`;
  execSync("bunx prisma db push --skip-generate", {
    cwd: repoRoot,
    stdio: "pipe",
    env: {
      ...process.env,
      DATABASE_URL: "file:../db/e2e.db",
    },
  });

  // Seed (or re-seed) the staff account for the auth specs. The deterministic
  // id keeps the row stable across runs; ON CONFLICT refreshes the password
  // hash so a changed E2E_ADMIN_PASSWORD never leaves a stale login behind.
  const id = `e2e-${createHash("sha256").update(E2E_ADMIN_EMAIL).digest("hex").slice(0, 12)}`;
  const passwordHash = scryptStoredHash(E2E_ADMIN_PASSWORD);
  const sql = `INSERT INTO admin_users (id, email, passwordHash, createdAt)
               VALUES ('${id}', '${E2E_ADMIN_EMAIL}', '${passwordHash}', '${new Date().toISOString()}')
               ON CONFLICT (email) DO UPDATE SET passwordHash = excluded.passwordHash;`;
  execSync(`bunx prisma db execute --stdin --url "${e2eDbUrl}"`, {
    cwd: repoRoot,
    stdio: "pipe",
    input: sql,
  });
}
