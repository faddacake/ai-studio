"use client";

import { useState, useCallback, useEffect } from "react";
import type { AspectRatio, EditorProject, Scene, TextOverlay } from "@/lib/editorProjectTypes";
import type { ArtifactRef } from "@aistudio/shared";
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

  // Resolve selected scene; fall back to first when selectedId no longer exists
  const selectedScene =
    scenes.find((s) => s.id === selectedId) ?? scenes[0] ?? null;

  // During playback show scenes[playIndex]; otherwise show the selected scene
  const activeScene = isPlaying ? (scenes[playIndex] ?? null) : selectedScene;

  // ── Scene mutations ────────────────────────────────────────────────────────

  const handleMoveScene = useCallback((idx: number, dir: "up" | "down") => {
    setScenes((prev) => {
      const swapIdx = dir === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx]!, next[idx]!];
      return next;
    });
    setIsDirty(true);
  }, []);

  const handleRemoveScene = useCallback(
    (idx: number) => {
      setScenes((prev) => {
        const removed = prev[idx];
        const next = prev.filter((_, i) => i !== idx);
        // Keep selection valid: move to adjacent when the selected scene is removed
        if (removed && removed.id === selectedId) {
          setSelectedId(next[Math.min(idx, next.length - 1)]?.id ?? null);
        }
        return next;
      });
      setIsDirty(true);
    },
    [selectedId],
  );

  const handleDurationChange = useCallback((idx: number, duration: number) => {
    setScenes((prev) => {
      const next = [...prev];
      const scene = next[idx];
      if (scene) next[idx] = { ...scene, duration };
      return next;
    });
    setIsDirty(true);
  }, []);

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
      setScenes((prev) =>
        prev.map((s) => (s.id === selectedScene?.id ? { ...s, duration } : s)),
      );
      setIsDirty(true);
    },
    [selectedScene?.id],
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

  const handleAspectRatioChange = useCallback((ar: AspectRatio) => {
    setAspectRatio(ar);
    setIsDirty(true);
  }, []);

  const handleReorderScenes = useCallback((newScenes: Scene[]) => {
    setScenes(newScenes);
    setIsDirty(true);
  }, []);

  // ── Playback ───────────────────────────────────────────────────────────────

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (scenes.length === 0) return;
      const foundIdx = scenes.findIndex((s) => s.id === selectedId);
      setPlayIndex(foundIdx >= 0 ? foundIdx : 0);
      setIsPlaying(true);
    }
  }, [isPlaying, scenes, selectedId]);

  // Clamp playIndex and stop playback when scenes shrink
  useEffect(() => {
    if (scenes.length === 0) {
      setIsPlaying(false);
      setPlayIndex(0);
    } else if (playIndex >= scenes.length) {
      setIsPlaying(false);
      setPlayIndex(scenes.length - 1);
    }
  }, [scenes.length, playIndex]);

  // Advance to the next scene after each scene's duration elapses
  useEffect(() => {
    if (!isPlaying || scenes.length === 0) return;
    const scene = scenes[playIndex];
    if (!scene) { setIsPlaying(false); return; }
    const timer = setTimeout(() => {
      const nextIdx = playIndex + 1;
      if (nextIdx >= scenes.length) {
        setIsPlaying(false);
      } else {
        setPlayIndex(nextIdx);
      }
    }, scene.duration * 1000);
    return () => clearTimeout(timer);
  }, [isPlaying, playIndex, scenes]);

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
          selectedId={selectedScene?.id ?? null}
          onSelect={setSelectedId}
          onMove={handleMoveScene}
          onRemove={handleRemoveScene}
          onDurationChange={handleDurationChange}
          onAddScene={() => setPickerOpen(true)}
          onReorder={handleReorderScenes}
        />
        <PreviewPlayer
          scene={activeScene}
          aspectRatio={aspectRatio}
          isPlaying={isPlaying}
          canPlay={scenes.length > 0}
          onPlayPause={handlePlayPause}
        />
        {selectedScene && (
          <SceneInspector
            scene={selectedScene}
            onDurationChange={handleSceneDurationChange}
            onTransitionChange={handleSceneTransitionChange}
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
