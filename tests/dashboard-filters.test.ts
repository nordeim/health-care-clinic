import { describe, expect, it } from "vitest";
import {
  appointmentsToCsv,
  filterAppointments,
  filtersToQueryString,
  parseDashboardFilters,
  MAX_SEARCH_LENGTH,
} from "@/lib/dashboard-filters";
import { APPOINTMENT_SPECIALTIES, APPOINTMENT_STATUSES } from "@/lib/validation";
import { appointmentStatuses, services } from "@/lib/content";

/* The dashboard query seam (session-34, ADR-012): the SAME pure code path
 * parses/filters/exports for the dashboard page and the CSV export route,
 * so the two surfaces cannot drift apart. Allowlists are DERIVED from
 * content.ts via validation.ts (the derived-allowlist doctrine) — the pins
 * below assert that derivation, never a hand-copied list. */

const row = (overrides: Partial<Parameters<typeof filterAppointments>[0][number]> = {}) => ({
  id: "r1",
  fullName: "Maria Sanchez",
  phone: "+1 555 010 0001",
  email: "maria@example.com",
  specialty: "Pediatric care",
  preferredDate: "2026-11-04",
  status: "new",
  createdAt: new Date("2026-10-01T10:30:00.000Z"),
  ...overrides,
});

describe("parseDashboardFilters", () => {
  it("treats undefined params as no filters", () => {
    expect(parseDashboardFilters(undefined)).toEqual({});
  });

  it("treats an empty param bag (a GET form with unset selects) as no filters", () => {
    expect(parseDashboardFilters({ status: "", specialty: "", search: "" })).toEqual({});
  });

  it("keeps a valid status", () => {
    expect(parseDashboardFilters({ status: "new" })).toEqual({ status: "new" });
    expect(parseDashboardFilters({ status: "confirmed" })).toEqual({ status: "confirmed" });
    expect(parseDashboardFilters({ status: "completed" })).toEqual({ status: "completed" });
  });

  it("drops a bogus status (allowlist-derived, case-sensitive)", () => {
    expect(parseDashboardFilters({ status: "cancelled" })).toEqual({});
    expect(parseDashboardFilters({ status: "New" })).toEqual({});
    expect(parseDashboardFilters({ status: "42" })).toEqual({});
  });

  it("keeps a valid specialty (the services-derived allowlist)", () => {
    expect(parseDashboardFilters({ specialty: "Pediatric care" })).toEqual({
      specialty: "Pediatric care",
    });
  });

  it("drops a bogus specialty", () => {
    expect(parseDashboardFilters({ specialty: "Podiatry" })).toEqual({});
  });

  it("ignores unrelated params entirely", () => {
    expect(parseDashboardFilters({ page: "3", sort: "name", status: "new" })).toEqual({
      status: "new",
    });
  });

  it("uses the first value of an array param (defensive shape)", () => {
    expect(parseDashboardFilters({ status: ["new", "completed"] })).toEqual({ status: "new" });
  });

  it("trims the search term", () => {
    expect(parseDashboardFilters({ search: "  maria  " })).toEqual({ search: "maria" });
  });

  it("treats a whitespace-only search as absent", () => {
    expect(parseDashboardFilters({ search: "   " })).toEqual({});
  });

  it(`truncates the search term at ${MAX_SEARCH_LENGTH} characters`, () => {
    const long = "a".repeat(MAX_SEARCH_LENGTH + 10);
    expect(parseDashboardFilters({ search: long })).toEqual({
      search: "a".repeat(MAX_SEARCH_LENGTH),
    });
  });

  it("derives the status allowlist from content.ts appointmentStatuses", () => {
    // The API value space IS the dashboard's filter value space.
    for (const { value } of appointmentStatuses) {
      expect(APPOINTMENT_STATUSES.has(value)).toBe(true);
    }
  });

  it("derives the specialty allowlist from content.ts services", () => {
    for (const { title } of services) {
      expect(APPOINTMENT_SPECIALTIES.has(title)).toBe(true);
    }
  });
});

describe("filterAppointments", () => {
  const rows = [
    row(),
    row({
      id: "r2",
      fullName: "James Okafor",
      phone: "+1 555 010 0002",
      email: null,
      specialty: "Family care",
      status: "confirmed",
    }),
    row({
      id: "r3",
      fullName: "Elena Petrova",
      phone: "+1 555 010 0003",
      email: "elena@example.com",
      specialty: "Pediatric care",
      status: "completed",
    }),
  ];

  it("returns every row unchanged under empty filters (identity)", () => {
    expect(filterAppointments(rows, {})).toHaveLength(3);
  });

  it("filters by status", () => {
    const out = filterAppointments(rows, { status: "new" });
    expect(out.map((r) => r.id)).toEqual(["r1"]);
  });

  it("filters by specialty", () => {
    const out = filterAppointments(rows, { specialty: "Pediatric care" });
    expect(out.map((r) => r.id)).toEqual(["r1", "r3"]);
  });

  it("searches case-insensitively across fullName", () => {
    expect(filterAppointments(rows, { search: "maria" }).map((r) => r.id)).toEqual(["r1"]);
    expect(filterAppointments(rows, { search: "MARIA" }).map((r) => r.id)).toEqual(["r1"]);
    expect(filterAppointments(rows, { search: "okafor" }).map((r) => r.id)).toEqual(["r2"]);
  });

  it("searches across phone", () => {
    expect(filterAppointments(rows, { search: "010 0003" }).map((r) => r.id)).toEqual(["r3"]);
  });

  it("searches across email (and tolerates null emails)", () => {
    expect(filterAppointments(rows, { search: "elena@" }).map((r) => r.id)).toEqual(["r3"]);
  });

  it("composes filters with AND semantics", () => {
    const out = filterAppointments(rows, { status: "completed", specialty: "Pediatric care" });
    expect(out.map((r) => r.id)).toEqual(["r3"]);
    const out2 = filterAppointments(rows, {
      specialty: "Pediatric care",
      search: "james",
    });
    expect(out2).toEqual([]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterAppointments(rows, { search: "nobody-here" })).toEqual([]);
  });
});

describe("appointmentsToCsv", () => {
  it("emits exactly the header row for an empty table", () => {
    const csv = appointmentsToCsv([]);
    expect(csv).toBe(
      "Requested at,Full name,Phone,Email,Specialty,Preferred date,Status\r\n",
    );
  });

  it("emits ISO 8601 dates, raw status values, and empty fields for nulls", () => {
    const csv = appointmentsToCsv([
      row({
        id: "r2",
        fullName: "James Okafor",
        phone: "+1 555 010 0002",
        email: null,
        specialty: "Family care",
        preferredDate: null,
        status: "confirmed",
      }),
    ]);
    expect(csv).toBe(
      "Requested at,Full name,Phone,Email,Specialty,Preferred date,Status\r\n" +
        "2026-10-01T10:30:00.000Z,James Okafor,+1 555 010 0002,,Family care,,confirmed\r\n",
    );
  });

  it("quotes fields containing commas and doubles embedded quotes (RFC 4180)", () => {
    const csv = appointmentsToCsv([
      row({ fullName: 'Sanchez, Maria "Mai"', specialty: "Acute care" }),
    ]);
    const dataLine = csv.split("\r\n")[1];
    expect(dataLine).toContain('"Sanchez, Maria ""Mai"""');
  });

  it("quotes fields containing line breaks", () => {
    const csv = appointmentsToCsv([row({ fullName: "Two\nLines" })]);
    const dataLine = csv.split("\r\n")[1];
    expect(dataLine).toContain('"Two\nLines"');
  });

  it("keeps rows in the given order and uses CRLF separators", () => {
    const csv = appointmentsToCsv([row(), row({ id: "r2", fullName: "B" })]);
    const lines = csv.split("\r\n");
    // The trailing CRLF leaves one empty tail element after split.
    expect(lines).toHaveLength(4);
    expect(lines[3]).toBe("");
    expect(lines[0]).toBe("Requested at,Full name,Phone,Email,Specialty,Preferred date,Status");
    expect(lines[1]).toContain("Maria Sanchez");
    expect(lines[2]).toContain("B");
    expect(csv.endsWith("\r\n")).toBe(true);
  });
});

describe("filtersToQueryString", () => {
  it("returns an empty string for empty filters", () => {
    expect(filtersToQueryString({})).toBe("");
  });

  it("drops empty-string values", () => {
    expect(filtersToQueryString({ status: "", search: "x" })).not.toContain("status=");
  });

  it("URL-encodes the search term (form-encoding — spaces as +)", () => {
    // URLSearchParams emits application/x-www-form-urlencoded (spaces as
    // "+") — the SAME encoding a native GET form submits, so the export
    // link and a re-submitted form are byte-compatible.
    const qs = filtersToQueryString({ search: "maria s" });
    expect(qs).toBe("?search=maria+s");
  });

  it("composes all three dimensions in a stable order", () => {
    const qs = filtersToQueryString({
      status: "new",
      specialty: "Pediatric care",
      search: "maria",
    });
    expect(qs.startsWith("?")).toBe(true);
    expect(qs).toContain("status=new");
    expect(qs).toContain("specialty=Pediatric+care");
    expect(qs).toContain("search=maria");
  });

  it("round-trips through parseDashboardFilters", () => {
    const filters = { status: "completed", specialty: "Family care", search: "okafor" };
    const reparsed = parseDashboardFilters(
      Object.fromEntries(new URLSearchParams(filtersToQueryString(filters))),
    );
    expect(reparsed).toEqual(filters);
  });
});
