import { describe, expect, it } from "vitest";
import {
  APPOINTMENT_SPECIALTIES,
  validateAppointmentPayload,
} from "@/lib/validation";
import { services } from "@/lib/content";

// The appointment validation contract (session-8 remediation plan F4/F13):
// the route's validators live in a PURE seam so every rule is unit-pinnable.
// Two contracts go beyond re-pinning the old behavior:
//  1. Impossible calendar dates ("2025-02-31") previously slipped through
//     via JS Date rollover (new Date("2025-02-31T00:00:00") === Mar 3) and
//     were persisted as garbage — the seam must round-trip the parsed
//     components and reject them (F4).
//  2. The specialty allowlist is DERIVED from content.ts services (+ the
//     "Primary Care" default), so the API can never drift from the form's
//     <option> list (F13).

function fixedNow(isoDate: string): Date {
  // Mid-day anchor so local-midnight comparisons are unambiguous.
  return new Date(`${isoDate}T12:00:00`);
}

describe("APPOINTMENT_SPECIALTIES", () => {
  it("is derived from the published service list plus Primary Care", () => {
    expect([...APPOINTMENT_SPECIALTIES].sort()).toEqual(
      ["Primary Care", ...services.map((s) => s.title)].sort(),
    );
  });

  it("contains every specialty the appointment form can submit", () => {
    // The form renders "Primary Care" plus one <option> per service; if
    // this fails, content.ts gained a service the API would 422.
    for (const title of ["Primary Care", ...services.map((s) => s.title)]) {
      expect(APPOINTMENT_SPECIALTIES.has(title)).toBe(true);
    }
  });
});

describe("validateAppointmentPayload", () => {
  const valid = {
    fullName: "Jordan Lee",
    phone: "555-0142",
    email: "jordan@example.com",
    specialty: "Pediatric care",
    preferredDate: "2099-06-15",
  };

  it("accepts a full valid payload and returns the cleaned values", () => {
    const result = validateAppointmentPayload(valid, fixedNow("2099-01-01"));
    expect(result).toEqual({
      ok: true,
      value: {
        fullName: "Jordan Lee",
        phone: "555-0142",
        email: "jordan@example.com",
        specialty: "Pediatric care",
        preferredDate: "2099-06-15",
      },
    });
  });

  it("trims surrounding whitespace from every string field", () => {
    const result = validateAppointmentPayload(
      { ...valid, fullName: "  Jordan Lee  ", phone: " 555-0142 " },
      fixedNow("2099-01-01"),
    );
    expect(result.ok && result.value.fullName).toBe("Jordan Lee");
    expect(result.ok && result.value.phone).toBe("555-0142");
  });

  it("defaults the specialty to Primary Care and nulls empty optional fields", () => {
    const result = validateAppointmentPayload(
      { fullName: "Jordan Lee", phone: "555-0142", email: "  ", preferredDate: "  " },
      fixedNow("2099-01-01"),
    );
    expect(result).toEqual({
      ok: true,
      value: {
        fullName: "Jordan Lee",
        phone: "555-0142",
        email: null,
        specialty: "Primary Care",
        preferredDate: null,
      },
    });
  });

  // ---- fullName -----------------------------------------------------------

  it("rejects a missing or too-short fullName with a field error", () => {
    for (const fullName of [undefined, "", "  ", "x", "xx"]) {
      const result = validateAppointmentPayload(
        { ...valid, fullName },
        fixedNow("2099-01-01"),
      );
      expect(result.ok).toBe(false);
      expect(!result.ok && result.fields.fullName).toBeTruthy();
    }
  });

  it("rejects an over-length fullName", () => {
    const result = validateAppointmentPayload(
      { ...valid, fullName: "a".repeat(121) },
      fixedNow("2099-01-01"),
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.fields.fullName).toContain("3 and 120");
  });

  // ---- phone --------------------------------------------------------------

  it("rejects a missing or out-of-bounds phone", () => {
    for (const phone of [undefined, "", "123456", "x".repeat(33)]) {
      const result = validateAppointmentPayload(
        { ...valid, phone },
        fixedNow("2099-01-01"),
      );
      expect(result.ok).toBe(false);
      expect(!result.ok && result.fields.phone).toBeTruthy();
    }
  });

  // ---- email --------------------------------------------------------------

  it("rejects a malformed optional email but accepts a valid one", () => {
    const bad = validateAppointmentPayload(
      { ...valid, email: "not-an-email" },
      fixedNow("2099-01-01"),
    );
    expect(bad.ok).toBe(false);
    expect(!bad.ok && bad.fields.email).toBeTruthy();

    const good = validateAppointmentPayload(
      { ...valid, email: null },
      fixedNow("2099-01-01"),
    );
    expect(good.ok).toBe(true);
  });

  // ---- email: the session-12 F1 length bound ------------------------------

  it("rejects a pattern-valid email over 254 characters (session-12 F1)", () => {
    // The local part is pattern-valid (no spaces/@) but absurdly long —
    // the only unbounded field before this bound: a single row could
    // persist a ~64 KiB email (verified live: 60,012 chars → 201).
    const longEmail = `${"a".repeat(247)}@example.com`; // 259 chars
    expect(longEmail.length).toBe(259);
    const result = validateAppointmentPayload(
      { ...valid, email: longEmail },
      fixedNow("2099-01-01"),
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.fields.email).toBe(
      "Email must be 254 characters or fewer.",
    );
  });

  it("accepts a pattern-valid email at exactly 254 characters (boundary)", () => {
    // 254 = the RFC 5321 practical forward-path limit.
    const boundaryEmail = `${"b".repeat(242)}@example.com`; // 254 chars
    expect(boundaryEmail.length).toBe(254);
    const result = validateAppointmentPayload(
      { ...valid, email: boundaryEmail },
      fixedNow("2099-01-01"),
    );
    expect(result.ok).toBe(true);
  });

  // ---- specialty ----------------------------------------------------------

  it("rejects a specialty outside the published list", () => {
    const result = validateAppointmentPayload(
      { ...valid, specialty: "Not A Service" },
      fixedNow("2099-01-01"),
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.fields.specialty).toBeTruthy();
  });

  it("rejects a present-but-non-string specialty instead of silently defaulting (session-12 F7)", () => {
    // {"specialty": 42} used to coerce to the "Primary Care" default and
    // persist — a WRONG TYPE on a defaulted field fabricated data. Only
    // missing/nullish/empty values default now.
    for (const specialty of [42, true, {}, []]) {
      const result = validateAppointmentPayload(
        { ...valid, specialty },
        fixedNow("2099-01-01"),
      );
      expect(result.ok).toBe(false);
      expect(!result.ok && result.fields.specialty).toBe(
        "Choose a specialty from the list.",
      );
    }
  });

  it("still defaults the specialty for missing/empty values (defaulting unchanged)", () => {
    // The tightened type guard must NOT narrow the documented default:
    // the form's initial selection is "Primary Care", and an explicit
    // empty string means "no choice made".
    for (const specialty of [undefined, null, "", "   "]) {
      const result = validateAppointmentPayload(
        { ...valid, specialty },
        fixedNow("2099-01-01"),
      );
      expect(result.ok).toBe(true);
      expect(result.ok && result.value.specialty).toBe("Primary Care");
    }
  });

  // ---- preferredDate: the F4 contract -------------------------------------

  it("rejects impossible calendar dates that JS Date would roll over", () => {
    // new Date("2025-02-31T00:00:00") === Mar 3 — the old NaN guard never
    // tripped for day overflow (verified: node). These must be 422s now.
    for (const preferredDate of ["2025-02-31", "2025-04-31", "2025-06-31", "2025-02-30"]) {
      const result = validateAppointmentPayload(
        { ...valid, preferredDate },
        fixedNow("2024-01-01"),
      );
      expect(result.ok).toBe(false);
      expect(!result.ok && result.fields.preferredDate).toBeTruthy();
    }
  });

  it("rejects an out-of-range month outright", () => {
    const result = validateAppointmentPayload(
      { ...valid, preferredDate: "2025-13-01" },
      fixedNow("2024-01-01"),
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.fields.preferredDate).toBeTruthy();
  });

  it("rejects a non-YYYY-MM-DD format", () => {
    // "" is NOT here: an empty date means "not provided" (optional field,
    // pinned above) — only malformed non-empty strings are format errors.
    for (const preferredDate of ["06/15/2099", "next Tuesday", "2099-6-5"]) {
      const result = validateAppointmentPayload(
        { ...valid, preferredDate },
        fixedNow("2099-01-01"),
      );
      expect(result.ok).toBe(false);
      expect(!result.ok && result.fields.preferredDate).toBeTruthy();
    }
  });

  it("rejects a date in the past", () => {
    const result = validateAppointmentPayload(
      { ...valid, preferredDate: "2024-12-31" },
      fixedNow("2099-01-01"),
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.fields.preferredDate).toBe(
      "Pick today or a future date.",
    );
  });

  it("accepts yesterday — one day of west-of-server timezone tolerance", () => {
    // Session-10 F4: the browser date input yields the PATIENT's local
    // calendar date, but the not-in-the-past floor used the SERVER's local
    // midnight. A patient west of the server (UTC server, US patient in
    // their evening) legitimately picks their own "today" — already the
    // server's "yesterday" — and was wrongly rejected. One day of
    // westward drift is accepted; the stale-request guard still rejects
    // anything older.
    const result = validateAppointmentPayload(
      { ...valid, preferredDate: "2098-12-31" },
      fixedNow("2099-01-01"),
    );
    expect(result.ok).toBe(true);
  });

  it("rejects two days ago (the stale-request guard still bites)", () => {
    const result = validateAppointmentPayload(
      { ...valid, preferredDate: "2098-12-30" },
      fixedNow("2099-01-01"),
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.fields.preferredDate).toBe(
      "Pick today or a future date.",
    );
  });

  it("accepts today (boundary: not in the past)", () => {
    const result = validateAppointmentPayload(
      { ...valid, preferredDate: "2099-01-01" },
      fixedNow("2099-01-01"),
    );
    expect(result.ok).toBe(true);
  });

  it("accumulates errors across multiple fields at once", () => {
    const result = validateAppointmentPayload(
      { fullName: "x", phone: "1", specialty: "Nope", preferredDate: "2025-02-31" },
      fixedNow("2099-01-01"),
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && Object.keys(result.fields).sort()).toEqual(
      ["fullName", "phone", "preferredDate", "specialty"],
    );
  });

  it("coerces non-string field values to missing/invalid rather than throwing", () => {
    const result = validateAppointmentPayload(
      { fullName: 42, phone: null, email: {} },
      fixedNow("2099-01-01"),
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.fields.fullName).toBeTruthy();
    expect(!result.ok && result.fields.phone).toBeTruthy();
  });

  it("returns a 422-shaped field map for non-object JSON bodies (null/number/string)", () => {
    // A literal `null` (or scalar) JSON body previously reached property
    // access and 500'd; the seam degrades it to a normal validation miss.
    for (const payload of [null, 42, "text", []]) {
      const result = validateAppointmentPayload(payload, fixedNow("2099-01-01"));
      expect(result.ok).toBe(false);
      expect(!result.ok && result.fields.fullName).toBe("Full name is required.");
      expect(!result.ok && result.fields.phone).toBe("Phone number is required.");
    }
  });
});

// The dashboard's upcoming-visits floor (session-12 F6): the stat used to
// count preferredDate >= server-TODAY while the validation seam deliberately
// accepts YESTERDAY (the west-of-server patient's "today" — session-10 F4).
// A tolerated row was persisted as valid yet excluded from the stat. The
// floor is extracted as a pure function so the two contracts can never drift
// apart silently again.
describe("upcomingVisitsFloor", () => {
  it("returns yesterday's ISO date — exactly the validation tolerance floor", async () => {
    const { upcomingVisitsFloor } = await import("@/lib/validation");
    // Mid-day anchor (local timezone): 2026-10-05 12:00 → floor 2026-10-04.
    expect(upcomingVisitsFloor(new Date("2026-10-05T12:00:00"))).toBe(
      "2026-10-04",
    );
  });

  it("rolls back across a month boundary", async () => {
    const { upcomingVisitsFloor } = await import("@/lib/validation");
    expect(upcomingVisitsFloor(new Date("2026-03-01T12:00:00"))).toBe(
      "2026-02-28",
    );
    // Leap-year February: 2028-03-01 minus one day → 2028-02-29.
    expect(upcomingVisitsFloor(new Date("2028-03-01T12:00:00"))).toBe(
      "2028-02-29",
    );
  });

  it("always yields a YYYY-MM-DD string", async () => {
    const { upcomingVisitsFloor } = await import("@/lib/validation");
    const floor = upcomingVisitsFloor(new Date());
    expect(floor).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
