/**
 * Renderer-facing placeholder adapter — the future renderer insertion point.
 *
 * Accepts a validated ExportJobPayload (the exact render input contract) and
 * returns a deterministic mock RenderResult. No rendering, no ffmpeg, no
 * artifacts, no output persistence.
 *
 * When a real renderer is introduced, replace the body of `renderExportJob`.
 * The signature (ExportJobPayload → RenderResult) is the stable boundary
 * contract that the runner will always call.
 *
 * Server-side only — never import from client components.
 */

import type { ExportJobPayload } from "@aistudio/shared";

// ── Result type ───────────────────────────────────────────────────────────────

export interface RenderResult {
  /** Number of scenes rendered. Mirrors payload.scenes.length. */
  sceneCount: number;
  /** Total timeline duration in ms. Mirrors payload.totalDurationMs. */
  totalDurationMs: number;
}

// ── Adapter ───────────────────────────────────────────────────────────────────

/**
 * Placeholder renderer adapter.
 *
 * Accepts the validated ExportJobPayload and returns a deterministic
 * RenderResult derived directly from the payload — no computation, no I/O.
 *
 * This is the stable contract boundary. The runner calls this function;
 * a real renderer replaces this body when rendering is introduced.
 *
 * @param payload - Validated export payload from the persisted job row.
 */
export function renderExportJob(payload: ExportJobPayload): RenderResult {
  return {
    sceneCount: payload.scenes.length,
    totalDurationMs: payload.totalDurationMs,
  };
}
