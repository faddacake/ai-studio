/**
 * Client-side type and helper module for the export job status API response.
 *
 * Mirrors the shape returned by GET /api/export-jobs/[jobId].
 * `renderResult` is the parsed PersistedRenderResult or null — never a raw
 * JSON string; the server-side data layer owns that boundary.
 *
 * Import this module in hooks and components that read export job status.
 * Do not import server-side types here.
 */

// ── Response shape ─────────────────────────────────────────────────────────────

/** Render metadata for a completed export job. Matches PersistedRenderResult. */
export interface ExportRenderResult {
  /** Number of scenes that were rendered. */
  sceneCount: number;
  /** Total timeline duration in ms. */
  totalDurationMs: number;
}

/** Public response shape of GET /api/export-jobs/[jobId]. */
export interface ExportJobStatusResponse {
  id: string;
  projectId: string;
  status: "pending" | "running" | "completed" | "failed";
  totalDurationMs: number;
  sceneCount: number;
  /** Present and non-null only for completed jobs with persisted render metadata. */
  renderResult: ExportRenderResult | null;
  createdAt: string;
  updatedAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Format a duration in milliseconds as a short human-readable string.
 *
 * Under 60 s → "X.Xs" (one decimal place)
 * 60 s and above → "M:SS"
 *
 * @example formatDurationMs(5000)  → "5.0s"
 * @example formatDurationMs(90500) → "1:30"
 */
export function formatDurationMs(ms: number): string {
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Returns true when the job has completed and carries a render result.
 * Use to conditionally render renderResult metadata.
 */
export function hasRenderResult(
  response: ExportJobStatusResponse,
): response is ExportJobStatusResponse & { renderResult: ExportRenderResult } {
  return response.status === "completed" && response.renderResult !== null;
}
