export const runtime = "nodejs";

/**
 * POST /api/export-jobs/[jobId]/simulate
 *
 * Internal-only route that advances a pending export job through its full
 * lifecycle in one synchronous call, without performing real rendering.
 *
 * Body: { outcome: "success" | "failure" }
 *
 *   "success"  →  pending → running → completed
 *   "failure"  →  pending → running → failed
 *
 * Returns the final public job shape on success.
 * Not intended for production use — exists to exercise the transition chain
 * end-to-end before real workers and queue infrastructure are wired up.
 */

import { NextRequest, NextResponse } from "next/server";
import { simulateExportJob } from "@/server/api/editorExportJobs";

const VALID_OUTCOMES = new Set(["success", "failure"]);

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
      { error: "VALIDATION_ERROR", message: 'outcome must be "success" or "failure"' },
      { status: 400 },
    );
  }

  let job;
  try {
    job = simulateExportJob(jobId, outcome as "success" | "failure");
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
