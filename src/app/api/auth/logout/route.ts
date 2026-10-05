import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

/* POST /api/auth/logout — clears the staff session cookie. Idempotent:
 * clearing an absent cookie is still a 200. */

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
  return response;
}
