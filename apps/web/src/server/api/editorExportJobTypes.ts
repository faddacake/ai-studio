/**
 * Shared internal types for the export job execution pipeline.
 *
 * `PersistedRenderResult` is the stable boundary between the renderer adapter
 * and the rest of the system. It is the exact shape the runner normalises
 * adapter output into before carrying it forward (and eventually persisting).
 *
 * It is intentionally kept separate from `RenderResult` (the raw adapter
 * output) so that the renderer can evolve its own output contract without
 * changing what the system stores, and vice versa.
 *
 * Server-side only — never import from client components.
 */

// ── Persisted render result ───────────────────────────────────────────────────

/**
 * Minimal stable contract for the result of a completed render step.
 *
 * Contains only the fields that are guaranteed by every renderer variant —
 * both the current placeholder and any future real renderer. Future additions
 * (e.g. output file metadata) must be made here explicitly, not inferred from
 * renderer-specific shapes.
 *
 * No file fields, no storage paths, no artifact URLs.
 * Those belong to a separate output/artifact layer added later.
 */
export interface PersistedRenderResult {
  /** Number of scenes processed. Normalised from the adapter output. */
  sceneCount: number;
  /** Total timeline duration in ms. Normalised from the adapter output. */
  totalDurationMs: number;
}
