export const runtime = "nodejs";

/**
 * GET /api/export-jobs/next-pending
 *
 * Internal-only read-only route that returns the oldest pending export job.
 *
 * Returns the same narrow public shape used by all export-job endpoints:
 *   id, projectId, status, totalDurationMs, sceneCount, createdAt, updatedAt
 *
 * 200 — oldest pending job found
 * 404 — no pending job exists
 *
 * Read-only: does not claim, start, or mutate the job in any way.
 * Not intended for production use — exists to expose the queue-ready
 * selection boundary through an explicit backend surface.
 */

import { NextResponse } from "next/server";
import { getNextPendingExportJob } from "@/server/api/editorExportJobs";

export async function GET() {
  const job = getNextPendingExportJob();
  if (!job) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
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
