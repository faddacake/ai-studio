export const runtime = "nodejs";

/**
 * GET /api/export-jobs/[jobId]
 *
 * Returns the public status shape of a single persisted export job.
 * The full renderer payload is intentionally omitted from the response —
 * consumers need status and summary data, not the raw scene list.
 *
 * This endpoint is strictly read-only. Status transitions are owned by
 * the future worker/queue layer; this route exposes whatever is persisted.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEditorExportJob } from "@/server/api/editorExportJobs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;

  const job = getEditorExportJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({
    id: job.id,
    projectId: job.projectId,
    status: job.status,
    totalDurationMs: job.totalDurationMs,
    sceneCount: job.sceneCount,
    renderResult: job.renderResult,   // PersistedRenderResult | null — parsed by the data layer
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  });
}
