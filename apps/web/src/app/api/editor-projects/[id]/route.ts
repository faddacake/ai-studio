export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
  getEditorProject,
  updateEditorProject,
  deleteEditorProject,
} from "@/server/api/editorProjects";
import type { AspectRatio, AudioTrack, Scene } from "@/lib/editorProjectTypes";

const VALID_ASPECT_RATIOS = new Set<string>(["16:9", "9:16", "1:1"]);

// GET /api/editor-projects/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const project = getEditorProject(id);
  if (!project) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(project);
}

// PATCH /api/editor-projects/[id] — partial update (name, aspectRatio, scenes, audioTrack)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json() as {
    name?: unknown;
    aspectRatio?: unknown;
    scenes?: unknown;
    audioTrack?: unknown;
  };

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "name must be a non-empty string" },
        { status: 400 },
      );
    }
  }

  if (body.aspectRatio !== undefined) {
    if (!VALID_ASPECT_RATIOS.has(body.aspectRatio as string)) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "aspectRatio must be 16:9, 9:16, or 1:1" },
        { status: 400 },
      );
    }
  }

  const input: Parameters<typeof updateEditorProject>[1] = {};
  if (body.name !== undefined) input.name = body.name as string;
  if (body.aspectRatio !== undefined) input.aspectRatio = body.aspectRatio as AspectRatio;
  if (body.scenes !== undefined) input.scenes = body.scenes as Scene[];
  if ("audioTrack" in body) {
    input.audioTrack = body.audioTrack ? (body.audioTrack as AudioTrack) : null;
  }

  const updated = updateEditorProject(id, input);
  if (!updated) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(updated);
}

// DELETE /api/editor-projects/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const deleted = deleteEditorProject(id);
  if (!deleted) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
