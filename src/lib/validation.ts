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
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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
  }

  const specialty = asTrimmedString(record.specialty) ?? "Primary Care";
  if (!APPOINTMENT_SPECIALTIES.has(specialty)) {
    errors.specialty = "Choose a specialty from the list.";
  }

  const preferredDate = asTrimmedString(record.preferredDate);
  if (preferredDate) {
    const { parsed, valid } = isRealCalendarDate(preferredDate);
    // "Not in the past" compares against LOCAL midnight — the same
    // semantics the route always used.
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    if (!valid || parsed < today) {
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
