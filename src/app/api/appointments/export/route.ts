import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import {
  appointmentsToCsv,
  filterAppointments,
  parseDashboardFilters,
  urlSearchParamsToRecord,
} from "@/lib/dashboard-filters";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";

/* ---------------------------------------------------------------------------
 * GET /api/appointments/export — the dashboard's CSV export (session-34,
 * ADR-012): the same filters the query bar applies, served as an RFC 4180
 * text/csv attachment.
 *
 * Contract:
 *  - 401 for anonymous/invalid sessions BEFORE any DB read (the PATCH
 *    route's guard doctrine: the signed cookie must verify AND the admin
 *    row must still exist — deleting the staff account revokes outstanding
 *    cookies even before their expiry).
 *  - 429 when the per-key fixed-window limiter trips (60 / 10 min — the
 *    same staff pacing as the PATCH route).
 *  - Filter params parse through the SAME seam the dashboard page uses
 *    (src/lib/dashboard-filters.ts): bogus values are dropped, never a
 *    500, and the export can never disagree with the visible view.
 *  - The export window matches the dashboard's latest-100 (documented
 *    ADR-012 semantics).
 *  - 200 text/csv; charset=utf-8, Content-Disposition attachment with a
 *    request-time date prefix (self-renewing — the S26 anti-erosion
 *    doctrine). ISO 8601 dates, raw status values, CRLF rows.
 *
 * Route resolution note: the STATIC segment `export` takes precedence over
 * the sibling dynamic `[id]` segment — Next resolves static first, and the
 * two handlers expose disjoint methods anyway (GET here, PATCH there).
 * ------------------------------------------------------------------------- */

const limiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 60 });

export async function GET(request: Request) {
  if (limiter.rateLimited(clientKey(request))) {
    return NextResponse.json(
      { error: "Too many exports. Please try again in a few minutes." },
      { status: 429 },
    );
  }

  // Session guard — identical doctrine to the dashboard page and the PATCH
  // route: the signed cookie must verify AND the admin row must still
  // exist. Anonymous callers never reach the DB read.
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const admin = await db.adminUser.findUnique({
    where: { id: session.adminId },
    select: { id: true },
  });
  if (!admin) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // The SAME seam the dashboard page uses — filters cannot drift apart.
  // urlSearchParamsToRecord keeps EVERY occurrence per key so parse's
  // firstValue resolves repeated keys FIRST-wins — byte-identical to the
  // dashboard page's Next-searchParams path (session-36, F5: the export
  // always matches the visible view, even for hand-crafted URLs).
  const url = new URL(request.url);
  const filters = parseDashboardFilters(urlSearchParamsToRecord(url.searchParams));

  const appointments = await db.appointment.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
      specialty: true,
      preferredDate: true,
      status: true,
      createdAt: true,
    },
  });

  const csv = appointmentsToCsv(filterAppointments(appointments, filters));
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="appointments-${date}.csv"`,
    },
  });
}
