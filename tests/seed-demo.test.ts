import { describe, expect, it } from "vitest";
import {
  APPOINTMENT_SPECIALTIES,
  APPOINTMENT_STATUSES,
  EMAIL_MAX_LENGTH,
  EMAIL_PATTERN,
  validateAppointmentPayload,
} from "../src/lib/validation";
// The seam under test — imported BEFORE the implementation exists so the
// RED run fails on the missing module (TDD: the test is written first and
// must be seen failing before it is trusted passing).
import {
  buildDemoAppointments,
  DEMO_APPOINTMENT_NAMES,
} from "../src/lib/seed-demo";

/* The demo-dashboard seed contract (session-28 F1, the 4th-recurrence
 * root-cause closure): `SEED_DEMO=1 bun run db:seed` (or `--demo`) restores
 * the documented "6 realistic dashboard seed rows (2 new / 2 confirmed /
 * 2 completed)" state reproducibly — the S20/S24/S26 manual public-API
 * restore class died with this seam.
 *
 * Doctrine pins:
 *  - specialties are members of the API's own allowlist (derived from
 *    content.ts — never hand-copied into a second place);
 *  - preferredDate values are SELF-RENEWING (now + offsetDays, the
 *    session-26 F4 doctrine applied to seed data — hardcoded demo dates
 *    would erode into the past exactly like the old e2e literals did);
 *  - every row is a VALID API payload by construction (cross-seam:
 *    validateAppointmentPayload accepts it — a demo row the public form
 *    itself could have submitted);
 *  - pure: fixed now in → deterministic rows out (no clock reads inside). */

/** The session-28 designed distribution: 2 new / 2 confirmed / 2 completed. */
function fixedNow(): Date {
  // A mid-year, mid-month, mid-day instant — nothing special about it
  // except determinism: every case below builds from this single value.
  return new Date(2026, 5, 15, 10, 30, 0);
}

describe("buildDemoAppointments", () => {
  it("builds exactly the 6 documented demo rows with unique names", () => {
    const rows = buildDemoAppointments(fixedNow());
    expect(rows).toHaveLength(6);
    const names = rows.map((row) => row.fullName);
    expect(new Set(names).size).toBe(6);
    expect([...names].sort()).toEqual([...DEMO_APPOINTMENT_NAMES].sort());
  });

  it("splits statuses 2 new / 2 confirmed / 2 completed", () => {
    const rows = buildDemoAppointments(fixedNow());
    const byStatus = new Map<string, number>();
    for (const row of rows) {
      byStatus.set(row.status, (byStatus.get(row.status) ?? 0) + 1);
    }
    expect(byStatus.get("new")).toBe(2);
    expect(byStatus.get("confirmed")).toBe(2);
    expect(byStatus.get("completed")).toBe(2);
  });

  it("uses only specialties from the API's derived allowlist", () => {
    const rows = buildDemoAppointments(fixedNow());
    for (const row of rows) {
      expect(APPOINTMENT_SPECIALTIES.has(row.specialty)).toBe(true);
    }
    // More than one distinct specialty — the demo state demonstrates the
    // dashboard's "top specialty" stat with variety, not a single value.
    expect(new Set(rows.map((row) => row.specialty)).size).toBeGreaterThanOrEqual(4);
  });

  it("uses only statuses from the API's derived allowlist", () => {
    const rows = buildDemoAppointments(fixedNow());
    for (const row of rows) {
      expect(APPOINTMENT_STATUSES.has(row.status)).toBe(true);
    }
  });

  it("derives every preferredDate from now + offsetDays (self-renewing)", () => {
    const now = fixedNow();
    const rows = buildDemoAppointments(now);
    // Component-form day arithmetic mirrors the validation seam's parse:
    // the produced date is a REAL calendar date and lands in the future.
    for (const row of rows) {
      expect(row.preferredDate).not.toBeNull();
      const parsed = new Date(`${row.preferredDate}T00:00:00`);
      expect(parsed.getTime()).not.toBeNaN();
      // Future relative to the seeded `now` (the API's past-floor holds):
      expect(parsed.getTime()).toBeGreaterThan(now.getTime());
      // Within a bounded horizon (the largest designed offset is 30 days):
      const daysAhead = (parsed.getTime() - now.getTime()) / 86_400_000;
      expect(daysAhead).toBeGreaterThan(0);
      expect(daysAhead).toBeLessThanOrEqual(31);
    }
    // Deterministic spread: the 6 dates are distinct (variety on the
    // dashboard's upcoming column) and sorted rows map to designed offsets.
    const dates = rows.map((row) => row.preferredDate as string).sort();
    expect(new Set(dates).size).toBe(6);
  });

  it("is pure — the same now produces identical rows", () => {
    const a = buildDemoAppointments(fixedNow());
    const b = buildDemoAppointments(fixedNow());
    expect(a).toEqual(b);
  });

  it("produces rows the public API itself would accept (cross-seam)", () => {
    const rows = buildDemoAppointments(fixedNow());
    for (const row of rows) {
      const result = validateAppointmentPayload(row, fixedNow());
      // Demo rows are valid payloads BY CONSTRUCTION — a regression here
      // means the demo state drifted from the API contract (e.g. a new
      // required field, a tightened bound, a renamed specialty).
      expect(result).toEqual({ ok: true, value: expect.objectContaining({
        fullName: row.fullName,
        specialty: row.specialty,
      }) });
    }
  });

  it("shapes every field inside the validation contract's bounds", () => {
    const rows = buildDemoAppointments(fixedNow());
    for (const row of rows) {
      expect(row.fullName.length).toBeGreaterThanOrEqual(3);
      expect(row.fullName.length).toBeLessThanOrEqual(120);
      expect(row.phone.length).toBeGreaterThanOrEqual(7);
      expect(row.phone.length).toBeLessThanOrEqual(32);
      expect(row.email.length).toBeLessThanOrEqual(EMAIL_MAX_LENGTH);
      expect(EMAIL_PATTERN.test(row.email)).toBe(true);
    }
  });
});
