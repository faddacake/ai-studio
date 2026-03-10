/**
 * ArtifactRef — serializable reference to a file artifact produced by a node.
 *
 * Replaces raw Buffer values in node outputs so that RunState, node output
 * records, candidate items, and export manifests are all JSON-safe across:
 * - in-process execution
 * - database persistence
 * - job queue serialization (BullMQ / remote workers)
 *
 * Design:
 * - Only "local-file" exists today. Future kinds ("s3", "url") are added by
 *   extending the `kind` discriminant — no existing code needs to change.
 * - All fields are plain JSON-serializable primitives.
 * - Image-specific fields (width, height) live here so downstream nodes
 *   never need to decode the file to know the dimensions.
 */
export interface ArtifactRef {
  /** Storage backend discriminant */
  kind: "local-file";
  /** Absolute path on the local filesystem */
  path: string;
  /** MIME type (e.g. "image/png", "image/jpeg", "image/webp") */
  mimeType: string;
  /** Filename without directory (e.g. "run-abc-node-xyz-resize.png") */
  filename: string;
  /** File size in bytes */
  sizeBytes?: number;
  /** Pixel width (image only) */
  width?: number;
  /** Pixel height (image only) */
  height?: number;
}

/**
 * Type guard: check if an unknown value is an ArtifactRef.
 *
 * Uses structural typing — checks for the required discriminant fields.
 * Safe to call on any unknown input (null, string, Buffer, etc.).
 */
export function isArtifactRef(value: unknown): value is ArtifactRef {
  if (value === null || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    obj.kind === "local-file" &&
    typeof obj.path === "string" &&
    typeof obj.mimeType === "string" &&
    typeof obj.filename === "string"
  );
}
