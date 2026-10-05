import { describe, expect, it } from "vitest";
import {
  APPOINTMENT_STATUSES,
  validateStatusUpdate,
} from "@/lib/validation";
import { appointmentStatuses } from "@/lib/content";

// The appointment STATUS validation contract (session-16 remediation plan
// G1 — the dashboard status-transition write path): the PATCH
// /api/appointments/[id] route validates through this PURE seam so every
// rule is unit-pinnable, mirroring the appointment-payload seam doctrine.
//  1. The status allowlist is DERIVED from content.ts appointmentStatuses —
//     the API can never drift from the dashboard's rendered badges.
//  2. Non-object bodies (null, scalars, arrays) degrade to a 422 field map —
//     never a 500 (the session-10 F1 doctrine, applied from birth here).

describe("APPOINTMENT_STATUSES", () => {
  it("is derived from the published appointmentStatuses list", () => {
    expect([...APPOINTMENT_STATUSES].sort()).toEqual(
      [...appointmentStatuses.map((s) => s.value)].sort(),
    );
  });

  it("contains exactly the three workflow states", () => {
    // new -> confirmed -> completed is the documented transition graph.
    // If this fails, content.ts gained/renamed a state the API must honor.
    expect([...APPOINTMENT_STATUSES].sort()).toEqual(
      ["completed", "confirmed", "new"],
    );
  });
});

describe("validateStatusUpdate", () => {
  it("accepts each published status value", () => {
    for (const { value } of appointmentStatuses) {
      expect(validateStatusUpdate({ status: value })).toEqual({
        ok: true,
        value,
      });
    }
  });

  it("trims surrounding whitespace before allowlisting", () => {
    expect(validateStatusUpdate({ status: "  confirmed  " })).toEqual({
      ok: true,
      value: "confirmed",
    });
  });

  it("rejects values outside the allowlist", () => {
    for (const status of ["cancelled", "archived", "", "   "]) {
      const result = validateStatusUpdate({ status });
      expect(result).toEqual({
        ok: false,
        fields: { status: "Choose a status from the list." },
      });
    }
  });

  it("is case-sensitive — the canonical labels are rejected", () => {
    // "New" is the display label, not the stored value; accepting it would
    // fork the stored-value space (the specialty allowlist is exact-match
    // for the same reason).
    for (const status of ["New", "CONFIRMED", "Completed"]) {
      expect(validateStatusUpdate({ status })).toEqual({
        ok: false,
        fields: { status: "Choose a status from the list." },
      });
    }
  });

  it("rejects present-but-non-string status values with a 422 field map", () => {
    // Session-12 F7 doctrine: a PRESENT-but-non-string value is a type
    // error, never silently coerced.
    for (const status of [42, true, {}, []]) {
      expect(validateStatusUpdate({ status })).toEqual({
        ok: false,
        fields: { status: "Choose a status from the list." },
      });
    }
  });

  it("rejects missing or nullish status as required", () => {
    for (const payload of [{}, { status: undefined }, { status: null }]) {
      expect(validateStatusUpdate(payload)).toEqual({
        ok: false,
        fields: { status: "Status is required." },
      });
    }
  });

  it("tolerates non-object bodies with the same field map (never throws)", () => {
    // null, scalars, arrays — the route feeds whatever readJsonBody parsed
    // into the seam; only the 422 shape may come out.
    for (const payload of [null, 42, "confirmed", ["confirmed"]]) {
      expect(validateStatusUpdate(payload)).toEqual({
        ok: false,
        fields: { status: "Status is required." },
      });
    }
  });

  it("ignores extra fields — the seam reads only `status`", () => {
    const result = validateStatusUpdate({
      status: "completed",
      fullName: "irrelevant",
      id: "cmux…",
    });
    expect(result).toEqual({ ok: true, value: "completed" });
  });
});
