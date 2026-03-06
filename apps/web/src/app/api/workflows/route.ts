export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getDb, schema, sql } from "@aistudio/db";

// GET /api/workflows — list all non-deleted workflows
export async function GET() {
  const db = getDb();
  const rows = db
    .select({
      id: schema.workflows.id,
      name: schema.workflows.name,
      description: schema.workflows.description,
      lastRunStatus: schema.workflows.lastRunStatus,
      lastRunAt: schema.workflows.lastRunAt,
      updatedAt: schema.workflows.updatedAt,
      createdAt: schema.workflows.createdAt,
    })
    .from(schema.workflows)
    .where(sql`${schema.workflows.deletedAt} IS NULL`)
    .all();

  return NextResponse.json(rows);
}

// POST /api/workflows — create a new workflow
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, description } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Workflow name is required" },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const id = randomUUID();

  const emptyGraph = JSON.stringify({
    version: 1,
    nodes: [],
    edges: [],
  });

  const db = getDb();
  db.insert(schema.workflows)
    .values({
      id,
      name: name.trim(),
      description: description?.trim() || "",
      graph: emptyGraph,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return NextResponse.json({ id, name: name.trim() }, { status: 201 });
}
