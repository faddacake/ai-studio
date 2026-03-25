"use client";

import { useState } from "react";
import Link from "next/link";
import type { EditorProject, AspectRatio, Scene } from "@/lib/editorProjectTypes";

function artifactUrl(path: string): string {
  return `/api/artifacts?path=${encodeURIComponent(path)}`;
}

const ASPECT_LABEL: Record<AspectRatio, string> = {
  "16:9": "16:9",
  "9:16": "9:16",
  "1:1":  "1:1",
};

// ── Scene thumbnail ───────────────────────────────────────────────────────────

const THUMB_STYLE: React.CSSProperties = {
  width: "100%",
  height: 96,
  borderRadius: 5,
  overflow: "hidden",
  marginBottom: 10,
  backgroundColor: "var(--color-bg-primary)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

function SceneThumbnail({ scene }: { scene: Scene | undefined }) {
  const [imgError, setImgError] = useState(false);

  if (!scene || scene.type === "video" || imgError) {
    return (
      <div style={THUMB_STYLE}>
        <span style={{ fontSize: 18, opacity: 0.18, userSelect: "none" }}>
          {scene?.type === "video" ? "▶" : "▭"}
        </span>
      </div>
    );
  }

  return (
    <div style={THUMB_STYLE}>
      <img
        src={artifactUrl(scene.src)}
        alt=""
        onError={() => setImgError(true)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

interface EditorProjectsListProps {
  projects: EditorProject[];
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export function EditorProjectsList({ projects, onRename, onDelete }: EditorProjectsListProps) {
  if (projects.length === 0) {
    return (
      <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
        No projects yet — create one above to get started.
      </p>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 12,
      }}
    >
      {projects.map((p) => (
        <ProjectCard key={p.id} project={p} onRename={onRename} onDelete={onDelete} />
      ))}
    </div>
  );
}

// ── Project card ──────────────────────────────────────────────────────────────

interface ProjectCardProps {
  project: EditorProject;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

function ProjectCard({ project, onRename, onDelete }: ProjectCardProps) {
  const updated = formatRelative(project.updatedAt);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(project.name);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [deleteBtnHovered, setDeleteBtnHovered] = useState(false);

  async function commitRename() {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === project.name) {
      setNameInput(project.name);
      setEditing(false);
      return;
    }
    setSaving(true);
    setSaveError(false);
    try {
      const res = await fetch(`/api/editor-projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      onRename(project.id, trimmed);
      setEditing(false);
    } catch {
      setSaveError(true);
      setNameInput(project.name);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function enterEdit(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setNameInput(project.name);
    setSaveError(false);
    setEditing(true);
  }

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (deleting) return;
    if (!window.confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    setDeleteError(false);
    try {
      const res = await fetch(`/api/editor-projects/${project.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`${res.status}`);
      onDelete(project.id);
    } catch {
      setDeleteError(true);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Link
      href={`/editor/${project.id}`}
      style={{ textDecoration: "none", display: "block" }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderRadius: 8,
          border: `1px solid ${(saveError || deleteError) ? "var(--color-error, #ef4444)" : "var(--color-border)"}`,
          backgroundColor: "var(--color-surface)",
          cursor: editing ? "default" : "pointer",
          transition: "border-color 120ms",
        }}
        onMouseEnter={(e) => {
          if (!editing) (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-accent)";
        }}
        onMouseLeave={(e) => {
          if (!editing) (e.currentTarget as HTMLDivElement).style.borderColor = (saveError || deleteError) ? "var(--color-error, #ef4444)" : "var(--color-border)";
        }}
      >
        {/* Thumbnail */}
        <SceneThumbnail scene={project.scenes[0]} />

        {/* Name — click to rename */}
        <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
          {editing ? (
            <input
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.currentTarget.blur(); }
                if (e.key === "Escape") { setNameInput(project.name); setEditing(false); }
              }}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              disabled={saving}
              style={{
                flex: 1,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--color-text-primary)",
                background: "var(--color-bg-primary)",
                border: "1px solid var(--color-accent)",
                borderRadius: 4,
                padding: "1px 6px",
                outline: "none",
                minWidth: 0,
              }}
            />
          ) : (
            <button
              type="button"
              onClick={enterEdit}
              title="Click to rename"
              style={{
                flex: 1,
                textAlign: "left",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--color-text-primary)",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "text",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
              }}
            >
              {project.name}
            </button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            title="Delete project"
            onMouseEnter={() => setDeleteBtnHovered(true)}
            onMouseLeave={() => setDeleteBtnHovered(false)}
            style={{
              flexShrink: 0,
              background: "none",
              border: "none",
              padding: "0 2px",
              lineHeight: 1,
              fontSize: 14,
              cursor: deleting ? "default" : "pointer",
              color: deleteBtnHovered ? "var(--color-error, #ef4444)" : "var(--color-text-muted)",
              opacity: deleting ? 0.4 : deleteBtnHovered ? 1 : 0.35,
              transition: "opacity 120ms, color 120ms",
            }}
          >
            ×
          </button>
        </div>

        {/* Meta row */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 8 }}
          onClick={(e) => { if (editing) { e.preventDefault(); e.stopPropagation(); } }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "1px 6px",
              borderRadius: 3,
              border: "1px solid var(--color-border)",
              color: "var(--color-text-muted)",
              letterSpacing: "0.03em",
              flexShrink: 0,
            }}
          >
            {ASPECT_LABEL[project.aspectRatio]}
          </span>
          <span style={{ fontSize: 11, color: "var(--color-text-muted)", flexShrink: 0 }}>
            {project.scenes.length} scene{project.scenes.length !== 1 ? "s" : ""}
          </span>
          <span
            style={{
              fontSize: 11,
              color: (saveError || deleteError) ? "var(--color-error, #ef4444)" : "var(--color-text-muted)",
              marginLeft: "auto",
              flexShrink: 0,
            }}
          >
            {deleteError ? "delete failed" : saveError ? "rename failed" : updated}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
