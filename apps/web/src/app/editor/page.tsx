"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { EditorProject } from "@/lib/editorProjectTypes";
import { EditorProjectsList } from "@/components/editor/EditorProjectsList";
import { NewEditorProjectCard } from "@/components/editor/NewEditorProjectCard";

export default function EditorDashboardPage() {
  const [projects, setProjects] = useState<EditorProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/editor-projects")
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json() as Promise<EditorProject[]>;
      })
      .then(setProjects)
      .catch(() => {/* leave list empty on error */})
      .finally(() => setLoading(false));
  }, []);

  function handleCreated(project: EditorProject) {
    setProjects((prev) => [project, ...prev]);
  }

  function handleRenamed(id: string, name: string) {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  }

  function handleDeleted(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--color-bg-primary)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 24px",
          height: 48,
          borderBottom: "1px solid var(--color-border)",
          backgroundColor: "var(--color-bg-secondary)",
          flexShrink: 0,
        }}
      >
        <Link
          href="/workflows"
          style={{
            fontSize: 13,
            color: "var(--color-text-muted)",
            textDecoration: "none",
          }}
          title="Back to Workflows"
        >
          ← Workflows
        </Link>
        <span style={{ color: "var(--color-border)" }}>/</span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--color-text-primary)",
          }}
        >
          Video Projects
        </span>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          maxWidth: 900,
          width: "100%",
          margin: "0 auto",
          padding: "32px 24px",
          boxSizing: "border-box",
        }}
      >
        {/* Create */}
        <div style={{ marginBottom: 32, maxWidth: 400 }}>
          <NewEditorProjectCard onCreated={handleCreated} />
        </div>

        {/* List */}
        <div>
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
            Projects
            {!loading && projects.length > 0 && (
              <span style={{ fontWeight: 400, marginLeft: 6 }}>
                ({projects.length})
              </span>
            )}
          </p>

          {loading ? (
            <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
              Loading…
            </p>
          ) : (
            <EditorProjectsList projects={projects} onRename={handleRenamed} onDelete={handleDeleted} />
          )}
        </div>
      </div>
    </div>
  );
}
