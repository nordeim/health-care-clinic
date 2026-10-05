import { services } from "@/lib/content";

/* ---------------------------------------------------------------------------
 * Appointment payload validation — the PURE seam behind
 * POST /api/appointments (ADR-005 doctrine: manual validators, no schema
 * library). Extracted from the route in session 8 so every rule is
 * unit-pinnable (tests/validation.test.ts).
 *
 * Two contracts beyond the original route code:
 *  1. IMPOSSIBLE CALENDAR DATES ARE REJECTED. `new Date("2025-02-31")`
 *     rolls over to March 3 — a NaN check never trips for day overflow —
 *     so garbage strings used to persist into preferredDate and flow into
 *     the dashboard's lexicographic upcoming-visits query. The seam parses
 *     with the component-form constructor and round-trips the components.
 *  2. THE SPECIALTY ALLOWLIST IS DERIVED from the published service list
 *     (src/lib/content.ts) plus the "Primary Care" default the form
 *     renders — the API can never drift from the form's <option> list.
 * ------------------------------------------------------------------------- */

export type AppointmentPayload = {
  fullName?: unknown;
  phone?: unknown;
  email?: unknown;
  specialty?: unknown;
  preferredDate?: unknown;
};

export type AppointmentValue = {
  fullName: string;
  phone: string;
  email: string | null;
  specialty: string;
  preferredDate: string | null;
};

export type AppointmentValidation =
  | { ok: true; value: AppointmentValue }
  | { ok: false; fields: Record<string, string> };

/** The specialties the API accepts — derived, never hand-copied. */
export const APPOINTMENT_SPECIALTIES: ReadonlySet<string> = new Set([
  "Primary Care",
  ...services.map((service) => service.title),
]);

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
/** Shared email sanity pattern — exported so the login route validates with
 * the SAME regex (session-12 F9: the hand-copied inline literal in the route
 * was a drift risk against this seam's "derived, never hand-copied"
 * doctrine). */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** RFC 5321 practical forward-path limit — the only bound on the otherwise
 * unbounded email field (session-12 F1: a ~64 KiB pattern-valid email used
 * to persist in a single row; every other field was already bounded). */
export const EMAIL_MAX_LENGTH = 254;

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isRealCalendarDate(
  preferredDate: string,
): { parsed: Date; valid: boolean } {
  const match = DATE_PATTERN.exec(preferredDate);
  if (!match) return { parsed: new Date(NaN), valid: false };
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // Component-form construction: out-of-range components ROLL OVER
  // (month 13 → next January, Feb 31 → March 3), so the round-trip
  // comparison below is what actually rejects impossible dates — a plain
  // isNaN check never trips for day overflow.
  const parsed = new Date(year, month - 1, day);
  const valid =
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day;
  return { parsed, valid };
}

export function validateAppointmentPayload(
  payload: unknown,
  now: Date = new Date(),
): AppointmentValidation {
  // Tolerate ANY JSON body shape (null, numbers, strings, arrays) — a
  // non-object body becomes an empty record and fails validation with a
  // 422 field map instead of throwing a 500.
  const record: AppointmentPayload =
    typeof payload === "object" && payload !== null
      ? (payload as AppointmentPayload)
      : {};
  const errors: Record<string, string> = {};

  const fullName = asTrimmedString(record.fullName);
  if (!fullName) {
    errors.fullName = "Full name is required.";
  } else if (fullName.length < 3 || fullName.length > 120) {
    errors.fullName = "Full name must be between 3 and 120 characters.";
  }

  const phone = asTrimmedString(record.phone);
  if (!phone) {
    errors.phone = "Phone number is required.";
  } else if (phone.length < 7 || phone.length > 32) {
    errors.phone = "Phone number must be between 7 and 32 characters.";
  }

  const email = asTrimmedString(record.email);
  if (email && !EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address or leave it empty.";
  } else if (email && email.length > EMAIL_MAX_LENGTH) {
    // Session-12 F1: email was the only field without a maximum — the
    // 64 KiB body cap was the sole ceiling, so one row could persist a
    // pattern-valid ~64 KiB address (verified live pre-fix: 60,012 chars).
    errors.email = "Email must be 254 characters or fewer.";
  }

  // Session-12 F7: a PRESENT-but-non-string specialty is a type error and
  // must 422 — {"specialty": 42} used to coerce to the "Primary Care"
  // default and silently persist fabricated data. Only missing/nullish/
  // empty values keep the documented default (mirrors the form's initial
  // selection semantics).
  if (
    record.specialty !== undefined &&
    record.specialty !== null &&
    typeof record.specialty !== "string"
  ) {
    errors.specialty = "Choose a specialty from the list.";
  }

  const specialty = asTrimmedString(record.specialty) ?? "Primary Care";
  if (!errors.specialty && !APPOINTMENT_SPECIALTIES.has(specialty)) {
    errors.specialty = "Choose a specialty from the list.";
  }

  const preferredDate = asTrimmedString(record.preferredDate);
  if (preferredDate) {
    const { parsed, valid } = isRealCalendarDate(preferredDate);
    // "Not in the past" with ONE DAY of west-of-server tolerance: the
    // browser date input yields the PATIENT's local calendar date, so a
    // patient west of the server's timezone (e.g. a UTC server and a US
    // patient booking during their evening) legitimately picks their own
    // "today" — which is already the server's "yesterday". Accepting one
    // day of drift keeps their booking valid; anything older is still a
    // stale request and rejected.
    const floor = toleranceFloorDate(now);
    if (!valid || parsed < floor) {
      errors.preferredDate = "Pick today or a future date.";
    }
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, fields: errors };
  }

  return {
    ok: true,
    value: {
      fullName: fullName as string,
      phone: phone as string,
      email,
      specialty,
      preferredDate,
    },
  };
}

/** Server-local midnight minus one day — the shared west-of-server
 * tolerance floor. The preferredDate validation above compares Date
 * objects against it; the dashboard's upcoming-visits stat (below)
 * compares ISO strings. One helper, two projections — the API's acceptance
 * rule and the stat's inclusion rule can never drift apart again
 * (session-12 F6: the stat used to count >= server-TODAY while the seam
 * deliberately accepts yesterday, so tolerated rows vanished from the
 * stat they belonged to). */
function toleranceFloorDate(now: Date): Date {
  const floor = new Date(now);
  floor.setHours(0, 0, 0, 0);
  floor.setDate(floor.getDate() - 1);
  return floor;
}

/** The dashboard "Upcoming visits" floor as a YYYY-MM-DD ISO date —
 * server-YESTERDAY, exactly matching the validation tolerance (see
 * toleranceFloorDate). */
export function upcomingVisitsFloor(now: Date = new Date()): string {
  const floor = toleranceFloorDate(now);
  const y = floor.getFullYear();
  const m = String(floor.getMonth() + 1).padStart(2, "0");
  const d = String(floor.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
