import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";
import {
  assertDemoRowsValid,
  buildDemoAppointments,
} from "../src/lib/seed-demo";
/* Seed / update the staff account for the appointment dashboard.
 *
 *   bun run db:seed
 *
 * Reads ADMIN_EMAIL and ADMIN_PASSWORD from the environment (.env is loaded
 * by bun for npm scripts). The account is UPSERTED: re-running the seed with
 * new credentials updates the existing row's email + password hash, so
 * rotating the staff password is a one-command operation.
 *
 * NOTE (session-22 F9): the upsert keys on EMAIL — changing ADMIN_EMAIL and
 * re-seeding creates a SECOND active staff row; the previous account keeps
 * its login (and outstanding session cookies) until its row is deleted
 * (deleting the AdminUser row is the documented revocation path — the
 * dashboard guard re-checks the row on every request). Rotate emails by
 * deleting the old row: see the schema's AdminUser model.
 *
 * Idempotent and safe to run repeatedly; prints a confirmation and never
 * echoes the password back.
 *
 * Demo mode (session-28 F1 — OPT-IN, default OFF): `SEED_DEMO=1 bun run
 * db:seed` (or `bun run db:seed -- --demo`) ALSO restores the documented
 * "6 realistic dashboard seed rows" (2 new / 2 confirmed / 2 completed)
 * that the committed dashboard screenshots show. The rows are built by the
 * tested pure seam src/lib/seed-demo.ts (self-renewing dates, specialties
 * from the API's derived allowlist, valid public-API payloads by
 * construction) and inserted IDEMPOTENTLY — a row whose fullName already
 * exists is skipped untouched, so re-runs never duplicate and never
 * clobber status transitions made through the real dashboard. Production
 * seeding (docs/DEPLOYMENT.md §4) runs WITHOUT the flag and never creates
 * patient rows. */
const demoRequested =
  process.argv.includes("--demo") || process.env.SEED_DEMO === "1";

async function seedDemoRows() {
  const now = new Date();
  const rows = buildDemoAppointments(now);
  // Refuse loudly if the template drifted from the API contract — the
  // unit suite normally catches this first; this guard protects a future
  // content.ts change from seeding invalid rows through an older suite.
  assertDemoRowsValid(rows, now);
  let created = 0;
  let skipped = 0;
  for (const row of rows) {
    const existing = await db.appointment.findFirst({
      where: { fullName: row.fullName },
      select: { id: true },
    });
    if (existing) {
      // Never touch an existing row — its status is real dashboard state.
      skipped += 1;
      continue;
    }
    await db.appointment.create({ data: row });
    created += 1;
  }
  console.log(
    `[db:seed] demo rows: ${created} created, ${skipped} already present (6 documented: 2 new / 2 confirmed / 2 completed)`,
  );
}

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 8) {
    console.error(
      "[db:seed] ADMIN_EMAIL and ADMIN_PASSWORD (min 8 chars) must be set — see .env.example.",
    );
    process.exit(1);
  }
  const passwordHash = await hashPassword(password);
  const admin = await db.adminUser.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
    select: { email: true, createdAt: true },
  });
  console.log(`[db:seed] staff account ready: ${admin.email}`);
  if (demoRequested) {
    await seedDemoRows();
  }
}
main()
  .catch((error) => {
    console.error("[db:seed] failed:", error);
    // exitCode (not process.exit) so the chained .finally below actually
    // runs before the process ends — $disconnect was dead code on the
    // failure path before session-12 F8 (process.exit terminated first).
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
