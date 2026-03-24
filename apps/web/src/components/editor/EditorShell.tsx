"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { AspectRatio, EditorProject, Scene, TextOverlay } from "@/lib/editorProjectTypes";
import type { ArtifactRef } from "@aistudio/shared";
import { afterRemove, afterMove, afterReorder, afterDurationEdit, resolvePlayStart, resolveReplay, resolveActiveId } from "@/lib/playbackCoherence";
import { totalDurationMs, sceneStartMs, activeSceneIndex, clampDurationS } from "@/lib/sceneTiming";
import { buildRenderPlan } from "@/lib/renderPlan";
import { EditorToolbar } from "./EditorToolbar";
import { SceneList } from "./SceneList";
import { PreviewPlayer } from "./PreviewPlayer";
import { SceneInspector } from "./SceneInspector";
import { ArtifactPickerModal } from "./ArtifactPickerModal";
import type { SaveState } from "./EditorToolbar";

interface EditorShellProps {
  project: EditorProject;
}

export function EditorShell({ project }: EditorShellProps) {
  const [scenes, setScenes] = useState<Scene[]>(project.scenes);
  const [projectName, setProjectName] = useState(project.name);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(project.aspectRatio);
  const [selectedId, setSelectedId] = useState<string | null>(
    project.scenes[0]?.id ?? null,
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [isDirty, setIsDirty] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playIndex, setPlayIndex] = useState(0);
  const [seekOffsetMs, setSeekOffsetMs] = useState(0); // intra-scene offset set by seek; 0 on normal play/advance
  const [isScrubbing, setIsScrubbing] = useState(false); // true while user is dragging the progress bar
  const [isLooping, setIsLooping] = useState(false);
  const [playEpoch, setPlayEpoch] = useState(0); // increments to signal PreviewPlayer to reset elapsed clock
  const isLoopingRef = useRef(isLooping);
  useEffect(() => { isLoopingRef.current = isLooping; }, [isLooping]);

  // Resolve selected scene; fall back to first when selectedId no longer exists
  const selectedScene =
    scenes.find((s) => s.id === selectedId) ?? scenes[0] ?? null;

  // Single active-scene authority: follows playIndex while playing, selectedId while paused
  const activeId = resolveActiveId(scenes, playIndex, selectedId, isPlaying);
  // Active scene object used by PreviewPlayer and Inspector
  const activeScene = scenes.find((s) => s.id === activeId) ?? null;
  // Canonical render plan — pre-computes all timeline positions and fade windows
  const plan = buildRenderPlan(scenes);

  // ── Scene mutations ────────────────────────────────────────────────────────

  const handleMoveScene = useCallback((idx: number, dir: "up" | "down") => {
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= scenes.length) return;
    setScenes((prev) => {
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx]!, next[idx]!];
      return next;
    });
    const { playIndex: newIdx } = afterMove(scenes, { playIndex, seekOffsetMs }, idx, dir);
    if (newIdx !== playIndex) setPlayIndex(newIdx);
    setIsDirty(true);
  }, [scenes, playIndex, seekOffsetMs]);

  const handleRemoveScene = useCallback(
    (idx: number) => {
      const result = afterRemove(scenes, { playIndex, seekOffsetMs }, idx);
      setScenes((prev) => {
        const removed = prev[idx];
        const next = prev.filter((_, i) => i !== idx);
        // Keep selection valid: move to adjacent when the selected scene is removed
        if (removed && removed.id === selectedId) {
          setSelectedId(next[Math.min(idx, next.length - 1)]?.id ?? null);
        }
        return next;
      });
      if (result.stop) setIsPlaying(false);
      setPlayIndex(result.playIndex);
      setSeekOffsetMs(result.seekOffsetMs);
      if (result.bump) setPlayEpoch((e) => e + 1);
      setIsDirty(true);
    },
    [scenes, playIndex, seekOffsetMs, selectedId],
  );

  const handleDurationChange = useCallback((idx: number, duration: number) => {
    setScenes((prev) => {
      const next = [...prev];
      const scene = next[idx];
      if (scene) next[idx] = { ...scene, duration };
      return next;
    });
    const { seekOffsetMs: newSeek } = afterDurationEdit({ playIndex, seekOffsetMs }, idx, duration);
    if (newSeek !== seekOffsetMs) setSeekOffsetMs(newSeek);
    setIsDirty(true);
  }, [playIndex, seekOffsetMs]);

  const handleOverlayChange = useCallback(
    (overlay: TextOverlay | null) => {
      setScenes((prev) =>
        prev.map((s) => {
          if (s.id !== selectedScene?.id) return s;
          const { textOverlay: _removed, ...rest } = s;
          return overlay ? { ...rest, textOverlay: overlay } : rest;
        }),
      );
      setIsDirty(true);
    },
    [selectedScene?.id],
  );

  const handleSceneDurationChange = useCallback(
    (duration: number) => {
      const editedIdx = scenes.findIndex((s) => s.id === selectedScene?.id);
      setScenes((prev) =>
        prev.map((s) => (s.id === selectedScene?.id ? { ...s, duration } : s)),
      );
      if (editedIdx >= 0) {
        const { seekOffsetMs: newSeek } = afterDurationEdit({ playIndex, seekOffsetMs }, editedIdx, duration);
        if (newSeek !== seekOffsetMs) setSeekOffsetMs(newSeek);
      }
      setIsDirty(true);
    },
    [selectedScene?.id, scenes, playIndex, seekOffsetMs],
  );

  const handleSceneTransitionChange = useCallback(
    (transition: "cut" | "fade") => {
      setScenes((prev) =>
        prev.map((s) => {
          if (s.id !== selectedScene?.id) return s;
          const { transition: _removed, ...rest } = s;
          return transition === "fade" ? { ...rest, transition } : rest;
        }),
      );
      setIsDirty(true);
    },
    [selectedScene?.id],
  );

  const handleFadeDurationChange = useCallback(
    (ms: number) => {
      setScenes((prev) =>
        prev.map((s) => (s.id === selectedScene?.id ? { ...s, fadeDurationMs: ms } : s)),
      );
      setIsDirty(true);
    },
    [selectedScene?.id],
  );

  const handleAspectRatioChange = useCallback((ar: AspectRatio) => {
    setAspectRatio(ar);
    setIsDirty(true);
  }, []);

  /**
   * Called once per video scene when the thumbnail's metadata first loads.
   * Records `naturalDuration` and, for freshly-added scenes (duration still at
   * the 10 s video default), initialises `duration` to the detected clip length.
   */
  const handleVideoDurationDetected = useCallback((idx: number, naturalSecs: number) => {
    setScenes((prev) => {
      const scene = prev[idx];
      if (!scene || scene.type !== "video" || scene.naturalDuration !== undefined) return prev;
      const natural = clampDurationS(naturalSecs);
      const next = [...prev];
      // Adopt natural duration only if the scene is still at the video default (10 s)
      const duration = scene.duration === 10 ? natural : scene.duration;
      next[idx] = { ...scene, naturalDuration: natural, duration };
      return next;
    });
    setIsDirty(true);
  }, []);

  const handleReorderScenes = useCallback((newScenes: Scene[]) => {
    const { playIndex: newIdx } = afterReorder(scenes, { playIndex, seekOffsetMs }, newScenes);
    setScenes(newScenes);
    if (newIdx !== playIndex) setPlayIndex(newIdx);
    setIsDirty(true);
  }, [scenes, playIndex, seekOffsetMs]);

  // ── Playback ───────────────────────────────────────────────────────────────

  const handleToggleLoop = useCallback(() => setIsLooping((v) => !v), []);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      // Sync selection to current play position so paused preview matches progress bar
      const playingScene = scenes[playIndex];
      if (playingScene) setSelectedId(playingScene.id);
    } else {
      if (scenes.length === 0) return;
      // Restart from beginning when at/past end; otherwise preserve seek position
      const { playIndex: startIdx, seekOffsetMs: startOffset } =
        resolveReplay(scenes, playIndex, seekOffsetMs, selectedId);
      setPlayIndex(startIdx);
      setSeekOffsetMs(startOffset);
      setPlayEpoch((e) => e + 1);
      setIsPlaying(true);
    }
  }, [isPlaying, scenes, selectedId, playIndex, seekOffsetMs]);

  const handleScrubStart = useCallback(() => setIsScrubbing(true), []);
  const handleScrubEnd = useCallback(() => setIsScrubbing(false), []);

  const handleStepScene = useCallback((dir: "prev" | "next") => {
    if (scenes.length === 0) return;
    const targetIdx = dir === "next"
      ? Math.min(playIndex + 1, scenes.length - 1)
      : Math.max(playIndex - 1, 0);
    if (targetIdx === playIndex) return; // already at boundary
    setPlayIndex(targetIdx);
    setSeekOffsetMs(0);
    if (!isPlaying) setSelectedId(scenes[targetIdx]!.id);
    setPlayEpoch((e) => e + 1);
  }, [scenes, playIndex, isPlaying]);

  const handleSeek = useCallback((targetMs: number) => {
    if (scenes.length === 0) return;
    const clamped = Math.max(0, Math.min(targetMs, totalDurationMs(scenes)));
    const sceneIdx = activeSceneIndex(scenes, clamped);
    const offsetMs = clamped - sceneStartMs(scenes, sceneIdx);
    setPlayIndex(sceneIdx);
    setSeekOffsetMs(offsetMs);
    if (!isPlaying) setSelectedId(scenes[sceneIdx]!.id);
    setPlayEpoch((e) => e + 1);
  }, [scenes, isPlaying]);

  // Safety-net: clamp playIndex if it is ever left out of bounds.
  // Handlers resolve most cases proactively; this effect catches anything missed.
  useEffect(() => {
    if (scenes.length === 0) {
      setIsPlaying(false);
      setPlayIndex(0);
      setSeekOffsetMs(0);
    } else if (playIndex >= scenes.length) {
      setPlayIndex(scenes.length - 1);
      setSeekOffsetMs(0);
      setPlayEpoch((e) => e + 1);
    }
  }, [scenes.length, playIndex]);

  // Advance to the next scene after each scene's duration elapses (offset-aware; paused during scrub)
  useEffect(() => {
    if (!isPlaying || isScrubbing || scenes.length === 0) return;
    const scene = scenes[playIndex];
    if (!scene) { setIsPlaying(false); return; }
    const delay = Math.max(0, scene.duration * 1000 - seekOffsetMs);
    const timer = setTimeout(() => {
      const nextIdx = playIndex + 1;
      if (nextIdx >= scenes.length) {
        if (isLoopingRef.current) {
          setPlayIndex(0);
          setSeekOffsetMs(0);
          setPlayEpoch((e) => e + 1);
        } else {
          setIsPlaying(false);
          // Park seek at the exact end of the last scene so effectiveTimelineMs = total
          setSeekOffsetMs((scenes[playIndex]?.duration ?? 0) * 1000);
          setPlayEpoch((e) => e + 1);
          // Sync selection so paused preview matches the scene where playback ended
          setSelectedId(scenes[playIndex]?.id ?? null);
        }
      } else {
        setPlayIndex(nextIdx);
        setSeekOffsetMs(0);
        setPlayEpoch((e) => e + 1);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [isPlaying, isScrubbing, playIndex, scenes, seekOffsetMs]);

  // ── Add scene from artifact picker ────────────────────────────────────────

  const handleAddScene = useCallback((ref: ArtifactRef) => {
    const isVideo = ref.mimeType.startsWith("video/");
    const newScene: Scene = {
      id: crypto.randomUUID(),
      type: isVideo ? "video" : "image",
      src: ref.path,
      duration: isVideo ? 10 : 5,
    };
    setScenes((prev) => [...prev, newScene]);
    setSelectedId(newScene.id);
    setIsDirty(true);
    setPickerOpen(false);
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setSaveState("saving");
    try {
      const res = await fetch(`/api/editor-projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName, aspectRatio, scenes }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setSaveState("saved");
      setIsDirty(false);
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
    }
  }, [project.id, projectName, aspectRatio, scenes]);

  // ── Playback keyboard shortcuts (Space / ArrowLeft / ArrowRight) ──────────

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (e.key === " ") {
        e.preventDefault();
        handlePlayPause();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleStepScene("next");
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleStepScene("prev");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlePlayPause, handleStepScene]);

  // ── Cmd/Ctrl+S shortcut ───────────────────────────────────────────────────

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key !== "s") return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      e.preventDefault();
      if (saveState === "saving") return;
      handleSave();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saveState, handleSave]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "var(--color-bg-primary)",
      }}
    >
      <EditorToolbar
        projectId={project.id}
        name={projectName}
        aspectRatio={aspectRatio}
        saveState={saveState}
        isDirty={isDirty}
        onNameChange={(n) => {
          setProjectName(n);
          setIsDirty(true);
        }}
        onAspectRatioChange={handleAspectRatioChange}
        onSave={handleSave}
      />

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <SceneList
          scenes={scenes}
          activeId={activeId}
          onSelect={setSelectedId}
          onMove={handleMoveScene}
          onRemove={handleRemoveScene}
          onDurationChange={handleDurationChange}
          onAddScene={() => setPickerOpen(true)}
          onReorder={handleReorderScenes}
          onVideoDurationDetected={handleVideoDurationDetected}
        />
        <PreviewPlayer
          scene={activeScene}
          scenes={scenes}
          plan={plan}
          playIndex={playIndex}
          playEpoch={playEpoch}
          seekOffsetMs={seekOffsetMs}
          isScrubbing={isScrubbing}
          aspectRatio={aspectRatio}
          isPlaying={isPlaying}
          canPlay={scenes.length > 0}
          onPlayPause={handlePlayPause}
          onSeek={handleSeek}
          onScrubStart={handleScrubStart}
          onScrubEnd={handleScrubEnd}
          isLooping={isLooping}
          onToggleLoop={handleToggleLoop}
        />
        {selectedScene && (
          <SceneInspector
            scene={selectedScene}
            onDurationChange={handleSceneDurationChange}
            onTransitionChange={handleSceneTransitionChange}
            onFadeDurationChange={handleFadeDurationChange}
            onOverlayChange={handleOverlayChange}
          />
        )}
      </div>

      {pickerOpen && (
        <ArtifactPickerModal
          onPick={handleAddScene}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
