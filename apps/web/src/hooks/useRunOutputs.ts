"use client";

/**
 * useRunOutputs — fetches completed node outputs for a run once it finishes.
 *
 * When isComplete becomes true it hits GET /api/workflows/:id/runs/:runId/outputs
 * and returns the first CandidateSelection found in any node's outputs.
 * Used by the Generate page to render generated images after a best-of-n run.
 */
import { useState, useEffect } from "react";
import type { CandidateItem } from "@aistudio/shared";

export interface RunOutputsState {
  items: CandidateItem[] | null;
  loading: boolean;
  error: string | null;
}

export function useRunOutputs(
  workflowId: string | null,
  runId: string | null,
  isComplete: boolean,
): RunOutputsState {
  const [state, setState] = useState<RunOutputsState>({
    items: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    // Reset when run changes
    setState({ items: null, loading: false, error: null });
  }, [workflowId, runId]);

  useEffect(() => {
    if (!workflowId || !runId || !isComplete) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    fetch(`/api/workflows/${workflowId}/runs/${runId}/outputs`)
      .then((r) => {
        if (!r.ok) throw new Error(`Outputs fetch failed: ${r.status}`);
        return r.json() as Promise<{
          outputs: Array<{ nodeId: string; outputs: Record<string, unknown> }>;
        }>;
      })
      .then((data) => {
        // Find the first node that has a selection_out with items (best-of-n output)
        for (const node of data.outputs ?? []) {
          const sel = node.outputs.selection_out as
            | { items?: CandidateItem[] }
            | undefined;
          if (sel?.items && sel.items.length > 0) {
            setState({ items: sel.items, loading: false, error: null });
            return;
          }
        }
        setState({ items: [], loading: false, error: null });
      })
      .catch((err: unknown) => {
        setState({
          items: null,
          loading: false,
          error: err instanceof Error ? err.message : String(err),
        });
      });
  }, [workflowId, runId, isComplete]);

  return state;
}
