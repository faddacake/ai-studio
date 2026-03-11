export const runtime = "nodejs";

/**
 * POST /api/workflows/:id/runs — start a new run for a workflow.
 *
 * Loads the workflow graph from the DB, bootstraps engine registries,
 * creates a RunCoordinator run, fires the dispatch loop async (fire-and-
 * forget), and returns { id: runId } immediately so clients can subscribe
 * to the SSE stream at /api/workflows/:id/runs/:runId/events.
 */
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@aistudio/db";
import { desc, eq } from "drizzle-orm";
import path from "node:path";

import {
  nodeExecutor,
  registerCapabilityExecutors,
  registerLocalExecutors,
  type DispatchJob,
} from "@aistudio/engine";
// registerCapabilityExecutors / registerLocalExecutors register on the
// module-level nodeExecutor singleton and take no arguments.
import {
  registerBuiltInNodes,
  nodeRegistry,
  type NodeExecutionContext,
} from "@aistudio/shared";
import { getRunCoordinator } from "@/lib/runCoordinator";
import { initializeNodeRegistry } from "@/lib/nodeRegistryInit";

// ── Registry bootstrap (idempotent) ──────────────────────────────────────────

let executorsRegistered = false;

function ensureEngineBootstrapped(): void {
  // Node registry (shared package definitions)
  initializeNodeRegistry();

  // Executor handlers (engine package)
  if (!executorsRegistered) {
    registerCapabilityExecutors();
    registerLocalExecutors();
    executorsRegistered = true;
  }
}

// ── Dispatch loop ─────────────────────────────────────────────────────────────

/**
 * Inline dispatch: the coordinator calls this for each ready node.
 * We execute the node synchronously (within the async callback) and
 * report the result back so the coordinator can advance the DAG.
 *
 * This runs entirely in the Node.js process — no external queue.
 */
function makeDispatch(runId: string, outputDir: string): DispatchJob {
  const coordinator = getRunCoordinator();

  const dispatch: DispatchJob = async (job) => {
    // Mark node as running
    const run = coordinator.getRun(runId);
    const nodeState = run.nodeStates.get(job.nodeId);
    if (nodeState) {
      nodeState.status = "running";
      nodeState.startedAt = Date.now();
    }

    try {
      const context: NodeExecutionContext = {
        nodeId: job.nodeId,
        runId: job.runId,
        inputs: job.inputs,
        params: job.params,
        providerId: job.providerId,
        modelId: job.modelId,
        outputDir,
      };

      const result = await nodeExecutor.execute(context);

      await coordinator.onNodeCompleted(
        job.runId,
        job.nodeId,
        result.outputs,
        result.cost,
        dispatch,
      );
    } catch (err) {
      await coordinator.onNodeFailed(
        job.runId,
        job.nodeId,
        err instanceof Error ? err.message : String(err),
        dispatch,
      );
    }
  };

  return dispatch;
}

// ── Route handlers ────────────────────────────────────────────────────────────

/**
 * GET /api/workflows/:id/runs — list historical run records, newest first.
 * Excludes graphSnapshot (large) — returns summary fields only.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: workflowId } = await params;
  const db = getDb();

  const workflow = db
    .select({ id: schema.workflows.id })
    .from(schema.workflows)
    .where(eq(schema.workflows.id, workflowId))
    .get();

  if (!workflow) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Workflow not found" },
      { status: 404 },
    );
  }

  const rows = db
    .select({
      id: schema.runs.id,
      workflowId: schema.runs.workflowId,
      status: schema.runs.status,
      totalCost: schema.runs.totalCost,
      startedAt: schema.runs.startedAt,
      completedAt: schema.runs.completedAt,
      createdAt: schema.runs.createdAt,
    })
    .from(schema.runs)
    .where(eq(schema.runs.workflowId, workflowId))
    .orderBy(desc(schema.runs.createdAt))
    .all();

  return NextResponse.json(rows);
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: workflowId } = await params;

  // Load workflow from DB
  const db = getDb();
  const row = db
    .select()
    .from(schema.workflows)
    .where(eq(schema.workflows.id, workflowId))
    .get();

  if (!row) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Workflow not found" },
      { status: 404 },
    );
  }

  let graph: ReturnType<typeof JSON.parse>;
  try {
    graph = JSON.parse(row.graph as string);
  } catch {
    return NextResponse.json(
      { error: "INVALID_GRAPH", message: "Workflow graph is malformed" },
      { status: 422 },
    );
  }

  // Bootstrap engine registries (idempotent)
  ensureEngineBootstrapped();

  // Create run
  const runId = randomUUID();
  const outputDir = path.join("/tmp/aistudio-runs", runId);
  const coordinator = getRunCoordinator();

  coordinator.createRun({
    runId,
    workflowId,
    workflow: graph,
  });

  // Fire dispatch loop async — response returns immediately.
  // startRun() resolves only after the full DAG is processed (inline dispatch),
  // so we persist run outcome to the DB in the .then() continuation.
  const dispatch = makeDispatch(runId, outputDir);
  coordinator.startRun(runId, dispatch)
    .then(() => {
      const finalRun = coordinator.getRun(runId);
      const now = new Date().toISOString();
      const completedAt = finalRun.completedAt
        ? new Date(finalRun.completedAt).toISOString()
        : now;

      const db2 = getDb();

      // Write run record to runs table
      db2.insert(schema.runs)
        .values({
          id: runId,
          workflowId,
          status: finalRun.status,
          graphSnapshot: JSON.stringify(graph),
          graphVersion: 1,
          totalCost: finalRun.totalCost,
          startedAt: finalRun.startedAt ? new Date(finalRun.startedAt).toISOString() : now,
          completedAt,
          createdAt: new Date(finalRun.createdAt).toISOString(),
        })
        .run();

      // Update workflow record with last run outcome
      db2.update(schema.workflows)
        .set({
          lastRunId: runId,
          lastRunStatus: finalRun.status,
          lastRunAt: completedAt,
          updatedAt: now,
        })
        .where(eq(schema.workflows.id, workflowId))
        .run();
    })
    .catch((err) => {
      console.error(`[runs/route] Run ${runId} failed:`, err);
    });

  return NextResponse.json({ id: runId }, { status: 202 });
}
