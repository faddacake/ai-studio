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
  createGenerator,
  writeArtifact,
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
import { resolveProviderKey } from "@/lib/providers/resolveProviderKey";

// ── Registry bootstrap (idempotent) ──────────────────────────────────────────

let executorsRegistered = false;

function ensureEngineBootstrapped(): void {
  // Node registry (shared package definitions)
  initializeNodeRegistry();

  // Executor handlers (engine package)
  if (!executorsRegistered) {
    registerCapabilityExecutors();
    registerLocalExecutors();

    // Provider executor: resolves credentials from DB and delegates to the
    // appropriate GeneratorAdapter.  Supports image-generation nodes.
    nodeExecutor.setProviderExecutor(async (context, definition) => {
      const providerId = context.providerId ?? definition.provider?.providerId ?? "fal";
      const modelId = context.modelId ?? definition.provider?.modelId;

      // __apiKey is injected in makeDispatch() after DB lookup; fall back to env.
      // If neither is present the provider is not configured — fail clearly.
      const apiKey =
        (context.params.__apiKey as string | undefined) ??
        process.env.FAL_API_KEY;

      if (!apiKey) {
        throw new Error(
          `Provider "${providerId}" is not configured. ` +
          `Add your API key in Settings → Providers to run this workflow.`,
        );
      }

      const generator = createGenerator({ provider: providerId, apiKey, modelId });

      const prompt =
        (context.inputs.prompt_in as string | undefined) ??
        (context.params.prompt as string | undefined) ??
        "abstract art";
      const width = Number(context.params.width ?? 1024);
      const height = Number(context.params.height ?? 1024);
      const seed =
        context.params.seed !== undefined && Number(context.params.seed) !== -1
          ? Number(context.params.seed)
          : undefined;

      const generated = await generator.generate({ prompt, width, height, seed, signal: context.signal });

      const format = generated.mimeType.replace(/^image\//, "") === "jpeg" ? "jpeg" : "png";
      const artifactRef = await writeArtifact({
        buffer: generated.buffer,
        outputDir: context.outputDir ?? "/tmp/aistudio-runs",
        runId: context.runId,
        nodeId: context.nodeId,
        suffix: "generated",
        format,
        width: generated.width,
        height: generated.height,
      });

      return {
        outputs: { image_out: artifactRef },
        cost: 0,
        metadata: { provider: providerId, model: modelId, generatorKind: generator.kind },
      };
    });

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
      // Resolve provider API key from DB (DB config takes precedence over env).
      // Falls back to null — the provider executor will use env var as fallback.
      const resolvedProviderId = job.providerId;
      const resolvedKey = resolvedProviderId
        ? resolveProviderKey(resolvedProviderId)
        : null;

      const context: NodeExecutionContext = {
        nodeId: job.nodeId,
        runId: job.runId,
        inputs: job.inputs,
        params: {
          ...job.params,
          // Inject node type so executor can look up the NodeDefinition.
          __nodeType: job.nodeType,
          // Inject resolved API key so provider executor doesn't need DB access.
          ...(resolvedKey ? { __apiKey: resolvedKey } : {}),
        },
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

      // Persist node execution record with outputs to DB.
      // Non-fatal: a DB error must not interrupt the run.
      try {
        const finalState = coordinator.getRun(runId).nodeStates.get(job.nodeId);
        getDb().insert(schema.nodeExecutions).values({
          id: randomUUID(),
          runId: job.runId,
          nodeId: job.nodeId,
          status: "completed",
          attempt: finalState?.attempt ?? 1,
          cost: result.cost ?? 0,
          outputs: JSON.stringify(result.outputs),
          startedAt: finalState?.startedAt
            ? new Date(finalState.startedAt).toISOString()
            : undefined,
          completedAt: finalState?.completedAt
            ? new Date(finalState.completedAt).toISOString()
            : undefined,
          providerId: job.providerId,
          modelId: job.modelId,
          createdAt: new Date().toISOString(),
        }).run();
      } catch (dbErr) {
        console.error(`[runs/route] Failed to persist nodeExecution for ${job.nodeId}:`, dbErr);
      }
    } catch (err) {
      await coordinator.onNodeFailed(
        job.runId,
        job.nodeId,
        err instanceof Error ? err.message : String(err),
        dispatch,
      );

      // Persist failed node execution record.
      try {
        const finalState = coordinator.getRun(runId).nodeStates.get(job.nodeId);
        getDb().insert(schema.nodeExecutions).values({
          id: randomUUID(),
          runId: job.runId,
          nodeId: job.nodeId,
          status: "failed",
          attempt: finalState?.attempt ?? 1,
          error: err instanceof Error ? err.message : String(err),
          startedAt: finalState?.startedAt
            ? new Date(finalState.startedAt).toISOString()
            : undefined,
          completedAt: finalState?.completedAt
            ? new Date(finalState.completedAt).toISOString()
            : undefined,
          providerId: job.providerId,
          modelId: job.modelId,
          createdAt: new Date().toISOString(),
        }).run();
      } catch (dbErr) {
        console.error(`[runs/route] Failed to persist nodeExecution failure for ${job.nodeId}:`, dbErr);
      }
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

  // Insert the runs record immediately so nodeExecutions FK references are valid
  // while the DAG is executing.  Status starts as "running" and is updated to
  // the final terminal status in the .then() continuation below.
  const runCreatedAt = new Date().toISOString();
  db.insert(schema.runs)
    .values({
      id: runId,
      workflowId,
      status: "running",
      graphSnapshot: JSON.stringify(graph),
      graphVersion: 1,
      totalCost: 0,
      startedAt: runCreatedAt,
      createdAt: runCreatedAt,
    })
    .run();

  // Fire dispatch loop async — response returns immediately.
  // startRun() resolves only after the full DAG is processed (inline dispatch).
  const dispatch = makeDispatch(runId, outputDir);
  coordinator.startRun(runId, dispatch)
    .then(() => {
      const finalRun = coordinator.getRun(runId);
      const now = new Date().toISOString();
      const completedAt = finalRun.completedAt
        ? new Date(finalRun.completedAt).toISOString()
        : now;

      const db2 = getDb();

      // Update run record to final terminal status
      db2.update(schema.runs)
        .set({
          status: finalRun.status,
          totalCost: finalRun.totalCost,
          completedAt,
        })
        .where(eq(schema.runs.id, runId))
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
