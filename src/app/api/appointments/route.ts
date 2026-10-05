import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateAppointmentPayload } from "@/lib/validation";
import {
  MAX_BODY_BYTES,
  clientKey,
  createRateLimiter,
  readJsonBody,
} from "@/lib/rate-limit";

/* ---------------------------------------------------------------------------
 * POST /api/appointments — the landing page's only write path.
 *
 * Contract:
 *  - fullName (3–120 chars, required), phone (7–32 chars, required),
 *    email (optional, RFC-ish sanity check), specialty (must match the
 *    published service list or "Primary Care"), preferredDate (optional,
 *    YYYY-MM-DD, a REAL calendar date, not in the past — impossible dates
 *    like 2025-02-31 are rejected by the seam's component round-trip).
 *  - 413 when the body exceeds 64 KiB (enforced while STREAM-READING —
 *    chunked bodies without a content-length are capped too, session-10
 *    F2); 422 with a field map on validation failure; 429 when the
 *    per-IP limiter trips (5 / 10 min, keyed on the LAST X-Forwarded-For
 *    token — see src/lib/rate-limit.ts); 201 with the persisted id on
 *    success.
 *  - The response NEVER echoes the submitted payload back (minimizes PII
 *    reflection); failures are safe to display verbatim.
 * ------------------------------------------------------------------------- */

/* Fixed-window in-memory limiter: 5 submissions per key per 10 minutes.
 * Single-process dev/standalone deployments (this app's only deployment
 * shape — see DEPLOYMENT.md) make a local map sufficient. */
const limiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 5 });

export async function POST(request: Request) {
  if (limiter.rateLimited(clientKey(request))) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in a few minutes or call us." },
      { status: 429 },
    );
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return NextResponse.json(
      {
        error:
          body.status === 413
            ? `That request is too large (over ${MAX_BODY_BYTES / 1024} KiB). Please call us instead.`
            : "Invalid request body.",
      },
      { status: body.status },
    );
  }

  const result = validateAppointmentPayload(body.value);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Please check the highlighted fields.", fields: result.fields },
      { status: 422 },
    );
  }

  try {
    const appointment = await db.appointment.create({
      data: result.value,
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: appointment.id }, { status: 201 });
  } catch (error) {
    console.error("[api/appointments] persistence failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error:
          "We could not save your request right now. Please call 123-456-7890.",
      },
      { status: 500 },
    );
  }
}
