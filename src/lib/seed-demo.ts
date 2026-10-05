import {
  APPOINTMENT_SPECIALTIES,
  APPOINTMENT_STATUSES,
  EMAIL_MAX_LENGTH,
  EMAIL_PATTERN,
  validateAppointmentPayload,
} from "./validation";

/* The demo-dashboard seed seam (session-28 F1 — the root-cause closure of
 * the 4×-recurred "6 realistic seed rows absent after workspace reset"
 * class: S20, S24, S26 each restored them through the public API by hand,
 * and every fresh bootstrap erased them again). `SEED_DEMO=1 bun run
 * db:seed` (or `--demo`) now restores the documented state reproducibly
 * with ONE command; the default seed contract (staff upsert only) is
 * byte-identical — production seeding (docs/DEPLOYMENT.md §4) never
 * creates patient rows.
 *
 * Doctrine pins (each has a test in tests/seed-demo.test.ts):
 *  - specialties are members of the API's DERIVED allowlist (the same
 *    content.ts services list — never hand-copied into a second place);
 *  - preferredDate values are SELF-RENEWING: computed from `now +
 *    offsetDays`, so the demo state can never erode into the past the way
 *    the session-26 F4 e2e literals did (a hardcoded demo date is the
 *    same decay class with a longer fuse);
 *  - every row is a valid public-API payload BY CONSTRUCTION (the
 *    cross-seam test pushes each row through validateAppointmentPayload);
 *  - pure: `now` is injected — no clock reads inside, so the unit layer
 *    stays deterministic.
 *
 * Idempotency is the seed script's concern (skip-if-exists by fullName) —
 * a row that already exists is left UNTOUCHED so real status transitions
 * made through the dashboard are never clobbered by a re-run. */

export type DemoAppointmentInput = {
  fullName: string;
  phone: string;
  email: string;
  specialty: string;
  preferredDate: string;
  status: string;
};

/** The 6 demo identities — the documented "realistic dashboard seed rows".
 * Unique by construction; the seed script keys idempotency on these names. */
export const DEMO_APPOINTMENT_NAMES = [
  "Maria Sanchez",
  "James Okafor",
  "Elena Petrova",
  "David Thompson",
  "Aisha Rahman",
  "Robert Klein",
] as const;

/** Local-component YYYY-MM-DD — the same component-form arithmetic the
 * validation seam uses to parse (a produced date is always a REAL calendar
 * date; no rollover strings can escape this formatter). */
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Days ahead of `now` for each demo row's preferred visit — a spread that
 * keeps the dashboard's upcoming column varied (3 days to a month out). */
const OFFSETS_DAYS = [3, 7, 10, 14, 21, 30] as const;

/** The designed template: name → specialty + email handle + status.
 * Specialties are asserted against the API allowlist by the test suite —
 * if content.ts ever renames a service, the test fails HERE first (the
 * never-drift doctrine), it never reaches the seeded database. */
const TEMPLATE: ReadonlyArray<{
  fullName: (typeof DEMO_APPOINTMENT_NAMES)[number];
  specialty: string;
  emailHandle: string;
  status: string;
}> = [
  { fullName: "Maria Sanchez", specialty: "Primary Care", emailHandle: "maria.sanchez", status: "new" },
  { fullName: "James Okafor", specialty: "Chronic care", emailHandle: "james.okafor", status: "confirmed" },
  { fullName: "Elena Petrova", specialty: "Pediatric care", emailHandle: "elena.petrova", status: "completed" },
  { fullName: "David Thompson", specialty: "Preventive care", emailHandle: "david.thompson", status: "new" },
  { fullName: "Aisha Rahman", specialty: "Women's health", emailHandle: "aisha.rahman", status: "confirmed" },
  { fullName: "Robert Klein", specialty: "Acute care", emailHandle: "robert.klein", status: "completed" },
];

/** Builds the 6 demo appointment rows for a given `now` (pure — inject the
 * clock, never read it). The statuses land 2 new / 2 confirmed /
 * 2 completed; the dates land 3–30 days ahead; every row would be
 * accepted by POST /api/appointments unchanged. */
export function buildDemoAppointments(now: Date): DemoAppointmentInput[] {
  return TEMPLATE.map((entry, index) => {
    const row: DemoAppointmentInput = {
      fullName: entry.fullName,
      phone: `+1 555-010${index}`,
      email: `${entry.emailHandle}@example.com`,
      specialty: entry.specialty,
      preferredDate: formatLocalDate(
        new Date(now.getFullYear(), now.getMonth(), now.getDate() + OFFSETS_DAYS[index]),
      ),
      status: entry.status,
    };
    return row;
  });
}

/** Development-time honesty guard: if the template ever drifts outside the
 * API contract (a renamed specialty, a bound violation, a decayed date),
 * seeding refuses loudly instead of writing rows the API itself would
 * reject. Thrown only by the opt-in demo path — never on the default path. */
export function assertDemoRowsValid(rows: DemoAppointmentInput[], now: Date): void {
  for (const row of rows) {
    if (!APPOINTMENT_SPECIALTIES.has(row.specialty)) {
      throw new Error(
        `[db:seed] demo specialty "${row.specialty}" is not in the API allowlist — update src/lib/seed-demo.ts TEMPLATE (content.ts changed?)`,
      );
    }
    if (!APPOINTMENT_STATUSES.has(row.status)) {
      throw new Error(
        `[db:seed] demo status "${row.status}" is not in the API allowlist — update src/lib/seed-demo.ts TEMPLATE (content.ts changed?)`,
      );
    }
    if (row.email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(row.email)) {
      throw new Error(`[db:seed] demo email "${row.email}" violates the validation contract`);
    }
    const validation = validateAppointmentPayload(row, now);
    if (!validation.ok) {
      throw new Error(
        `[db:seed] demo row "${row.fullName}" is not a valid API payload: ${JSON.stringify(validation.fields)}`,
      );
    }
  }
}
