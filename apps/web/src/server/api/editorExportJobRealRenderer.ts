/**
 * Real renderer module.
 *
 * Owns the full real-renderer pipeline from raw ExportJobPayload to outward
 * RenderResult. Writes a placeholder artifact file under ARTIFACTS_DIR so the
 * returned path is a real, servable absolute filesystem path. Actual media
 * rendering replaces the artifact seams below when introduced.
 *
 * Server-side only — never import from client components.
 *
 * ## Internal layering (top → bottom)
 *
 * | Export                              | Role                                                  |
 * |-------------------------------------|-------------------------------------------------------|
 * | `REAL_RENDER_ARTIFACT_FILENAME`     | Artifact filename constant                            |
 * | `buildRealRenderArtifactPath`       | Composes ARTIFACTS_DIR + projectId + filename         |
 * | `buildRealRenderArtifactIdentity`   | mimeType + label constants                            |
 * | `buildRealRenderArtifactDescriptor` | Canonical artifact composition boundary               |
 * | `assembleRealRendererResult`        | Assembles stable RenderResult from plan + artifacts   |
 * | `normalizeRealRendererInput`        | Derives renderer-owned input from raw payload         |
 * | `buildRealRenderPlan`               | Derives renderer-owned plan from normalized input     |
 * | `writeRealRenderArtifactFile`       | Writes placeholder file to ARTIFACTS_DIR (I/O seam)   |
 * | `buildRealRendererResult`           | Orchestrates the full pipeline (main entry point)     |
 * | `realExportJobRenderer`             | Public ExportJobRenderer adapter (thin wrapper)       |
 */

import path from "node:path";
import fs from "node:fs";
import type { ExportJobPayload } from "@aistudio/shared";
import type { ExportArtifactRef, ExportJobRenderer, RenderResult } from "./editorExportJobTypes";
import { ARTIFACTS_DIR } from "../../lib/artifactStorage";

// ── Normalized input ──────────────────────────────────────────────────────────

/**
 * Renderer-owned normalized input derived from ExportJobPayload.
 *
 * Captures only the fields the real renderer cares about. Future renderer
 * logic should consume this rather than raw ExportJobPayload directly.
 */
type RealRendererInput = {
  projectId: string;
  sceneCount: number;
  totalDurationMs: number;
};

/**
 * Derive a normalized RealRendererInput from a raw ExportJobPayload.
 *
 * Pure function — no I/O, no side effects, deterministic.
 */
export function normalizeRealRendererInput(payload: ExportJobPayload): RealRendererInput {
  return {
    projectId: payload.projectId,
    sceneCount: payload.scenes.length,
    totalDurationMs: payload.totalDurationMs,
  };
}

// ── Render plan ───────────────────────────────────────────────────────────────

/**
 * Renderer-owned render plan derived from normalized input.
 *
 * Captures what the renderer intends to produce before any I/O occurs.
 * Future renderer logic will drive output construction from this value.
 */
type RealRenderPlan = {
  projectId: string;
  sceneCount: number;
  totalDurationMs: number;
  artifactCount: number;
};

/**
 * Derive a RealRenderPlan from normalized renderer input.
 *
 * Pure function — no I/O, no side effects, deterministic.
 */
export function buildRealRenderPlan(input: RealRendererInput): RealRenderPlan {
  return {
    projectId: input.projectId,
    sceneCount: input.sceneCount,
    totalDurationMs: input.totalDurationMs,
    artifactCount: 1,
  };
}

// ── Artifact descriptor ───────────────────────────────────────────────────────

/**
 * Artifact filename for the real renderer export output.
 */
export const REAL_RENDER_ARTIFACT_FILENAME = "export.mp4";

/**
 * Build the real renderer's outward artifact path for a given project.
 *
 * Returns an absolute filesystem path under ARTIFACTS_DIR. This path is
 * accepted by the /api/artifacts route and survives server restarts.
 * Pure function — no I/O, no randomness, no timestamps.
 */
export function buildRealRenderArtifactPath(projectId: string): string {
  return path.join(ARTIFACTS_DIR, projectId, REAL_RENDER_ARTIFACT_FILENAME);
}

/**
 * Stub artifact identity for the real renderer: the type and label that
 * describe the artifact independently of any specific project path.
 *
 * Single swap point for mimeType and label when real output types are
 * introduced. Pure function — no I/O, no randomness, no timestamps.
 */
export function buildRealRenderArtifactIdentity(): { mimeType: string; label: string } {
  return {
    mimeType: "video/mp4",
    label: "Exported Video",
  };
}

/**
 * Canonical artifact composition boundary for the real renderer.
 *
 * The single point in this module responsible for producing a complete
 * `ExportArtifactRef`. Composes path from `buildRealRenderArtifactPath` and
 * type/label from `buildRealRenderArtifactIdentity`. All artifact production
 * in the real renderer flows through here — never directly through the
 * lower-level helpers.
 *
 * Pure function — no I/O, no randomness, no timestamps.
 */
export function buildRealRenderArtifactDescriptor(projectId: string): ExportArtifactRef {
  const { mimeType, label } = buildRealRenderArtifactIdentity();
  return {
    path: buildRealRenderArtifactPath(projectId),
    mimeType,
    label,
  };
}

// ── Result assembly ───────────────────────────────────────────────────────────

/**
 * Assemble the stable outward RenderResult from a render plan and prepared
 * artifact descriptors.
 *
 * Single explicit boundary responsible for final result shape within the real
 * renderer module. Pure function — no I/O, no side effects, deterministic.
 */
export function assembleRealRendererResult(
  plan: RealRenderPlan,
  artifacts: ExportArtifactRef[],
): RenderResult {
  return {
    sceneCount: plan.sceneCount,
    totalDurationMs: plan.totalDurationMs,
    artifacts,
  };
}

// ── Storage I/O seam ──────────────────────────────────────────────────────────

/**
 * Write a placeholder artifact file at the given absolute path.
 *
 * Creates parent directories as needed. Writes an empty file as a placeholder
 * for the export artifact — not real video output. This is the sole I/O
 * boundary in the real renderer module; future real rendering replaces the
 * file content written here.
 */
export function writeRealRenderArtifactFile(artifactPath: string): void {
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(artifactPath, Buffer.alloc(0));
}

// ── Internal helper seam ──────────────────────────────────────────────────────

/**
 * Orchestrates the full real renderer pipeline and returns the outward RenderResult.
 *
 * Layers in order: normalize input → build plan → build artifact descriptor →
 * write placeholder artifact file → assemble result.
 * Future real-rendering logic replaces the writeRealRenderArtifactFile call here.
 */
export function buildRealRendererResult(payload: ExportJobPayload): RenderResult {
  const input = normalizeRealRendererInput(payload);
  const plan = buildRealRenderPlan(input);
  const descriptor = buildRealRenderArtifactDescriptor(plan.projectId);
  writeRealRenderArtifactFile(descriptor.path);
  return assembleRealRendererResult(plan, [descriptor]);
}

// ── Renderer adapter ──────────────────────────────────────────────────────────

/**
 * Real renderer adapter stub.
 *
 * Delegates to `buildRealRendererResult` — the internal construction seam.
 * Replace `buildRealRendererResult` when real rendering is introduced;
 * this function and the selection layer stay unchanged.
 */
export const realExportJobRenderer: ExportJobRenderer = (payload) =>
  buildRealRendererResult(payload);
