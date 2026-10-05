import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  signSession,
  verifyLoginPassword,
} from "@/lib/auth";
import {
  MAX_BODY_BYTES,
  bodyTooLarge,
  clientKey,
  createRateLimiter,
} from "@/lib/rate-limit";

/* ---------------------------------------------------------------------------
 * POST /api/auth/login — staff sign-in for the appointment dashboard.
 *
 * Contract:
 *  - Body: {email, password} (JSON). Email is trimmed + lowercased.
 *  - 200 {ok: true} sets a httpOnly session cookie (7 days, SameSite=Lax,
 *    Secure in production) on success.
 *  - 401 with a GENERIC message on unknown email or wrong password — no
 *    user-enumeration oracle, in BOTH the response body AND the timing
 *    channel: verifyLoginPassword always burns scrypt, even for unknown
 *    emails (see src/lib/auth.ts DUMMY_HASH).
 *  - 413 when the body exceeds 64 KiB; 422 with a field map on
 *    missing/invalid shapes.
 *  - 429 when the per-IP fixed-window limiter trips (10 attempts / 10 min,
 *    keyed on the LAST X-Forwarded-For token — see src/lib/rate-limit.ts).
 *  - The response never echoes the submitted values back.
 * ------------------------------------------------------------------------- */

const limiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 10 });

export async function POST(request: Request) {
  if (limiter.rateLimited(clientKey(request))) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again in a few minutes." },
      { status: 429 },
    );
  }

  if (bodyTooLarge(request)) {
    return NextResponse.json(
      { error: `That request is too large (over ${MAX_BODY_BYTES / 1024} KiB).` },
      { status: 413 },
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
    // ALWAYS burn scrypt — even for unknown emails (storedHash null →
    // DUMMY_HASH inside the seam) — so the unknown-email and
    // wrong-password paths take indistinguishable time. The account
    // check happens AFTER the password work, never short-circuits it.
    const passwordOk = verifyLoginPassword(
      password,
      admin?.passwordHash ?? null,
    );
    const ok = admin !== null && passwordOk;

    if (!ok) {
      // Deliberately identical for unknown email and wrong password —
      // in body, status AND response time.
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
