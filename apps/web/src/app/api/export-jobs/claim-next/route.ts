export const runtime = "nodejs";

/**
 * POST /api/export-jobs/claim-next
 *
 * Internal-only route that atomically selects and claims the next pending
 * export job, transitioning it from `pending` → `running` in a single
 * database transaction.
 *
 * Returns the narrow public job shape on success:
 *   id, projectId, status, totalDurationMs, sceneCount, createdAt, updatedAt
 *
 * 200 — oldest pending job found and claimed (status is now "running")
 * 404 — no pending job exists
 *
 * Does not execute or finish the job. Work acquisition and work processing
 * are intentionally separated. Not intended for production use.
 */

import { NextResponse } from "next/server";
import { claimNextPendingExportJob } from "@/server/api/editorExportJobs";

export async function POST() {
  const job = claimNextPendingExportJob();
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
