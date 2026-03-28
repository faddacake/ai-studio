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
import path from "node:path";
import fs from "node:fs";

import { renderExportJob, getExportJobRenderer } from "./editorExportJobRenderer";
import { realExportJobRenderer, buildRealRendererResult, normalizeRealRendererInput, buildRealRenderPlan, buildRealRenderArtifactDescriptor, buildRealRenderArtifactPath, buildRealRenderArtifactIdentity, assembleRealRendererResult, writeRealRenderArtifactFile, REAL_RENDER_ARTIFACT_FILENAME } from "./editorExportJobRealRenderer";
import { ARTIFACTS_DIR } from "../../lib/artifactStorage";
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
  it("result has exactly three fields: artifacts, sceneCount, and totalDurationMs", () => {
    const result = renderExportJob(singleScenePayload());
    assert.deepEqual(Object.keys(result).sort(), ["artifacts", "sceneCount", "totalDurationMs"]);
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

  it("adapter output contains no flat file/artifact fields", () => {
    const result = renderExportJob(singleScenePayload()) as unknown as Record<string, unknown>;
    assert.ok(!("outputPath" in result), "outputPath absent");
    assert.ok(!("artifactUrl" in result), "artifactUrl absent");
    assert.ok(!("fileSizeBytes" in result), "fileSizeBytes absent");
  });
});

// ── Artifact output contract ──────────────────────────────────────────────────

describe("renderExportJob — artifacts", () => {
  it("artifacts is a non-empty array", () => {
    const { artifacts } = renderExportJob(singleScenePayload());
    assert.ok(Array.isArray(artifacts), "artifacts is an array");
    assert.ok(artifacts.length > 0, "artifacts is non-empty");
  });

  it("each artifact has a non-empty path string", () => {
    const { artifacts } = renderExportJob(singleScenePayload());
    for (const a of artifacts) {
      assert.strictEqual(typeof a.path, "string");
      assert.ok(a.path.length > 0, "path is non-empty");
    }
  });

  it("each artifact has a non-empty mimeType string", () => {
    const { artifacts } = renderExportJob(singleScenePayload());
    for (const a of artifacts) {
      assert.strictEqual(typeof a.mimeType, "string");
      assert.ok(a.mimeType.length > 0, "mimeType is non-empty");
    }
  });

  it("artifacts are deterministic — identical payloads produce identical paths", () => {
    const p = singleScenePayload();
    const r1 = renderExportJob(p);
    const r2 = renderExportJob(p);
    assert.deepEqual(r1.artifacts, r2.artifacts);
  });

  it("different projectIds produce different artifact paths", () => {
    const p1 = singleScenePayload(); // projectId = "proj-adapter"
    const p2 = twoScenePayload();    // projectId = "proj-adapter-2"
    const r1 = renderExportJob(p1);
    const r2 = renderExportJob(p2);
    assert.notEqual(r1.artifacts[0].path, r2.artifacts[0].path);
  });
});

describe("renderExportJob — concrete output values", () => {
  it("sceneCount concrete value for single-scene payload", () => {
    assert.equal(renderExportJob(singleScenePayload()).sceneCount, 1);
  });

  it("totalDurationMs concrete value for single-scene payload", () => {
    assert.equal(renderExportJob(singleScenePayload()).totalDurationMs, 5000);
  });

  it("artifacts concrete value — single descriptor with storage-backed path", () => {
    const payload = singleScenePayload(); // projectId = "proj-adapter"
    const { artifacts } = renderExportJob(payload);
    assert.equal(artifacts.length, 1);
    assert.ok(path.isAbsolute(artifacts[0].path), "artifact path is absolute");
    assert.ok(artifacts[0].path.startsWith(ARTIFACTS_DIR), "artifact path is under ARTIFACTS_DIR");
    assert.ok(artifacts[0].path.includes("proj-adapter"), "artifact path contains projectId");
    assert.ok(artifacts[0].path.endsWith(REAL_RENDER_ARTIFACT_FILENAME), "artifact path ends with filename");
    assert.equal(artifacts[0].mimeType, "video/mp4");
    assert.equal(artifacts[0].label, "Exported Video");
  });

  it("placeholder file is written to disk", () => {
    const payload = singleScenePayload();
    const { artifacts } = renderExportJob(payload);
    assert.ok(fs.existsSync(artifacts[0].path), "placeholder file exists on disk");
  });
});

// ── Public contract — concrete output shape ───────────────────────────────────

describe("renderExportJob — public contract", () => {
  // Concrete known payload — no helpers used to build the expected values.
  const CONTRACT_PROJECT_ID = "proj-contract";
  const CONTRACT_PAYLOAD: ExportJobPayload = {
    projectId: CONTRACT_PROJECT_ID,
    aspectRatio: "16:9",
    totalDurationMs: 6000,
    scenes: [
      {
        id: "s1",
        index: 0,
        type: "image",
        src: "s1.jpg",
        durationMs: 3000,
        startMs: 0,
        endMs: 3000,
        transition: "cut",
        fadeDurationMs: 0,
        fadeStartMs: 3000,
        textOverlay: null,
      },
      {
        id: "s2",
        index: 1,
        type: "video",
        src: "s2.mp4",
        durationMs: 3000,
        startMs: 3000,
        endMs: 6000,
        transition: "cut",
        fadeDurationMs: 0,
        fadeStartMs: 6000,
        textOverlay: null,
      },
    ],
  };

  it("sceneCount is 2 for a two-scene payload", () => {
    assert.equal(renderExportJob(CONTRACT_PAYLOAD).sceneCount, 2);
  });

  it("totalDurationMs is 6000 for a 6 s payload", () => {
    assert.equal(renderExportJob(CONTRACT_PAYLOAD).totalDurationMs, 6000);
  });

  it("artifacts length is 1", () => {
    assert.equal(renderExportJob(CONTRACT_PAYLOAD).artifacts.length, 1);
  });

  it("artifact path is absolute, under ARTIFACTS_DIR, and contains the projectId", () => {
    const artifactPath = renderExportJob(CONTRACT_PAYLOAD).artifacts[0].path;
    assert.ok(path.isAbsolute(artifactPath), "artifact path is absolute");
    assert.ok(artifactPath.startsWith(ARTIFACTS_DIR), "artifact path is under ARTIFACTS_DIR");
    assert.ok(artifactPath.includes(CONTRACT_PROJECT_ID), "artifact path contains projectId");
  });

  it("artifact mimeType is video/mp4", () => {
    assert.equal(renderExportJob(CONTRACT_PAYLOAD).artifacts[0].mimeType, "video/mp4");
  });

  it("artifact label is 'Exported Video'", () => {
    assert.equal(renderExportJob(CONTRACT_PAYLOAD).artifacts[0].label, "Exported Video");
  });
});

// ── Real renderer module — stub contract ──────────────────────────────────────

describe("realExportJobRenderer — satisfies ExportJobRenderer contract", () => {
  it("output equals renderExportJob output for the same payload", () => {
    assert.deepEqual(realExportJobRenderer(singleScenePayload()), renderExportJob(singleScenePayload()));
  });

  it("sceneCount matches payload scene count", () => {
    assert.equal(realExportJobRenderer(twoScenePayload()).sceneCount, 2);
  });

  it("totalDurationMs matches payload", () => {
    assert.equal(realExportJobRenderer(singleScenePayload()).totalDurationMs, 5000);
  });

  it("artifacts length is 1", () => {
    assert.equal(realExportJobRenderer(singleScenePayload()).artifacts.length, 1);
  });
});

// ── normalizeRealRendererInput ────────────────────────────────────────────────

describe("normalizeRealRendererInput — derived values", () => {
  it("projectId equals payload.projectId", () => {
    const payload = singleScenePayload();
    assert.equal(normalizeRealRendererInput(payload).projectId, payload.projectId);
  });

  it("sceneCount equals payload.scenes.length (single scene)", () => {
    const payload = singleScenePayload();
    assert.equal(normalizeRealRendererInput(payload).sceneCount, 1);
  });

  it("sceneCount equals payload.scenes.length (two scenes)", () => {
    const payload = twoScenePayload();
    assert.equal(normalizeRealRendererInput(payload).sceneCount, 2);
  });

  it("totalDurationMs equals payload.totalDurationMs", () => {
    const payload = singleScenePayload();
    assert.equal(normalizeRealRendererInput(payload).totalDurationMs, payload.totalDurationMs);
  });

  it("is deterministic — identical inputs produce identical outputs", () => {
    const payload = twoScenePayload();
    assert.deepEqual(normalizeRealRendererInput(payload), normalizeRealRendererInput(payload));
  });

  it("result has exactly three fields: projectId, sceneCount, totalDurationMs", () => {
    const result = normalizeRealRendererInput(singleScenePayload());
    assert.deepEqual(Object.keys(result).sort(), ["projectId", "sceneCount", "totalDurationMs"]);
  });
});

// ── buildRealRenderPlan ───────────────────────────────────────────────────────

describe("buildRealRenderPlan — derived values", () => {
  it("projectId equals input.projectId", () => {
    const input = normalizeRealRendererInput(singleScenePayload());
    assert.equal(buildRealRenderPlan(input).projectId, input.projectId);
  });

  it("sceneCount equals input.sceneCount (single scene)", () => {
    const input = normalizeRealRendererInput(singleScenePayload());
    assert.equal(buildRealRenderPlan(input).sceneCount, 1);
  });

  it("sceneCount equals input.sceneCount (two scenes)", () => {
    const input = normalizeRealRendererInput(twoScenePayload());
    assert.equal(buildRealRenderPlan(input).sceneCount, 2);
  });

  it("totalDurationMs equals input.totalDurationMs", () => {
    const input = normalizeRealRendererInput(singleScenePayload());
    assert.equal(buildRealRenderPlan(input).totalDurationMs, input.totalDurationMs);
  });

  it("artifactCount is exactly 1", () => {
    const input = normalizeRealRendererInput(singleScenePayload());
    assert.equal(buildRealRenderPlan(input).artifactCount, 1);
  });

  it("artifactCount is exactly 1 for multi-scene input", () => {
    const input = normalizeRealRendererInput(twoScenePayload());
    assert.equal(buildRealRenderPlan(input).artifactCount, 1);
  });

  it("result has exactly four fields: artifactCount, projectId, sceneCount, totalDurationMs", () => {
    const input = normalizeRealRendererInput(singleScenePayload());
    assert.deepEqual(Object.keys(buildRealRenderPlan(input)).sort(), [
      "artifactCount",
      "projectId",
      "sceneCount",
      "totalDurationMs",
    ]);
  });

  it("is deterministic — identical inputs produce identical outputs", () => {
    const input = normalizeRealRendererInput(twoScenePayload());
    assert.deepEqual(buildRealRenderPlan(input), buildRealRenderPlan(input));
  });
});

// ── REAL_RENDER_ARTIFACT_FILENAME ─────────────────────────────────────────────

describe("REAL_RENDER_ARTIFACT_FILENAME — constant value", () => {
  it("is the expected stub filename string", () => {
    assert.equal(REAL_RENDER_ARTIFACT_FILENAME, "export.mp4");
  });
});

// ── buildRealRenderArtifactPath ───────────────────────────────────────────────

describe("buildRealRenderArtifactPath — output contract", () => {
  it("is an absolute filesystem path", () => {
    assert.ok(path.isAbsolute(buildRealRenderArtifactPath("proj-abc")), "path is absolute");
  });

  it("starts with ARTIFACTS_DIR", () => {
    assert.ok(buildRealRenderArtifactPath("proj-x").startsWith(ARTIFACTS_DIR));
  });

  it("ends with REAL_RENDER_ARTIFACT_FILENAME", () => {
    assert.ok(buildRealRenderArtifactPath("proj-x").endsWith(REAL_RENDER_ARTIFACT_FILENAME));
  });

  it("contains the projectId in the output path", () => {
    const id = "proj-unique-777";
    assert.ok(buildRealRenderArtifactPath(id).includes(id));
  });

  it("is deterministic — repeated calls return the same string", () => {
    const id = "proj-det";
    assert.equal(buildRealRenderArtifactPath(id), buildRealRenderArtifactPath(id));
  });

  it("different projectIds produce different paths", () => {
    assert.notEqual(buildRealRenderArtifactPath("proj-a"), buildRealRenderArtifactPath("proj-b"));
  });

  it("returns a string", () => {
    assert.strictEqual(typeof buildRealRenderArtifactPath("any-id"), "string");
  });
});

// ── buildRealRenderArtifactIdentity ──────────────────────────────────────────

describe("buildRealRenderArtifactIdentity — stub artifact type and label", () => {
  it("mimeType is video/mp4", () => {
    assert.equal(buildRealRenderArtifactIdentity().mimeType, "video/mp4");
  });

  it("label is 'Exported Video'", () => {
    assert.equal(buildRealRenderArtifactIdentity().label, "Exported Video");
  });

  it("result has exactly two fields: label, mimeType", () => {
    assert.deepEqual(Object.keys(buildRealRenderArtifactIdentity()).sort(), ["label", "mimeType"]);
  });

  it("is deterministic — repeated calls produce identical objects", () => {
    assert.deepEqual(buildRealRenderArtifactIdentity(), buildRealRenderArtifactIdentity());
  });

  it("descriptor mimeType equals identity mimeType", () => {
    const identity = buildRealRenderArtifactIdentity();
    assert.equal(buildRealRenderArtifactDescriptor("proj-x").mimeType, identity.mimeType);
  });

  it("descriptor label equals identity label", () => {
    const identity = buildRealRenderArtifactIdentity();
    assert.equal(buildRealRenderArtifactDescriptor("proj-x").label, identity.label);
  });
});

// ── buildRealRenderArtifactDescriptor ─────────────────────────────────────────

describe("buildRealRenderArtifactDescriptor — output contract", () => {
  it("path is absolute, under ARTIFACTS_DIR, and contains the projectId", () => {
    const artifactPath = buildRealRenderArtifactDescriptor("proj-abc").path;
    assert.ok(path.isAbsolute(artifactPath), "path is absolute");
    assert.ok(artifactPath.startsWith(ARTIFACTS_DIR), "path is under ARTIFACTS_DIR");
    assert.ok(artifactPath.includes("proj-abc"), "path contains projectId");
  });

  it("path contains the projectId", () => {
    const id = "proj-unique-999";
    assert.ok(buildRealRenderArtifactDescriptor(id).path.includes(id));
  });

  it("mimeType is video/mp4", () => {
    assert.equal(buildRealRenderArtifactDescriptor("proj-x").mimeType, "video/mp4");
  });

  it("label is 'Exported Video'", () => {
    assert.equal(buildRealRenderArtifactDescriptor("proj-x").label, "Exported Video");
  });

  it("is deterministic — repeated calls produce identical objects", () => {
    const id = "proj-det";
    assert.deepEqual(buildRealRenderArtifactDescriptor(id), buildRealRenderArtifactDescriptor(id));
  });

  it("different projectIds produce different paths", () => {
    assert.notEqual(
      buildRealRenderArtifactDescriptor("proj-a").path,
      buildRealRenderArtifactDescriptor("proj-b").path,
    );
  });
});

// ── assembleRealRendererResult ────────────────────────────────────────────────

describe("assembleRealRendererResult — stable result assembly", () => {
  it("sceneCount equals plan.sceneCount", () => {
    const input = normalizeRealRendererInput(singleScenePayload());
    const plan = buildRealRenderPlan(input);
    const artifacts = [buildRealRenderArtifactDescriptor(plan.projectId)];
    assert.equal(assembleRealRendererResult(plan, artifacts).sceneCount, plan.sceneCount);
  });

  it("totalDurationMs equals plan.totalDurationMs", () => {
    const input = normalizeRealRendererInput(singleScenePayload());
    const plan = buildRealRenderPlan(input);
    const artifacts = [buildRealRenderArtifactDescriptor(plan.projectId)];
    assert.equal(assembleRealRendererResult(plan, artifacts).totalDurationMs, plan.totalDurationMs);
  });

  it("artifacts equals the passed-in artifacts array", () => {
    const input = normalizeRealRendererInput(singleScenePayload());
    const plan = buildRealRenderPlan(input);
    const artifacts = [buildRealRenderArtifactDescriptor(plan.projectId)];
    assert.deepEqual(assembleRealRendererResult(plan, artifacts).artifacts, artifacts);
  });

  it("result has exactly three fields: artifacts, sceneCount, totalDurationMs", () => {
    const input = normalizeRealRendererInput(singleScenePayload());
    const plan = buildRealRenderPlan(input);
    const artifacts = [buildRealRenderArtifactDescriptor(plan.projectId)];
    const result = assembleRealRendererResult(plan, artifacts);
    assert.deepEqual(Object.keys(result).sort(), ["artifacts", "sceneCount", "totalDurationMs"]);
  });

  it("is deterministic — identical plan and artifacts produce identical results", () => {
    const input = normalizeRealRendererInput(twoScenePayload());
    const plan = buildRealRenderPlan(input);
    const artifacts = [buildRealRenderArtifactDescriptor(plan.projectId)];
    assert.deepEqual(
      assembleRealRendererResult(plan, artifacts),
      assembleRealRendererResult(plan, artifacts),
    );
  });

  it("output equals buildRealRendererResult output for the same payload", () => {
    const payload = singleScenePayload();
    const input = normalizeRealRendererInput(payload);
    const plan = buildRealRenderPlan(input);
    const artifacts = [buildRealRenderArtifactDescriptor(plan.projectId)];
    assert.deepEqual(assembleRealRendererResult(plan, artifacts), buildRealRendererResult(payload));
  });
});

// ── writeRealRenderArtifactFile ───────────────────────────────────────────────

describe("writeRealRenderArtifactFile — storage I/O seam", () => {
  it("creates the file at the given path", () => {
    const artifactPath = buildRealRenderArtifactPath("proj-write-test");
    writeRealRenderArtifactFile(artifactPath);
    assert.ok(fs.existsSync(artifactPath), "file exists after write");
  });

  it("creates parent directories as needed", () => {
    const artifactPath = buildRealRenderArtifactPath("proj-mkdir-test");
    writeRealRenderArtifactFile(artifactPath);
    assert.ok(fs.existsSync(path.dirname(artifactPath)), "parent directory exists");
  });

  it("is idempotent — calling twice does not throw", () => {
    const artifactPath = buildRealRenderArtifactPath("proj-idempotent-test");
    writeRealRenderArtifactFile(artifactPath);
    assert.doesNotThrow(() => writeRealRenderArtifactFile(artifactPath));
  });
});

describe("buildRealRendererResult — direct construction", () => {
  it("sceneCount equals payload.scenes.length (single scene)", () => {
    assert.equal(buildRealRendererResult(singleScenePayload()).sceneCount, 1);
  });

  it("sceneCount equals payload.scenes.length (two scenes)", () => {
    assert.equal(buildRealRendererResult(twoScenePayload()).sceneCount, 2);
  });

  it("totalDurationMs equals payload.totalDurationMs", () => {
    const payload = singleScenePayload();
    assert.equal(buildRealRendererResult(payload).totalDurationMs, payload.totalDurationMs);
  });

  it("artifacts length equals 1", () => {
    assert.equal(buildRealRendererResult(singleScenePayload()).artifacts.length, 1);
  });

  it("artifact path is absolute, under ARTIFACTS_DIR, and contains the projectId", () => {
    const payload = singleScenePayload(); // projectId = "proj-adapter"
    const artifactPath = buildRealRendererResult(payload).artifacts[0].path;
    assert.ok(path.isAbsolute(artifactPath), "artifact path is absolute");
    assert.ok(artifactPath.startsWith(ARTIFACTS_DIR), "artifact path is under ARTIFACTS_DIR");
    assert.ok(artifactPath.includes("proj-adapter"), "artifact path contains projectId");
  });

  it("placeholder file is written to disk", () => {
    const payload = singleScenePayload();
    const { artifacts } = buildRealRendererResult(payload);
    assert.ok(fs.existsSync(artifacts[0].path), "placeholder file exists on disk");
  });

  it("artifact mimeType is video/mp4", () => {
    assert.equal(buildRealRendererResult(singleScenePayload()).artifacts[0].mimeType, "video/mp4");
  });

  it("artifact label is 'Exported Video'", () => {
    assert.equal(buildRealRendererResult(singleScenePayload()).artifacts[0].label, "Exported Video");
  });

  it("output equals realExportJobRenderer output for the same payload", () => {
    const payload = singleScenePayload();
    assert.deepEqual(buildRealRendererResult(payload), realExportJobRenderer(payload));
  });

  it("is deterministic — identical payloads produce identical results", () => {
    const p = twoScenePayload();
    assert.deepEqual(buildRealRendererResult(p), buildRealRendererResult(p));
  });

  it("artifact equals buildRealRenderArtifactDescriptor(payload.projectId)", () => {
    const payload = singleScenePayload();
    assert.deepEqual(
      buildRealRendererResult(payload).artifacts[0],
      buildRealRenderArtifactDescriptor(payload.projectId),
    );
  });
});

// ── Selection layer — active renderer routing ─────────────────────────────────

describe("getExportJobRenderer — routes to real renderer", () => {
  it("output equals realExportJobRenderer output for a single-scene payload", () => {
    const payload = singleScenePayload();
    assert.deepEqual(getExportJobRenderer()(payload), realExportJobRenderer(payload));
  });

  it("output equals realExportJobRenderer output for a two-scene payload", () => {
    const payload = twoScenePayload();
    assert.deepEqual(getExportJobRenderer()(payload), realExportJobRenderer(payload));
  });

  it("sceneCount matches payload scene count", () => {
    assert.equal(getExportJobRenderer()(twoScenePayload()).sceneCount, 2);
  });

  it("totalDurationMs matches payload", () => {
    assert.equal(getExportJobRenderer()(singleScenePayload()).totalDurationMs, 5000);
  });
});

describe("renderExportJob — routes through real renderer path", () => {
  it("output equals realExportJobRenderer output for the same payload", () => {
    const payload = singleScenePayload();
    assert.deepEqual(renderExportJob(payload), realExportJobRenderer(payload));
  });

  it("output equals getExportJobRenderer() output for the same payload", () => {
    const payload = twoScenePayload();
    assert.deepEqual(renderExportJob(payload), getExportJobRenderer()(payload));
  });
});
