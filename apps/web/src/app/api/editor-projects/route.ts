export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createEditorProject, listEditorProjects } from "@/server/api/editorProjects";
import type { AspectRatio, AudioTrack, Scene } from "@/lib/editorProjectTypes";

const VALID_ASPECT_RATIOS = new Set<string>(["16:9", "9:16", "1:1"]);

// GET /api/editor-projects — list all projects newest first
export async function GET() {
  const projects = listEditorProjects();
  return NextResponse.json(projects);
}

// POST /api/editor-projects — create a new project
export async function POST(request: NextRequest) {
  const body = await request.json() as {
    name?: unknown;
    aspectRatio?: unknown;
    scenes?: unknown;
    audioTrack?: unknown;
  };

  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "name is required" },
      { status: 400 },
    );
  }

  const aspectRatio = (body.aspectRatio ?? "16:9") as string;
  if (!VALID_ASPECT_RATIOS.has(aspectRatio)) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "aspectRatio must be 16:9, 9:16, or 1:1" },
      { status: 400 },
    );
  }

  const project = createEditorProject({
    name: body.name,
    aspectRatio: aspectRatio as AspectRatio,
    scenes: Array.isArray(body.scenes) ? (body.scenes as Scene[]) : [],
    audioTrack: body.audioTrack ? (body.audioTrack as AudioTrack) : undefined,
  });

  return NextResponse.json(project, { status: 201 });
}
