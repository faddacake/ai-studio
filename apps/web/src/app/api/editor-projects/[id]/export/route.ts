export const runtime = "nodejs";

/**
 * POST /api/editor-projects/[id]/export
 *
 * Stub export-job endpoint. Derives the canonical render plan from the saved
 * project, converts it to a validated ExportJobPayload, and returns an
 * "accepted" response with the payload.
 *
 * Actual rendering (FFmpeg, queue wiring, artifact generation) is not yet
 * implemented. This route exists to prove the payload contract is exercisable
 * end-to-end and that schema validation passes for real project data.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEditorProject } from "@/server/api/editorProjects";
import { buildRenderPlan } from "@/lib/renderPlan";
import { buildExportPayload } from "@/lib/exportPayload";
import { ExportJobPayloadSchema } from "@aistudio/shared";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const project = getEditorProject(id);
  if (!project) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (project.scenes.length === 0) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "project has no scenes to export" },
      { status: 422 },
    );
  }

  const plan = buildRenderPlan(project.scenes);
  const payload = buildExportPayload(plan, project.id, project.aspectRatio);

  // Validate the derived payload against the canonical schema.
  // A parse failure here would indicate a logic bug in the builder.
  const validation = ExportJobPayloadSchema.safeParse(payload);
  if (!validation.success) {
    console.error("[export] payload schema validation failed", validation.error.format());
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "export payload failed schema validation" },
      { status: 500 },
    );
  }

  // Rendering not yet implemented — return accepted stub with the validated payload.
  return NextResponse.json(
    { status: "accepted", jobId: null, payload: validation.data },
    { status: 202 },
  );
}
