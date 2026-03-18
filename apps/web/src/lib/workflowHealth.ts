/**
 * workflowHealth — derives a compact workflow-level health summary from
 * existing session/store state. No new data sources; no polling.
 *
 * Intended to feed the top-bar health strip so a user can glance at the
 * editor and immediately understand the current execution/graph state.
 */

import type { NormalizedNodeRunState } from "@/lib/nodeRunState";

export interface WorkflowHealthSummary {
  /** Nodes whose last recorded state was "failed". */
  failedCount: number;
  /** Nodes whose params/graph may have changed since their last successful run. */
  staleCount: number;
  /** A live SSE-driven run is actively executing right now. */
  isLiveRunning: boolean;
  /** Auto-run debounce timer is ticking — a run will be requested soon. */
  autoRunPending: boolean;
  /** An auto-run is in-flight; one follow-up run is waiting. */
  autoRunQueued: boolean;
}

/**
 * Derive a health summary from existing store/session state.
 * All inputs are already maintained by the store — this is pure aggregation.
 */
export function deriveWorkflowHealth(params: {
  nodeRunStatesById: Record<string, NormalizedNodeRunState>;
  staleNodeIds: Record<string, true>;
  liveRunStatus: string | null | undefined;
  autoRunPending: boolean;
  autoRunQueued: boolean;
}): WorkflowHealthSummary {
  let failedCount = 0;
  for (const state of Object.values(params.nodeRunStatesById)) {
    if (state === "failed") failedCount++;
  }

  return {
    failedCount,
    staleCount: Object.keys(params.staleNodeIds).length,
    isLiveRunning: params.liveRunStatus === "running",
    autoRunPending: params.autoRunPending,
    autoRunQueued: params.autoRunQueued,
  };
}

/** True when the summary contains at least one signal worth rendering. */
export function hasHealthSignals(s: WorkflowHealthSummary): boolean {
  return (
    s.isLiveRunning ||
    s.autoRunQueued ||
    s.autoRunPending ||
    s.failedCount > 0 ||
    s.staleCount > 0
  );
}
