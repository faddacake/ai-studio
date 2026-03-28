/**
 * Export renderer selection layer.
 *
 * Owns renderer selection via `getExportJobRenderer()` and re-exports the
 * shared contract types so downstream consumers (runner, tests) have a
 * single stable import location.
 *
 * Active renderer: `realExportJobRenderer`. To swap, change `activeExportJobRenderer`
 * below — no other file needs to change.
 *
 * Server-side only — never import from client components.
 */

import { realExportJobRenderer } from "./editorExportJobRealRenderer";
import type { ExportJobRenderer } from "./editorExportJobTypes";

// ── Active renderer ───────────────────────────────────────────────────────────

/** Swap this constant to change the active renderer across the entire pipeline. */
const activeExportJobRenderer: ExportJobRenderer = realExportJobRenderer;

// ── Contract types (re-exported for stable import paths) ──────────────────────

export type { RenderResult, ExportJobRenderer } from "./editorExportJobTypes";

// ── Active renderer (re-exported as renderExportJob for stable import paths) ──

export { realExportJobRenderer as renderExportJob };

// ── Selection seam ────────────────────────────────────────────────────────────

/**
 * Return the active renderer adapter.
 *
 * Currently returns `realExportJobRenderer`. Swap `activeExportJobRenderer`
 * above to change the live path — `runExportJob` picks it up automatically.
 */
export function getExportJobRenderer(): ExportJobRenderer {
  return activeExportJobRenderer;
}
