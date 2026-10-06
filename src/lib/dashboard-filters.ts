import { APPOINTMENT_SPECIALTIES, APPOINTMENT_STATUSES } from "@/lib/validation";

/* ---------------------------------------------------------------------------
 * The dashboard query seam (session-34, ADR-012): ONE pure code path that
 * parses, filters, and exports the staff table — shared by the dashboard
 * page and the CSV export route so the two surfaces cannot drift apart.
 *
 * Doctrine notes:
 *  - Allowlists are DERIVED (validation.ts re-derives them from
 *    content.ts) — never hand-copied; a value outside the shared value
 *    space is dropped, never a 500.
 *  - Filtering applies within the caller's fetch window (the dashboard's
 *    latest-100); the seam is agnostic to where the rows came from.
 *  - Prisma SQLite has no case-insensitive `contains`, so search is an
 *    in-memory substring match here — deterministic and unit-testable.
 * ------------------------------------------------------------------------- */

/** Search bound — matches the public form's fullName bound (3–120). */
export const MAX_SEARCH_LENGTH = 120;

/** The row shape the dashboard table and the CSV export operate on. */
export type DashboardAppointment = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  specialty: string;
  preferredDate: string | null;
  status: string;
  createdAt: Date;
};

/** Active query filters. Every field is optional; `{}` means "no filter". */
export type DashboardFilters = {
  status?: string;
  specialty?: string;
  search?: string;
};

/** The raw searchParams shape Next 16 delivers to a page (values may be
 * arrays when the client repeats a key). */
type RawParams = Record<string, string | string[] | undefined> | undefined;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Parse URL params into safe filters: bogus/out-of-allowlist values are
 * dropped (never trusted), empty strings (a GET form's unset selects) are
 * treated as absent, the search term is trimmed and truncated. */
export function parseDashboardFilters(params: RawParams): DashboardFilters {
  const filters: DashboardFilters = {};

  const status = firstValue(params?.status);
  if (typeof status === "string" && APPOINTMENT_STATUSES.has(status)) {
    filters.status = status;
  }

  const specialty = firstValue(params?.specialty);
  if (typeof specialty === "string" && APPOINTMENT_SPECIALTIES.has(specialty)) {
    filters.specialty = specialty;
  }

  const search = firstValue(params?.search);
  if (typeof search === "string") {
    const trimmed = search.trim().slice(0, MAX_SEARCH_LENGTH);
    if (trimmed.length > 0) {
      filters.search = trimmed;
    }
  }

  return filters;
}

/** True when no filter is active (the unfiltered view). */
export function filtersAreEmpty(filters: DashboardFilters): boolean {
  return filters.status === undefined && filters.specialty === undefined && filters.search === undefined;
}

/** Convert a URLSearchParams bag into the raw record shape
 * `parseDashboardFilters` accepts — EVERY occurrence per key, in order
 * (session-36, F5). The export route previously collapsed repeated keys via
 * `Object.fromEntries` (LAST value wins) while the dashboard page's Next
 * searchParams path takes the FIRST — a hand-crafted
 * `?status=new&status=completed` URL rendered "new" but exported
 * "completed". Routing both surfaces through this conversion makes them
 * first-wins BY CONSTRUCTION (firstValue takes index 0). */
export function urlSearchParamsToRecord(
  params: URLSearchParams,
): Record<string, string[]> {
  const record: Record<string, string[]> = {};
  for (const [key, value] of params) {
    (record[key] ??= []).push(value);
  }
  return record;
}

/** Pure AND filter: status exact, specialty exact, and a case-insensitive
 * substring search across the contact fields (name / phone / email). */
export function filterAppointments(
  rows: readonly DashboardAppointment[],
  filters: DashboardFilters,
): DashboardAppointment[] {
  const needle = filters.search?.toLowerCase();
  return rows.filter((row) => {
    if (filters.status !== undefined && row.status !== filters.status) return false;
    if (filters.specialty !== undefined && row.specialty !== filters.specialty) return false;
    if (needle !== undefined) {
      const haystack =
        `${row.fullName}\n${row.phone}\n${row.email ?? ""}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}

/* --- CSV composition (RFC 4180) ----------------------------------------- */

const CSV_COLUMNS = [
  "Requested at",
  "Full name",
  "Phone",
  "Email",
  "Specialty",
  "Preferred date",
  "Status",
] as const;

/** Spreadsheet-formula guard (session-36, the OWASP CSV-injection class):
 * a cell whose FIRST character could start a formula (= + - @ tab CR) is
 * prefixed with an apostrophe. The big-three spreadsheet apps treat a
 * leading apostrophe as a text marker — hidden in display, so values like
 * "+65 6555 0134" still DISPLAY verbatim while refusing evaluation. The
 * public appointment form accepts formula-leading names/phones/emails
 * (fullName has no charset rule; EMAIL_PATTERN accepts "=a@b.cd"), so the
 * EXPORT is the evaluation boundary and guards every column uniformly. */
const FORMULA_LEADING = /^[=+\-@\t\r]/;

/** Quote a field when it contains a comma, quote, CR, or LF; embedded
 * quotes are doubled (RFC 4180 §2.7); formula-leading cells gain the
 * apostrophe text-marker first (the guard composes INSIDE the quotes). */
function csvField(value: string): string {
  const safe = FORMULA_LEADING.test(value) && !value.startsWith("'")
    ? `'${value}`
    : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** Compose the export: header row, ISO 8601 dates, raw status values (the
 * API value space — round-trippable), empty fields for nulls, CRLF row
 * separators. Dates are rendered from their ISO instant so the export is
 * timezone-stable regardless of the server's locale. */
export function appointmentsToCsv(
  rows: readonly DashboardAppointment[],
): string {
  const lines = [CSV_COLUMNS.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.createdAt.toISOString(),
        row.fullName,
        row.phone,
        row.email ?? "",
        row.specialty,
        row.preferredDate ?? "",
        row.status,
      ]
        .map(csvField)
        .join(","),
    );
  }
  return `${lines.join("\r\n")}\r\n`;
}

/** Canonical query string for the ACTIVE filters (empty values dropped,
 * URLSearchParams encoding) — the export link and the form share it.
 * Returns "" when no filter is active. */
export function filtersToQueryString(filters: DashboardFilters): string {
  const qs = new URLSearchParams();
  if (filters.status) qs.set("status", filters.status);
  if (filters.specialty) qs.set("specialty", filters.specialty);
  if (filters.search) qs.set("search", filters.search);
  const encoded = qs.toString();
  return encoded.length > 0 ? `?${encoded}` : "";
}
