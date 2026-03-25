export const runtime = "nodejs";

/**
 * POST /api/export-jobs/claim-and-execute-next
 *
 * Internal-only route that atomically claims the next pending export job
 * and immediately drives it to a terminal status — the first end-to-end
 * worker simulation boundary.
 *
 * Body: { outcome: "completed" | "failed" }
 *
 *   "completed"  →  pending → running → completed
 *   "failed"     →  pending → running → failed
 *
 * 200 — job claimed and driven to the requested terminal status
 * 400 — missing or invalid outcome in request body
 * 404 — no pending job exists
 * 409 — lifecycle transition rejected (e.g. job already terminal)
 *
 * No rendering, no ffmpeg, no artifacts, no retries, no worker loop.
 * Not intended for production use.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  claimNextPendingExportJob,
  finishExportJob,
} from "@/server/api/editorExportJobs";

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

  const claimed = claimNextPendingExportJob();
  if (!claimed) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  let job;
  try {
    job = finishExportJob(claimed.id, outcome as "completed" | "failed");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "TRANSITION_ERROR", message },
      { status: 409 },
    );
  }

  return NextResponse.json({
    id: job.id,
    projectId: job.projectId,
    status: job.status,
    totalDurationMs: job.totalDurationMs,
    sceneCount: job.sceneCount,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  });
}
