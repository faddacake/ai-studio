"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Workflow {
  id: string;
  name: string;
  description: string;
  lastRunStatus: string | null;
  lastRunAt: string | null;
  updatedAt: string;
  createdAt: string;
}

export default function WorkflowsPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchWorkflows = useCallback(async () => {
    const res = await fetch("/api/workflows");
    if (res.ok) {
      setWorkflows(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  async function handleDuplicate(id: string) {
    setDuplicatingId(id);
    try {
      const res = await fetch(`/api/workflows/${id}/duplicate`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        router.push(`/workflows/${data.id}`);
      }
    } finally {
      setDuplicatingId(null);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/workflows/${id}`, { method: "DELETE" });
    if (res.ok) {
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
      setDeletingId(null);
    } else {
      setDeleteError("Failed to delete — please try again");
      setDeletingId(null);
    }
  }

  async function handleCreate() {
    if (!newName.trim() || creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, description: newDesc }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/workflows/${data.id}`);
      } else {
        const data = await res.json().catch(() => ({}));
        setCreateError(data.message || "Failed to create workflow — please try again");
        setCreating(false);
      }
    } catch {
      setCreateError("Connection error — please try again");
      setCreating(false);
    }
  }

  const q = search.trim().toLowerCase();
  const filtered = q
    ? workflows.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          (w.description ?? "").toLowerCase().includes(q),
      )
    : workflows;

  return (
    <div style={{ padding: 32 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: workflows.length > 0 ? 16 : 32,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text-primary)" }}>
          Workflows
        </h1>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: "10px 20px",
            backgroundColor: "var(--color-accent)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + New Workflow
        </button>
      </div>

      {workflows.length > 0 && (
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search workflows…"
          style={{
            width: "100%",
            maxWidth: 360,
            padding: "8px 12px",
            marginBottom: 20,
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            color: "var(--color-text-primary)",
            fontSize: 14,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      )}

      {deleteError && (
        <div style={{
          marginBottom: 16, padding: "10px 14px", borderRadius: 8,
          backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
          fontSize: 13, color: "var(--color-error)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          {deleteError}
          <button
            onClick={() => setDeleteError(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-error)", fontSize: 16, lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      )}

      {loading ? (
        <p style={{ color: "var(--color-text-muted)" }}>Loading...</p>
      ) : workflows.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 20px",
            border: "1px dashed var(--color-border)",
            borderRadius: 12,
            backgroundColor: "var(--color-surface)",
          }}
        >
          <p style={{ fontSize: 16, color: "var(--color-text-secondary)", marginBottom: 4 }}>
            No workflows yet.
          </p>
          <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
            Create your first one to get started.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
          No workflows match &ldquo;{search.trim()}&rdquo;.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((w) => (
            <Link
              key={w.id}
              href={`/workflows/${w.id}`}
              style={{
                display: "block",
                padding: 16,
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 10,
                textDecoration: "none",
                transition: "background-color 100ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-surface)";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600, fontSize: 15, color: "var(--color-text-primary)" }}>
                  {w.name}
                </span>
                {w.lastRunStatus && (
                  <StatusBadge status={w.lastRunStatus} />
                )}
              </div>
              {w.description && (
                <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
                  {w.description}
                </p>
              )}
              <LastRunIndicator status={w.lastRunStatus} lastRunAt={w.lastRunAt} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: 0 }}>
                  Updated {new Date(w.updatedAt).toLocaleDateString()}
                </p>
                {deletingId === w.id ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Delete?</span>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(w.id); }}
                      style={{ fontSize: 12, fontWeight: 600, color: "var(--color-error)", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}
                    >
                      Yes
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingId(null); }}
                      style={{ fontSize: 12, color: "var(--color-text-muted)", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}
                    >
                      No
                    </button>
                  </span>
                ) : (
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <a
                      href={`/workflows/${w.id}/history`}
                      onClick={(e) => e.stopPropagation()}
                      style={{ fontSize: 12, color: "var(--color-text-muted)", textDecoration: "none", padding: "2px 6px" }}
                    >
                      History
                    </a>
                    <span style={{ fontSize: 12, color: "var(--color-border)" }}>·</span>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDuplicate(w.id); }}
                      disabled={duplicatingId === w.id}
                      style={{ fontSize: 12, color: "var(--color-text-muted)", background: "none", border: "none", cursor: duplicatingId === w.id ? "default" : "pointer", padding: "2px 6px" }}
                    >
                      {duplicatingId === w.id ? "Copying…" : "Duplicate"}
                    </button>
                    <span style={{ fontSize: 12, color: "var(--color-border)" }}>·</span>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingId(w.id); }}
                      style={{ fontSize: 12, color: "var(--color-text-muted)", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}
                    >
                      Delete
                    </button>
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Workflow Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
          onClick={() => { setShowModal(false); setCreateError(null); }}
        >
          <div
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              padding: 24,
              width: 420,
              maxWidth: "90vw",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 20 }}>
              New Workflow
            </h2>
            {createError && (
              <div style={{
                marginBottom: 16, padding: "10px 14px", borderRadius: 8,
                backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                fontSize: 13, color: "var(--color-error)",
              }}>
                {createError}
              </div>
            )}
            <label style={{ display: "block", marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>
                Name
              </span>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="My workflow"
                autoFocus
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  color: "var(--color-text-primary)",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newName.trim()) handleCreate();
                }}
              />
            </label>
            <label style={{ display: "block", marginBottom: 20 }}>
              <span style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>
                Description (optional)
              </span>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="What does this workflow do?"
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  color: "var(--color-text-primary)",
                  fontSize: 14,
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => { setShowModal(false); setCreateError(null); }}
                style={{
                  padding: "9px 18px",
                  backgroundColor: "transparent",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  color: "var(--color-text-secondary)",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                style={{
                  padding: "9px 18px",
                  backgroundColor: newName.trim() ? "var(--color-accent)" : "var(--color-surface)",
                  border: "none",
                  borderRadius: 8,
                  color: newName.trim() ? "#fff" : "var(--color-text-muted)",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: newName.trim() ? "pointer" : "default",
                }}
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Last-run dot + label ───────────────────────────────────────────────────

const RUN_DOT_COLOR: Record<string, string> = {
  completed:       "#4ade80",
  running:         "#60a5fa",
  failed:          "#f87171",
  partial_failure: "#f87171",
  cancelled:       "#737373",
  budget_exceeded: "#facc15",
  pending:         "#facc15",
};

function formatTimeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function LastRunIndicator({
  status,
  lastRunAt,
}: {
  status: string | null;
  lastRunAt: string | null;
}) {
  const dotColor = status ? (RUN_DOT_COLOR[status] ?? "#737373") : undefined;
  const label    = status ? status.replace("_", " ") : null;
  const time     = lastRunAt ? formatTimeAgo(lastRunAt) : null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
      {dotColor ? (
        <>
          <span style={{
            display: "inline-block", width: 7, height: 7,
            borderRadius: "50%", backgroundColor: dotColor, flexShrink: 0,
          }} />
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)", textTransform: "capitalize" }}>
            {label}
          </span>
          {time && (
            <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>· {time}</span>
          )}
        </>
      ) : (
        <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>No runs yet</span>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    completed: "var(--color-success)",
    running: "var(--color-accent)",
    failed: "var(--color-error)",
    pending: "var(--color-warning)",
  };
  const color = colorMap[status] || "var(--color-text-muted)";
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 8px",
        borderRadius: 6,
        backgroundColor: color + "20",
        color,
        textTransform: "capitalize",
      }}
    >
      {status.replace("_", " ")}
    </span>
  );
}
