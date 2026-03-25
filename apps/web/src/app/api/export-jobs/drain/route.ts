export const runtime = "nodejs";

/**
 * POST /api/export-jobs/drain
 *
 * Internal-only route that drains all pending export jobs by repeatedly
 * claiming and finishing each one until no pending job remains.
 *
 * Body: { outcome: "completed" | "failed" }
 *
 * 200 — drain complete (includes zero-work cases)
 *        { processed, jobIds, outcome }
 * 400 — missing or invalid outcome in request body
 *
 * No rendering, no ffmpeg, no artifacts, no retries, no background daemon.
 * Not intended for production use.
 */

import { NextRequest, NextResponse } from "next/server";
import { drainExportQueue } from "@/server/api/editorExportJobs";

const VALID_OUTCOMES = new Set(["completed", "failed"]);

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json() as unknown;
  } catch {
    return NextResponse.json(
      { error: "INVALID_BODY", message: "request body must be JSON" },
      { status: 400 },
    );
  }

  const outcome = (body as Record<string, unknown>)?.outcome;
  if (typeof outcome !== "string" || !VALID_OUTCOMES.has(outcome)) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: 'outcome must be "completed" or "failed"' },
      { status: 400 },
    );
  }

  const result = drainExportQueue(outcome as "completed" | "failed");

  return NextResponse.json({
    processed: result.processed,
    jobIds: result.jobIds,
    outcome: result.outcome,
  });
}
