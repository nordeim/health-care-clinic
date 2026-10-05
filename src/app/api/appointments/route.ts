import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/* ---------------------------------------------------------------------------
 * POST /api/appointments — the landing page's only write path.
 *
 * Contract:
 *  - fullName (3–120 chars, required), phone (7–32 chars, required),
 *    email (optional, RFC-ish sanity check), specialty (must match the
 *    published service list or "Primary Care"), preferredDate (optional,
 *    YYYY-MM-DD, not in the past).
 *  - 422 with a field map on validation failure; 429 when the per-IP limiter
 *    trips; 201 with the persisted id on success.
 *  - The response NEVER echoes the submitted payload back (minimizes PII
 *    reflection); failures are safe to display verbatim.
 * ------------------------------------------------------------------------- */

const ALLOWED_SPECIALTIES = new Set([
  "Primary Care",
  "Chronic care",
  "Women's health",
  "Pediatric care",
  "Vaccinations",
  "Laboratory services",
  "Family care",
  "Preventive care",
  "Acute care",
]);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type Payload = {
  fullName?: unknown;
  phone?: unknown;
  email?: unknown;
  specialty?: unknown;
  preferredDate?: unknown;
};

/* Fixed-window in-memory limiter: 5 submissions per IP per 10 minutes.
 * Single-process dev/standalone deployments (this app's only deployment
 * shape — see DEPLOYMENT.md) make a local map sufficient. */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > MAX_PER_WINDOW;
}

/* Opportunistic sweep — keeps the map from growing without bound under
 * address rotation. */
if (typeof setInterval === "function") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [ip, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(ip);
    }
  }, WINDOW_MS);
  // Never hold the process open for the sweeper.
  (timer as unknown as { unref?: () => void }).unref?.();
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in a few minutes or call us." },
      { status: 429 },
    );
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const errors: Record<string, string> = {};

  const fullName = asTrimmedString(payload.fullName);
  if (!fullName) {
    errors.fullName = "Full name is required.";
  } else if (fullName.length < 3 || fullName.length > 120) {
    errors.fullName = "Full name must be between 3 and 120 characters.";
  }

  const phone = asTrimmedString(payload.phone);
  if (!phone) {
    errors.phone = "Phone number is required.";
  } else if (phone.length < 7 || phone.length > 32) {
    errors.phone = "Phone number must be between 7 and 32 characters.";
  }

  const emailRaw = asTrimmedString(payload.email);
  const email = emailRaw ?? null;
  if (email && !EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address or leave it empty.";
  }

  const specialty = asTrimmedString(payload.specialty) ?? "Primary Care";
  if (!ALLOWED_SPECIALTIES.has(specialty)) {
    errors.specialty = "Choose a specialty from the list.";
  }

  const preferredDateRaw = asTrimmedString(payload.preferredDate);
  const preferredDate = preferredDateRaw ?? null;
  if (preferredDate) {
    const validFormat = DATE_PATTERN.test(preferredDate);
    const parsed = validFormat ? new Date(`${preferredDate}T00:00:00`) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!parsed || Number.isNaN(parsed.getTime()) || parsed < today) {
      errors.preferredDate = "Pick today or a future date.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      { error: "Please check the highlighted fields.", fields: errors },
      { status: 422 },
    );
  }

  try {
    const appointment = await db.appointment.create({
      data: {
        fullName: fullName as string,
        phone: phone as string,
        email,
        specialty,
        preferredDate,
      },
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
