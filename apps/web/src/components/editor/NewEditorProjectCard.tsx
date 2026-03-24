"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AspectRatio, EditorProject } from "@/lib/editorProjectTypes";

const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
  { value: "16:9", label: "16:9 — Landscape" },
  { value: "9:16", label: "9:16 — Portrait" },
  { value: "1:1",  label: "1:1 — Square" },
];

interface NewEditorProjectCardProps {
  onCreated: (project: EditorProject) => void;
}

export function NewEditorProjectCard({ onCreated }: NewEditorProjectCardProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/editor-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, aspectRatio }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const project = (await res.json()) as EditorProject;
      onCreated(project);
      router.push(`/editor/${project.id}`);
    } catch {
      setError("Failed to create project — please try again.");
      setCreating(false);
    }
  }

  return (
    <div
      style={{
        padding: "20px",
        borderRadius: 8,
        border: "1px dashed var(--color-border)",
        backgroundColor: "var(--color-surface)",
      }}
    >
      <p
        style={{
          margin: "0 0 14px",
          fontSize: 12,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--color-text-muted)",
        }}
      >
        New Project
      </p>

      <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Name */}
        <input
          type="text"
          placeholder="Project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={creating}
          required
          style={{
            fontSize: 13,
            padding: "7px 10px",
            background: "var(--color-bg-primary)",
            border: "1px solid var(--color-border)",
            borderRadius: 6,
            color: "var(--color-text-primary)",
            outline: "none",
            width: "100%",
            boxSizing: "border-box",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-accent)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; }}
        />

        {/* Aspect ratio */}
        <select
          value={aspectRatio}
          onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
          disabled={creating}
          style={{
            fontSize: 13,
            padding: "7px 10px",
            background: "var(--color-bg-primary)",
            border: "1px solid var(--color-border)",
            borderRadius: 6,
            color: "var(--color-text-primary)",
            outline: "none",
            width: "100%",
            boxSizing: "border-box",
            cursor: "pointer",
          }}
        >
          {ASPECT_RATIOS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {/* Error */}
        {error && (
          <p style={{ margin: 0, fontSize: 12, color: "var(--color-error, #ef4444)" }}>
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={creating || !name.trim()}
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: "7px 16px",
            borderRadius: 6,
            border: "1px solid var(--color-accent)",
            backgroundColor: "transparent",
            color: creating || !name.trim() ? "var(--color-text-muted)" : "var(--color-accent)",
            borderColor: creating || !name.trim() ? "var(--color-border)" : "var(--color-accent)",
            cursor: creating || !name.trim() ? "default" : "pointer",
            alignSelf: "flex-start",
          }}
        >
          {creating ? "Creating…" : "Create Project"}
        </button>
      </form>
    </div>
  );
}
