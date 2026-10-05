import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  signSession,
  verifyPassword,
} from "@/lib/auth";

/* ---------------------------------------------------------------------------
 * POST /api/auth/login — staff sign-in for the appointment dashboard.
 *
 * Contract:
 *  - Body: {email, password} (JSON). Email is trimmed + lowercased.
 *  - 200 {ok: true} sets a httpOnly session cookie (7 days, SameSite=Lax,
 *    Secure in production) on success.
 *  - 401 with a GENERIC message on unknown email or wrong password — no
 *    user-enumeration oracle.
 *  - 422 with a field map on missing/invalid shapes.
 *  - 429 when the per-IP fixed-window limiter trips (10 attempts / 10 min),
 *    the same doctrine as /api/appointments.
 *  - The response never echoes the submitted values back.
 * ------------------------------------------------------------------------- */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 10;
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

if (typeof setInterval === "function") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [ip, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(ip);
    }
  }, WINDOW_MS);
  (timer as unknown as { unref?: () => void }).unref?.();
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again in a few minutes." },
      { status: 429 },
    );
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const errors: Record<string, string> = {};
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!password) {
    errors.password = "Enter your password.";
  }
  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      { error: "Please check the highlighted fields.", fields: errors },
      { status: 422 },
    );
  }

  try {
    const admin = await db.adminUser.findUnique({ where: { email } });
    const ok = admin !== null && verifyPassword(password, admin.passwordHash);

    if (!ok) {
      // Deliberately identical for unknown email and wrong password.
      return NextResponse.json(
        { error: "Incorrect email or password." },
        { status: 401 },
      );
    }

    const token = signSession(admin.id);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_TTL_SECONDS,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("[api/auth/login] failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Sign-in is unavailable right now. Please try again." },
      { status: 500 },
    );
  }
}
