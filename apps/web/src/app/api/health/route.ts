export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getDb } from "@aistudio/db";

export async function GET() {
  try {
    getDb();
    return NextResponse.json({
      status: "ok",
      db: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    // IMPORTANT: print full error + stack to docker logs
    console.error("[health] DB health check failed:", err);
    console.error("[health] stack:", err?.stack);

    return NextResponse.json(
      {
        status: "error",
        message: err?.message ?? String(err),
        name: err?.name,
        stack: err?.stack,
      },
      { status: 500 },
    );
  }
}

