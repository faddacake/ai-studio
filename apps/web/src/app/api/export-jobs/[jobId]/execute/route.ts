export const runtime = "nodejs";

/**
 * POST /api/export-jobs/[jobId]/execute
 *
 * Internal-only route that drives a pending export job through the full
 * worker-shaped lifecycle in one synchronous call, without real rendering.
 *
 * Body: { outcome: "completed" | "failed" }
 *
 *   "completed"  →  pending → running → completed
 *   "failed"     →  pending → running → failed
 *
 * Uses the executeExportJob helper (claim + finish) — the same path a real
 * worker will follow. Not intended for production use.
 */

import { NextRequest, NextResponse } from "next/server";
import { executeExportJob } from "@/server/api/editorExportJobs";

const VALID_OUTCOMES = new Set(["completed", "failed"]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;

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

  let job;
  try {
    job = executeExportJob(jobId, outcome as "completed" | "failed");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("not found")) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
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
