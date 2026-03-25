/**
 * Focused tests for the renderer-facing placeholder adapter.
 *
 * These tests lock the contract of `renderExportJob` in isolation — the
 * stable boundary contract the runner calls and a real renderer will replace.
 *
 * No DB, no queue, no HTTP — pure input/output tests.
 *
 * Covers:
 *   - result shape is minimal and stable: exactly { sceneCount, totalDurationMs }
 *   - sceneCount mirrors payload.scenes.length
 *   - totalDurationMs mirrors payload.totalDurationMs
 *   - result is deterministic — identical inputs produce identical outputs
 *   - adapter accepts only the validated ExportJobPayload contract (no DB row, no queue data)
 *   - multi-scene payload produces correct sceneCount
 *
 * Run with: pnpm --filter @aistudio/web test:server
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { renderExportJob } from "./editorExportJobRenderer";
import type { ExportJobPayload } from "@aistudio/shared";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function singleScenePayload(): ExportJobPayload {
  return {
    projectId: "proj-adapter",
    aspectRatio: "16:9",
    totalDurationMs: 5000,
    scenes: [
      {
        id: "s1",
        index: 0,
        type: "image",
        src: "s1.jpg",
        durationMs: 5000,
        startMs: 0,
        endMs: 5000,
        transition: "cut",
        fadeDurationMs: 0,
        fadeStartMs: 5000,
        textOverlay: null,
      },
    ],
  };
}

function twoScenePayload(): ExportJobPayload {
  return {
    projectId: "proj-adapter-2",
    aspectRatio: "9:16",
    totalDurationMs: 8000,
    scenes: [
      {
        id: "s1",
        index: 0,
        type: "image",
        src: "s1.jpg",
        durationMs: 4000,
        startMs: 0,
        endMs: 4000,
        transition: "fade",
        fadeDurationMs: 500,
        fadeStartMs: 3500,
        textOverlay: null,
      },
      {
        id: "s2",
        index: 1,
        type: "video",
        src: "s2.mp4",
        durationMs: 4000,
        startMs: 4000,
        endMs: 8000,
        transition: "cut",
        fadeDurationMs: 0,
        fadeStartMs: 8000,
        textOverlay: { text: "End", position: "bottom", style: "subtitle" },
      },
    ],
  };
}

// ── Result shape ──────────────────────────────────────────────────────────────

describe("renderExportJob — result shape", () => {
  it("result has exactly two fields: sceneCount and totalDurationMs", () => {
    const result = renderExportJob(singleScenePayload());
    assert.deepEqual(Object.keys(result).sort(), ["sceneCount", "totalDurationMs"]);
  });

  it("sceneCount mirrors payload.scenes.length (single scene)", () => {
    const payload = singleScenePayload();
    const result = renderExportJob(payload);
    assert.equal(result.sceneCount, payload.scenes.length);
  });

  it("totalDurationMs mirrors payload.totalDurationMs", () => {
    const payload = singleScenePayload();
    const result = renderExportJob(payload);
    assert.equal(result.totalDurationMs, payload.totalDurationMs);
  });

  it("sceneCount mirrors payload.scenes.length (two scenes)", () => {
    const payload = twoScenePayload();
    const result = renderExportJob(payload);
    assert.equal(result.sceneCount, 2);
  });

  it("totalDurationMs mirrors payload.totalDurationMs for multi-scene payload", () => {
    const payload = twoScenePayload();
    const result = renderExportJob(payload);
    assert.equal(result.totalDurationMs, 8000);
  });
});

// ── Determinism ───────────────────────────────────────────────────────────────

describe("renderExportJob — determinism", () => {
  it("identical inputs produce identical outputs", () => {
    const payload = singleScenePayload();
    const r1 = renderExportJob(payload);
    const r2 = renderExportJob(payload);
    assert.deepEqual(r1, r2);
  });

  it("different payloads produce different sceneCount values", () => {
    const r1 = renderExportJob(singleScenePayload());
    const r2 = renderExportJob(twoScenePayload());
    assert.notEqual(r1.sceneCount, r2.sceneCount);
  });
});

// ── Input contract ────────────────────────────────────────────────────────────

describe("renderExportJob — input contract", () => {
  it("accepts only the validated ExportJobPayload — no DB row fields", () => {
    // The adapter signature accepts ExportJobPayload, not EditorExportJob.
    // Verify that calling with a plain payload object (no id, status, etc.) works.
    const payload = singleScenePayload();
    const result = renderExportJob(payload);
    assert.ok(result);
  });

  it("accepts only the validated ExportJobPayload — no queue data", () => {
    // Queue carries only { jobId }; the adapter never sees that.
    // Verify the adapter is callable with payload only.
    const result = renderExportJob(twoScenePayload());
    assert.ok(result);
  });
});

// ── Output isolation — RenderResult vs PersistedRenderResult ──────────────────

describe("renderExportJob — output isolation from persisted contract", () => {
  it("adapter output contains no lifecycle/status fields", () => {
    // RenderResult is the raw renderer boundary — it must not carry lifecycle
    // concerns. The runner is the sole place that maps it to PersistedRenderResult.
    const result = renderExportJob(singleScenePayload()) as unknown as Record<string, unknown>;
    assert.ok(!("status" in result), "status absent from RenderResult");
    assert.ok(!("jobId" in result), "jobId absent from RenderResult");
    assert.ok(!("id" in result), "id absent from RenderResult");
  });

  it("adapter output contains no file/artifact fields", () => {
    const result = renderExportJob(singleScenePayload()) as unknown as Record<string, unknown>;
    assert.ok(!("outputPath" in result), "outputPath absent");
    assert.ok(!("artifactUrl" in result), "artifactUrl absent");
    assert.ok(!("fileSizeBytes" in result), "fileSizeBytes absent");
  });
});
