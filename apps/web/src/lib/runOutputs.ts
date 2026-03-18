import { extractImageRefs, extractVideoRefs } from "./artifactRefs";

// ── Types ────────────────────────────────────────────────────────────────────

export type NodeOutputType = "image" | "video" | "text" | "json" | "unknown";

export interface NodeLatestOutput {
  nodeId: string;
  runId: string;
  workflowId: string;
  outputType: NodeOutputType;
  /** Resolved /api/artifacts URL for image outputs */
  imageUrl?: string;
  imageFilename?: string;
  /** Resolved /api/artifacts URL for video outputs */
  videoUrl?: string;
  videoFilename?: string;
  /** Raw artifact path (without encoding), used for provenance metadata on inserted nodes */
  artifactPath?: string;
  /** Truncated text snippet for display (max ~220 chars) */
  textSnippet?: string;
  /** Full original text, used when pre-filling an inserted PromptTemplate node */
  textFull?: string;
  /** Brief summary string for json/unknown outputs */
  summary?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const TEXT_SNIPPET_MAX = 220;

/**
 * Normalize a single node's raw output map into a `NodeLatestOutput`.
 * Prefers the most user-visible representation: image > text > json/unknown.
 */
export function extractNodeOutput(
  nodeId: string,
  rawOutputs: Record<string, unknown>,
  runId: string,
  workflowId: string,
): NodeLatestOutput {
  // 1. Image ArtifactRef (direct or nested inside candidate collections)
  const imageRefs = Object.values(rawOutputs).flatMap((v) => extractImageRefs(v));
  if (imageRefs.length > 0) {
    const ref = imageRefs[0]!;
    return {
      nodeId,
      runId,
      workflowId,
      outputType: "image",
      imageUrl: `/api/artifacts?path=${encodeURIComponent(ref.path)}`,
      imageFilename: ref.filename,
      artifactPath: ref.path,
    };
  }

  // 2. Video ArtifactRef
  const videoRefs = Object.values(rawOutputs).flatMap((v) => extractVideoRefs(v));
  if (videoRefs.length > 0) {
    const ref = videoRefs[0]!;
    return {
      nodeId,
      runId,
      workflowId,
      outputType: "video",
      videoUrl: `/api/artifacts?path=${encodeURIComponent(ref.path)}`,
      videoFilename: ref.filename,
      artifactPath: ref.path,
    };
  }

  // 3. String output
  const textValues = Object.values(rawOutputs).filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );
  if (textValues.length > 0) {
    const text = textValues[0]!;
    return {
      nodeId,
      runId,
      workflowId,
      outputType: "text",
      textSnippet:
        text.length > TEXT_SNIPPET_MAX
          ? text.slice(0, TEXT_SNIPPET_MAX) + "…"
          : text,
      textFull: text,
    };
  }

  // 4. JSON / unknown fallback
  const keys = Object.keys(rawOutputs);
  return {
    nodeId,
    runId,
    workflowId,
    outputType: keys.length > 0 ? "json" : "unknown",
    summary:
      keys.length > 0
        ? `${keys.length} output${keys.length !== 1 ? "s" : ""}: ${keys.join(", ")}`
        : "No output data",
  };
}

/**
 * Build a `nodeId → NodeLatestOutput` map from a full run's outputs array.
 * Nodes with no non-empty outputs are omitted.
 */
export function buildOutputsMap(
  allOutputs: Array<{ nodeId: string; outputs: Record<string, unknown> }>,
  runId: string,
  workflowId: string,
): Record<string, NodeLatestOutput> {
  const map: Record<string, NodeLatestOutput> = {};
  for (const { nodeId, outputs } of allOutputs) {
    if (Object.keys(outputs).length > 0) {
      map[nodeId] = extractNodeOutput(nodeId, outputs, runId, workflowId);
    }
  }
  return map;
}
