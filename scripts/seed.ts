import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";
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
 * echoes the password back. */
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
