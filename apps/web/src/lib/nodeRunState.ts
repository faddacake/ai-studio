/**
 * nodeRunState — helpers that normalize per-node run status into a small,
 * stable UI state so CustomNode can persist run-state badges across run
 * restarts (i.e. when debugSnapshot is cleared at the start of a new run).
 */

export type NormalizedNodeRunState = "idle" | "running" | "success" | "failed";

/** Run statuses that are terminal (no further state transitions expected).
 *  Covers both workflow-level statuses (partial_failure, budget_exceeded)
 *  and node-level statuses (skipped). */
export const TERMINAL_RUN_STATUSES = new Set([
  "completed",
  "failed",
  "partial_failure",
  "cancelled",
  "budget_exceeded",
  "skipped",
]);

/** Visual config for each normalized state (matches STATUS_DOT palette in CustomNode). */
export const NODE_STATE_DOT: Record<
  Exclude<NormalizedNodeRunState, "idle">,
  { color: string; pulse: boolean; label: string }
> = {
  running: { color: "#60a5fa", pulse: true,  label: "Running" },
  success: { color: "#4ade80", pulse: false, label: "Completed" },
  failed:  { color: "#f87171", pulse: false, label: "Failed" },
};

/** Map a raw node status string to a normalized UI state. */
export function normalizeNodeStatus(status: string): NormalizedNodeRunState {
  if (status === "running")  return "running";
  if (status === "completed") return "success";
  if (status === "failed" || status === "cancelled" || status === "skipped") return "failed";
  return "idle";
}

/** Build a per-node state map from a snapshot's node list. Only nodes with a
 *  meaningful (non-idle) state are included so callers can skip the key check. */
export function buildNodeRunStatesMap(
  nodes: Array<{ nodeId: string; status: string }>,
): Record<string, NormalizedNodeRunState> {
  const result: Record<string, NormalizedNodeRunState> = {};
  for (const n of nodes) {
    const state = normalizeNodeStatus(n.status);
    if (state !== "idle") result[n.nodeId] = state;
  }
  return result;
}
