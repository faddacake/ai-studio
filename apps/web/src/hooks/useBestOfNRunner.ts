"use client";

/**
 * Orchestrates a best-of-n run:
 *   1. POST /api/workflows  →  create ephemeral workflow
 *   2. PATCH /api/workflows/:id  →  set the best-of-n graph
 *   3. POST /api/workflows/:id/runs  →  start run, get runId
 *
 * Returns workflowId + runId so the caller can subscribe via useSseSnapshot.
 */
import { useState, useCallback } from "react";
import { buildBestOfNGraph, type BestOfNConfig } from "@/lib/buildBestOfNGraph";

export type RunnerStatus = "idle" | "creating" | "starting" | "running" | "error";

export interface BestOfNRunnerState {
  status: RunnerStatus;
  workflowId: string | null;
  runId: string | null;
  error: string | null;
}

export function useBestOfNRunner() {
  const [state, setState] = useState<BestOfNRunnerState>({
    status: "idle",
    workflowId: null,
    runId: null,
    error: null,
  });

  const run = useCallback(async (config: BestOfNConfig) => {
    setState({ status: "creating", workflowId: null, runId: null, error: null });

    try {
      // Step 1 — create ephemeral workflow
      const createRes = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `generate-${Date.now()}` }),
      });
      if (!createRes.ok) throw new Error(`Failed to create workflow: ${createRes.status}`);
      const { id: workflowId } = await createRes.json() as { id: string };

      // Step 2 — set best-of-n graph
      const graph = buildBestOfNGraph(config);
      const patchRes = await fetch(`/api/workflows/${workflowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ graph }),
      });
      if (!patchRes.ok) throw new Error(`Failed to set workflow graph: ${patchRes.status}`);

      setState((prev) => ({ ...prev, status: "starting", workflowId }));

      // Step 3 — start run
      const runRes = await fetch(`/api/workflows/${workflowId}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!runRes.ok) throw new Error(`Failed to start run: ${runRes.status}`);
      const { id: runId } = await runRes.json() as { id: string };

      setState({ status: "running", workflowId, runId, error: null });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: "idle", workflowId: null, runId: null, error: null });
  }, []);

  return { ...state, run, reset };
}
