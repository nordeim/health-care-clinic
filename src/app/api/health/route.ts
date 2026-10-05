import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/* GET /api/health — liveness + database readiness probe.
 * Used by the Playwright webServer gate and any uptime monitor. */

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, database: "up" });
  } catch (error) {
    console.error("[api/health] database probe failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ ok: false, database: "down" }, { status: 503 });
  }
}
