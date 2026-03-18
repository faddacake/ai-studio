"use client";

import { useState, useCallback } from "react";
import type { EditorProject, Scene } from "@/lib/editorProjectTypes";
import { EditorToolbar } from "./EditorToolbar";
import { SceneList } from "./SceneList";
import { PreviewPlayer } from "./PreviewPlayer";
import type { SaveState } from "./EditorToolbar";

interface EditorShellProps {
  project: EditorProject;
}

export function EditorShell({ project }: EditorShellProps) {
  const [scenes, setScenes] = useState<Scene[]>(project.scenes);
  const [projectName, setProjectName] = useState(project.name);
  const [selectedId, setSelectedId] = useState<string | null>(
    project.scenes[0]?.id ?? null,
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [isDirty, setIsDirty] = useState(false);

  // Resolve selected scene; fall back to first when selectedId no longer exists
  const selectedScene =
    scenes.find((s) => s.id === selectedId) ?? scenes[0] ?? null;

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

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setSaveState("saving");
    try {
      const res = await fetch(`/api/editor-projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName, scenes }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setSaveState("saved");
      setIsDirty(false);
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
    }
  }, [project.id, projectName, scenes]);

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
        aspectRatio={project.aspectRatio}
        saveState={saveState}
        isDirty={isDirty}
        onNameChange={(n) => {
          setProjectName(n);
          setIsDirty(true);
        }}
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
        />
        <PreviewPlayer scene={selectedScene} aspectRatio={project.aspectRatio} />
      </div>
    </div>
  );
}
