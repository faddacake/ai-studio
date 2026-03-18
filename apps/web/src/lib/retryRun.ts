/**
 * retryRun — determines whether a retry affordance should be shown for a
 * failed node, and what mode it operates in.
 *
 * Backend reality (as of v1): the runs API only supports full-workflow runs
 * (POST /api/workflows/:id/runs). There is no partial/subgraph retry endpoint.
 * All retry actions therefore reuse the existing runWorkflow() path — the
 * affordance lives in the failed-node context, but the execution is a
 * standard full rerun.
 *
 * Mode values:
 *   "workflow_retry" — full rerun triggered from a failed-node context (v1 behavior)
 *   "unavailable"    — no retryable context (no workflow, already running, node not failed)
 */

export type RetryMode = "workflow_retry" | "unavailable";

export interface RetryContext {
  /** Workflow is loaded and has an id. */
  hasWorkflow: boolean;
  /** A run is already in progress (isRunning). */
  isRunning: boolean;
  /** The target node's most recent execution was a failure. */
  nodeIsFailed: boolean;
}

/** Returns the retry mode for the given context. */
export function getRetryMode(ctx: RetryContext): RetryMode {
  if (!ctx.hasWorkflow || ctx.isRunning || !ctx.nodeIsFailed) return "unavailable";
  return "workflow_retry";
}

/** True when the retry action should be shown. */
export function canRetry(ctx: RetryContext): boolean {
  return getRetryMode(ctx) !== "unavailable";
}

/** Compact UI label for the given retry mode. */
export function retryLabel(_mode: RetryMode): string {
  // "Retry" is honest here — user is retrying from a failed context.
  // No qualification needed; "Retry Workflow" would over-explain v1 limits.
  return "Retry";
}
