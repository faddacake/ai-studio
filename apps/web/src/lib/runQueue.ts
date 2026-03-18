/**
 * runQueue — lightweight client-side auto-run queue.
 *
 * Collapses rapid parameter edits into a single execution and ensures that
 * edits made while a run is already in-flight result in exactly one follow-up
 * run after the current one completes.
 *
 * State model (all session-only, stored in workflowStore):
 *   autoRunPending  — debounce timer is ticking; a run will be requested soon
 *   autoRunQueued   — a run is in-flight; one follow-up run is waiting
 *   autoRunInFlight — an auto-triggered run is currently executing
 *
 * Depth cap: at most one run queued at any time (no multi-depth queue).
 */

import { useWorkflowStore } from "@/stores/workflowStore";

/**
 * Called when the auto-run debounce timer fires.
 * Starts a run immediately if none is in-flight, or queues a single follow-up.
 */
export function requestAutoRun(): void {
  const s = useWorkflowStore.getState();
  if (!s.autoRunEnabled || !s.meta) {
    s.setAutoRunPending(false);
    return;
  }

  s.setAutoRunPending(false);

  if (s.isRunning) {
    // A run is active — queue exactly one follow-up run.
    s.setAutoRunQueued(true);
  } else {
    // No run active — start immediately.
    s.setAutoRunInFlight(true);
    void s.runWorkflow();
  }
}

/**
 * Called when any run completes (isRunning transitions false → true → false).
 * Fires a queued auto-run if one is waiting, then clears the queued flag.
 */
export function onAutoRunComplete(): void {
  const s = useWorkflowStore.getState();
  s.setAutoRunInFlight(false);

  if (!s.autoRunQueued) return;
  s.setAutoRunQueued(false);

  if (s.autoRunEnabled && s.meta) {
    s.setAutoRunInFlight(true);
    void s.runWorkflow();
  }
}
