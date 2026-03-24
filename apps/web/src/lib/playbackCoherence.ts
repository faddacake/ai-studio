/**
 * playbackCoherence — pure helpers that compute corrected playback state
 * after scene-list mutations.
 *
 * All functions are side-effect-free with no React dependency.
 * EditorShell calls these in its mutation handlers to keep playIndex and
 * seekOffsetMs truthful under live edits.
 */

import type { Scene } from "./editorProjectTypes";
import { effectiveTimelineMs, totalDurationMs } from "./sceneTiming";

export interface PlaybackState {
  playIndex: number;
  seekOffsetMs: number;
}

export interface CoherenceResult extends PlaybackState {
  /** Caller should set isPlaying = false when true. */
  stop: boolean;
  /** Caller should increment playEpoch when true (new scene starts). */
  bump: boolean;
}

/**
 * Compute corrected playback state after the scene at `removedIdx` is removed.
 *
 * Rules:
 * - Timeline becomes empty → stop, reset to 0.
 * - Scene before active removed → shift playIndex down by 1, preserve seek.
 * - Active scene removed → land on same index (next scene), reset seek, bump epoch.
 * - Scene after active removed → no change.
 */
export function afterRemove(
  scenes: Scene[],
  state: PlaybackState,
  removedIdx: number,
): CoherenceResult {
  const nextLength = scenes.length - 1;
  if (nextLength <= 0) {
    return { playIndex: 0, seekOffsetMs: 0, stop: true, bump: false };
  }
  const { playIndex, seekOffsetMs } = state;
  if (removedIdx < playIndex) {
    return { playIndex: playIndex - 1, seekOffsetMs, stop: false, bump: false };
  }
  if (removedIdx === playIndex) {
    const newIdx = Math.min(playIndex, nextLength - 1);
    return { playIndex: newIdx, seekOffsetMs: 0, stop: false, bump: true };
  }
  return { playIndex, seekOffsetMs, stop: false, bump: false };
}

/**
 * Compute corrected playback state after swapping the scene at `idx` with its
 * neighbor in `dir`. Returns state unchanged if the swap is a boundary no-op.
 */
export function afterMove(
  scenes: Scene[],
  state: PlaybackState,
  idx: number,
  dir: "up" | "down",
): PlaybackState {
  const swapIdx = dir === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= scenes.length) return state;
  const { playIndex, seekOffsetMs } = state;
  if (playIndex === idx) return { playIndex: swapIdx, seekOffsetMs };
  if (playIndex === swapIdx) return { playIndex: idx, seekOffsetMs };
  return state;
}

/**
 * Compute corrected playback state after a full scene reorder.
 * Finds the previously-active scene by ID and returns its new index.
 */
export function afterReorder(
  scenes: Scene[],
  state: PlaybackState,
  newScenes: Scene[],
): PlaybackState {
  const playingId = scenes[state.playIndex]?.id;
  if (!playingId) return state;
  const newIdx = newScenes.findIndex((s) => s.id === playingId);
  if (newIdx < 0) return state;
  return { playIndex: newIdx, seekOffsetMs: state.seekOffsetMs };
}

/**
 * Resolve the single active-scene ID for a given playback mode.
 *
 * Rules:
 * - Playing  → the scene at `playIndex` (what the preview is showing).
 * - Paused   → the explicitly selected scene (`selectedId`).
 *
 * This is the single derivation that SceneList, Inspector, and PreviewPlayer
 * should all derive from so they always agree on which scene is active.
 */
export function resolveActiveId(
  scenes: Scene[],
  playIndex: number,
  selectedId: string | null,
  isPlaying: boolean,
): string | null {
  if (isPlaying) return scenes[playIndex]?.id ?? null;
  return selectedId;
}

/**
 * Resolve the playback start position when transitioning from paused → playing.
 *
 * Rules:
 * - If `selectedId` resolves to a different scene than the current `playIndex`,
 *   start at the beginning of that scene (offset 0) — the user selected a new scene.
 * - If `selectedId` resolves to the same scene as `playIndex`, preserve `seekOffsetMs`
 *   so that a seek or scrub while paused resumes from exactly that position.
 * - Empty timeline → reset to 0, 0.
 */
export function resolvePlayStart(
  scenes: Scene[],
  playIndex: number,
  seekOffsetMs: number,
  selectedId: string | null,
): PlaybackState {
  if (scenes.length === 0) return { playIndex: 0, seekOffsetMs: 0 };
  const selectedIdx = scenes.findIndex((s) => s.id === selectedId);
  const startIdx = selectedIdx >= 0 ? selectedIdx : 0;
  const startOffset = startIdx === playIndex ? seekOffsetMs : 0;
  return { playIndex: startIdx, seekOffsetMs: startOffset };
}

/**
 * Resolve playback start position when the user presses Play.
 *
 * Extends `resolvePlayStart` with one additional rule checked first:
 * if the effective timeline position is at or beyond the total duration
 * (natural playback end, or seek to exact timeline end), restart from the
 * very beginning of the timeline instead of resuming from the end.
 *
 * Rules (checked in order):
 * 1. Empty timeline → {0, 0}.
 * 2. Effective position ≥ total duration → restart from {0, 0}.
 * 3. Otherwise → delegate to `resolvePlayStart`.
 */
export function resolveReplay(
  scenes: Scene[],
  playIndex: number,
  seekOffsetMs: number,
  selectedId: string | null,
): PlaybackState {
  if (scenes.length === 0) return { playIndex: 0, seekOffsetMs: 0 };
  const total = totalDurationMs(scenes);
  if (total > 0 && effectiveTimelineMs(scenes, playIndex, seekOffsetMs) >= total) {
    return { playIndex: 0, seekOffsetMs: 0 };
  }
  return resolvePlayStart(scenes, playIndex, seekOffsetMs, selectedId);
}

/**
 * Clamp `seekOffsetMs` to the new duration when the active scene is shortened.
 * Returns state unchanged if a different scene was edited.
 */
export function afterDurationEdit(
  state: PlaybackState,
  editedIdx: number,
  newDurationSec: number,
): PlaybackState {
  if (editedIdx !== state.playIndex) return state;
  return {
    playIndex: state.playIndex,
    seekOffsetMs: Math.min(state.seekOffsetMs, newDurationSec * 1000),
  };
}
