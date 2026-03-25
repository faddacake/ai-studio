"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import type { EditorProject } from "@/lib/editorProjectTypes";
import { EditorShell } from "@/components/editor/EditorShell";

export default function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [project, setProject] = useState<EditorProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/editor-projects/${id}`)
      .then((r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json() as Promise<EditorProject>;
      })
      .then((data) => {
        if (data) setProject(data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          backgroundColor: "var(--color-bg-primary)",
        }}
      >
        <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
          Loading project…
        </p>
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          gap: 12,
          backgroundColor: "var(--color-bg-primary)",
        }}
      >
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
          Project not found
        </p>
        <Link
          href="/workflows"
          style={{ fontSize: 13, color: "var(--color-accent)", textDecoration: "none" }}
        >
          ← Back to Workflows
        </Link>
      </div>
    );
  }

  return <EditorShell project={project} />;
}
