/**
 * EditorProject types — used by the Video Editor V1 persistence layer.
 *
 * Scenes reference artifacts by path only; the artifact system remains the
 * source of truth. No artifact data is duplicated here.
 */

export type AspectRatio = "16:9" | "9:16" | "1:1";

export interface TextOverlay {
  text: string;
  position: "top" | "center" | "bottom";
  style: "subtitle" | "title" | "minimal";
}

export interface Scene {
  id: string;
  /** "image" | "video" — determines how the scene is rendered in the editor. */
  type: "image" | "video";
  /** Absolute artifact path — served via /api/artifacts?path=<src>. */
  src: string;
  /** Duration in seconds. For video scenes this may be overridden by the clip length. */
  duration: number;
  textOverlay?: TextOverlay;
  /** Simple cut-or-fade transition into the next scene. */
  transition?: "cut" | "fade";
}

export interface AudioTrack {
  /** Absolute artifact path — served via /api/artifacts?path=<src>. */
  src: string;
  /** Volume level 0–1. */
  volume: number;
}

export interface EditorProject {
  id: string;
  name: string;
  aspectRatio: AspectRatio;
  scenes: Scene[];
  audioTrack?: AudioTrack;
  createdAt: string;
  updatedAt: string;
}

// ── Input shapes ────────────────────────────────────────────────────────────

export interface CreateEditorProjectInput {
  name: string;
  aspectRatio?: AspectRatio;
  scenes?: Scene[];
  audioTrack?: AudioTrack;
}

export interface UpdateEditorProjectInput {
  name?: string;
  aspectRatio?: AspectRatio;
  scenes?: Scene[];
  /** Passing null clears the audio track. */
  audioTrack?: AudioTrack | null;
}
