"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface RunRecord {
  id: string;
  workflowId: string;
  status: string;
  totalCost: number | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

const STATUS_COLOR: Record<string, string> = {
  completed:       "#4ade80",
  failed:          "#f87171",
  partial_failure: "#f87171",
  cancelled:       "#737373",
  budget_exceeded: "#facc15",
  running:         "#60a5fa",
  pending:         "#a3a3a3",
};

function durationLabel(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt || !completedAt) return "—";
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

export default function HistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rerunning, setRerunning] = useState(false);
  const [rerunError, setRerunError] = useState<string | null>(null);

  async function handleRerun() {
    setRerunning(true);
    setRerunError(null);
    try {
      const res = await fetch(`/api/workflows/${id}/runs`, { method: "POST" });
      if (!res.ok) throw new Error(`${res.status}`);
      router.push(`/workflows/${id}`);
    } catch {
      setRerunError("Failed to start run — please try again");
      setRerunning(false);
    }
  }

  useEffect(() => {
    fetch(`/api/workflows/${id}/runs`)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json() as Promise<RunRecord[]>;
      })
      .then(setRuns)
      .catch(() => setError("Failed to load run history"))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 860 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <Link
          href="/workflows"
          style={{ fontSize: 13, color: "var(--color-text-muted)", textDecoration: "none" }}
        >
          ← Workflows
        </Link>
        <span style={{ color: "var(--color-border)" }}>·</span>
        <Link
          href={`/workflows/${id}`}
          style={{ fontSize: 13, color: "var(--color-text-muted)", textDecoration: "none" }}
        >
          Editor
        </Link>
        <span style={{ color: "var(--color-border)" }}>·</span>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
          Run History
        </h1>
      </div>

      {loading && (
        <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Loading…</p>
      )}

      {error && (
        <p style={{ fontSize: 13, color: "var(--color-error)" }}>{error}</p>
      )}

      {rerunError && (
        <p style={{ fontSize: 13, color: "var(--color-error)", marginBottom: 12 }}>{rerunError}</p>
      )}

      {!loading && !error && runs.length > 0 && (() => {
        const totalCost = runs.reduce((sum, r) => sum + (r.totalCost ?? 0), 0);
        const completed = runs.filter((r) => r.status === "completed").length;
        return (
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 16 }}>
            {runs.length} {runs.length === 1 ? "run" : "runs"} · {completed} completed · Total cost: ${totalCost.toFixed(4)}
          </p>
        );
      })()}

      {!loading && !error && runs.length === 0 && (
        <div style={{
          padding: "60px 20px", textAlign: "center",
          border: "1px dashed var(--color-border)", borderRadius: 12,
          backgroundColor: "var(--color-surface)",
        }}>
          <p style={{ fontSize: 15, color: "var(--color-text-secondary)", marginBottom: 4 }}>
            No runs yet.
          </p>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
            Run the workflow from the editor to see history here.
          </p>
        </div>
      )}

      {!loading && !error && runs.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {runs.map((run) => {
            const dot = STATUS_COLOR[run.status] ?? "#737373";
            return (
              <div
                key={run.id}
                style={{
                  padding: "14px 16px",
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 10,
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: "4px 24px",
                  alignItems: "center",
                }}
              >
                {/* Left: status + id */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    display: "inline-block", width: 8, height: 8,
                    borderRadius: "50%", backgroundColor: dot, flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)",
                    textTransform: "capitalize",
                  }}>
                    {run.status.replace("_", " ")}
                  </span>
                  <code style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                    {run.id.slice(0, 8)}
                  </code>
                </div>

                {/* Right: duration + cost + actions */}
                <div style={{ display: "flex", gap: 16, justifyContent: "flex-end", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                    {durationLabel(run.startedAt, run.completedAt)}
                  </span>
                  {run.totalCost != null && run.totalCost > 0 && (
                    <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                      ${run.totalCost.toFixed(4)}
                    </span>
                  )}
                  <Link
                    href={`/workflows/${id}/history/${run.id}`}
                    style={{
                      fontSize: 12, padding: "2px 6px",
                      color: "var(--color-text-secondary)",
                      textDecoration: "none",
                    }}
                  >
                    View
                  </Link>
                  <button
                    onClick={handleRerun}
                    disabled={rerunning}
                    style={{
                      fontSize: 12, background: "none", border: "none", padding: "2px 6px",
                      color: rerunning ? "var(--color-text-muted)" : "var(--color-text-secondary)",
                      cursor: rerunning ? "default" : "pointer",
                    }}
                  >
                    {rerunning ? "Starting…" : "Re-run"}
                  </button>
                </div>

                {/* Second row: date */}
                <div style={{ gridColumn: "1 / -1", marginTop: 2 }}>
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                    {new Date(run.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
