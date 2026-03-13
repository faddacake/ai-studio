export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getDb, schema, sql } from "@aistudio/db";

function parseTags(raw: string | null | undefined): string[] {
  try { return JSON.parse(raw ?? "[]") ?? []; } catch { return []; }
}

// GET /api/workflows — list all non-deleted workflows
export async function GET() {
  const db = getDb();
  const rows = db
    .select({
      id: schema.workflows.id,
      name: schema.workflows.name,
      description: schema.workflows.description,
      tags: schema.workflows.tags,
      isPinned: schema.workflows.isPinned,
      lastRunStatus: schema.workflows.lastRunStatus,
      lastRunAt: schema.workflows.lastRunAt,
      updatedAt: schema.workflows.updatedAt,
      createdAt: schema.workflows.createdAt,
    })
    .from(schema.workflows)
    .where(sql`${schema.workflows.deletedAt} IS NULL`)
    .all();

  const parsed = rows.map((r) => ({
    ...r,
    tags: parseTags(r.tags),
  }));
  return NextResponse.json(parsed);
}

// POST /api/workflows — create a new workflow
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, description, graph } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Workflow name is required" },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const id = randomUUID();

  const emptyGraph = JSON.stringify({ version: 1, nodes: [], edges: [] });
  const graphStr =
    graph && typeof graph === "object" ? JSON.stringify(graph) : emptyGraph;

  const db = getDb();
  db.insert(schema.workflows)
    .values({
      id,
      name: name.trim(),
      description: description?.trim() || "",
      graph: graphStr,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return NextResponse.json({ id, name: name.trim() }, { status: 201 });
}
