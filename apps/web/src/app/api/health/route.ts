export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET() {
  const health: Record<string, unknown> = {
    status: "ok",
    timestamp: new Date().toISOString(),
  };

  // DB check — optional, don't fail liveness if DB is unavailable
  try {
    const { getDb } = await import("@aistudio/db");
    getDb();
    health.db = "connected";
  } catch (err: any) {
    console.error("[health] DB health check failed:", err?.message);
    health.db = "error";
    health.dbError = err?.message ?? String(err);
  }

  return NextResponse.json(health);
}

