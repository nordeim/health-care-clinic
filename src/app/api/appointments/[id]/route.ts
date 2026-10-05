import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { validateStatusUpdate } from "@/lib/validation";
import {
  MAX_BODY_BYTES,
  clientKey,
  createRateLimiter,
  readJsonBody,
} from "@/lib/rate-limit";

/* ---------------------------------------------------------------------------
 * PATCH /api/appointments/[id] — the dashboard's status-transition write
 * path (session-16 G1 — the last documented backlog item closed).
 *
 * Contract:
 *  - Body: {status} (JSON) with status ∈ {new, confirmed, completed} —
 *    validated by the pure seam src/lib/validation.ts (allowlist DERIVED
 *    from content.ts appointmentStatuses — the API can never drift from
 *    the dashboard's rendered state space).
 *  - 401 for anonymous/invalid sessions BEFORE any body read or lookup
 *    (the dashboard page's guard pattern, applied at the API seam). The
 *    admin row must still exist — deleting the staff account revokes
 *    outstanding cookies even before their expiry.
 *  - 413 when the body exceeds 64 KiB (stream-read cap — every transport
 *    shape, session-10 F2); 400 for unparseable JSON; 422 with a field
 *    map for invalid shapes/values — non-object bodies (null/scalars)
 *    degrade to the same field map, never a 500 (session-10 F1).
 *  - 404 for an unknown appointment id (staff-only surface — no existence
 *    leak concern).
 *  - 429 when the per-key fixed-window limiter trips (60 / 10 min — staff
 *    pacing that still slows bulk tampering with a stolen cookie).
 *  - 200 {ok, id, status} — never echoes PII.
 *
 * Deliberately NOT enforced here: the UI's transition graph
 * (new -> confirmed -> completed). The seam validates the VALUE only —
 * jumping states (e.g. directly completing a walk-in) is a legitimate
 * staff action, and every transition stamps updatedAt (Prisma @updatedAt)
 * so the audit trail survives.
 * ------------------------------------------------------------------------- */

const limiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 60 });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (limiter.rateLimited(clientKey(request))) {
    return NextResponse.json(
      { error: "Too many updates. Please try again in a few minutes." },
      { status: 429 },
    );
  }

  // Session guard — identical doctrine to the dashboard page: the signed
  // cookie must verify AND the admin row must still exist. Anonymous
  // callers never reach the body read or the DB lookup.
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) {
    return NextResponse.json(
      { error: "Sign in required." },
      { status: 401 },
    );
  }
  const admin = await db.adminUser.findUnique({
    where: { id: session.adminId },
    select: { id: true },
  });
  if (!admin) {
    return NextResponse.json(
      { error: "Sign in required." },
      { status: 401 },
    );
  }

  const bodyResult = await readJsonBody(request);
  if (!bodyResult.ok) {
    return NextResponse.json(
      {
        error:
          bodyResult.status === 413
            ? `That request is too large (over ${MAX_BODY_BYTES / 1024} KiB).`
            : "Invalid request body.",
      },
      { status: bodyResult.status },
    );
  }

  const validation = validateStatusUpdate(bodyResult.value);
  if (!validation.ok) {
    return NextResponse.json(
      { error: "Please check the highlighted fields.", fields: validation.fields },
      { status: 422 },
    );
  }

  const { id } = await params;

  try {
    const existing = await db.appointment.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Appointment not found." },
        { status: 404 },
      );
    }

    const appointment = await db.appointment.update({
      where: { id },
      data: { status: validation.value },
      select: { id: true, status: true },
    });

    return NextResponse.json({
      ok: true,
      id: appointment.id,
      status: appointment.status,
    });
  } catch (error) {
    console.error("[api/appointments/[id]] status update failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "The update failed. Please try again." },
      { status: 500 },
    );
  }
}
