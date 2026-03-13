"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { isArtifactRef } from "@aistudio/shared";
import type { ArtifactRef } from "@aistudio/shared";

// ── Types ──────────────────────────────────────────────────────────────────

interface RunDetail {
  id: string;
  workflowId: string;
  status: string;
  totalCost: number | null;
  budgetCap: number | null;
  budgetMode: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface NodeExecutionRow {
  id: string;
  nodeId: string;
  status: string;
  attempt: number | null;
  cost: number | null;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  providerId: string | null;
  modelId: string | null;
}

interface NodeOutputEntry {
  nodeId: string;
  outputs: Record<string, unknown>;
}

// ── Colors ─────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  completed:       "#4ade80",
  failed:          "#f87171",
  partial_failure: "#f87171",
  cancelled:       "#737373",
  budget_exceeded: "#facc15",
  running:         "#60a5fa",
  pending:         "#a3a3a3",
};

const STATUS_TEXT_COLOR: Record<string, string> = {
  completed:       "#4ade80",
  failed:          "#f87171",
  partial_failure: "#f87171",
  cancelled:       "#737373",
  budget_exceeded: "#facc15",
  running:         "#60a5fa",
  pending:         "#a3a3a3",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function durationLabel(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt || !completedAt) return "—";
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

/** Recursively extract image ArtifactRefs from a value (max 3 levels deep). */
function extractImageRefs(value: unknown, depth = 0): ArtifactRef[] {
  if (depth > 3) return [];
  if (isArtifactRef(value) && value.mimeType.startsWith("image/")) return [value];
  if (Array.isArray(value)) return value.flatMap((v) => extractImageRefs(v, depth + 1));
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.items)) {
      return (obj.items as unknown[]).flatMap((item) => {
        if (item !== null && typeof item === "object") {
          return extractImageRefs((item as Record<string, unknown>).value, depth + 1);
        }
        return [];
      });
    }
  }
  return [];
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string; runId: string }>;
}) {
  const { id: workflowId, runId } = use(params);

  const [run, setRun] = useState<RunDetail | null>(null);
  const [nodeExecutions, setNodeExecutions] = useState<NodeExecutionRow[]>([]);
  const [nodeLabels, setNodeLabels] = useState<Record<string, string>>({});
  const [outputs, setOutputs] = useState<NodeOutputEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch run detail + node executions
    const runFetch = fetch(`/api/workflows/${workflowId}/runs/${runId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json() as Promise<{
          run: RunDetail;
          nodeExecutions: NodeExecutionRow[];
          nodeLabels: Record<string, string>;
        }>;
      })
      .then((data) => {
        setRun(data.run);
        setNodeExecutions(data.nodeExecutions);
        setNodeLabels(data.nodeLabels);
      });

    // Fetch node outputs
    const outputFetch = fetch(`/api/workflows/${workflowId}/runs/${runId}/outputs`)
      .then((r) => (r.ok ? r.json() : { outputs: [] }))
      .then((data: { outputs: NodeOutputEntry[] }) => setOutputs(data.outputs ?? []))
      .catch(() => {});

    Promise.all([runFetch, outputFetch])
      .catch(() => setError("Failed to load run details"))
      .finally(() => setLoading(false));
  }, [workflowId, runId]);

  if (loading) {
    return (
      <div style={{ padding: "28px 32px" }}>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Loading…</p>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div style={{ padding: "28px 32px" }}>
        <p style={{ fontSize: 13, color: "var(--color-error)" }}>{error ?? "Run not found"}</p>
      </div>
    );
  }

  const outputMap = new Map<string, Record<string, unknown>>(
    outputs.map((o) => [o.nodeId, o.outputs]),
  );

  const statusDot = STATUS_COLOR[run.status] ?? "#737373";
  const statusColor = STATUS_TEXT_COLOR[run.status] ?? "var(--color-text-muted)";

  return (
    <div style={{ padding: "28px 32px", maxWidth: 860 }}>
      {/* ── Breadcrumb ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
        <Link href="/workflows" style={{ fontSize: 13, color: "var(--color-text-muted)", textDecoration: "none" }}>
          ← Workflows
        </Link>
        <span style={{ color: "var(--color-border)" }}>·</span>
        <Link href={`/workflows/${workflowId}`} style={{ fontSize: 13, color: "var(--color-text-muted)", textDecoration: "none" }}>
          Editor
        </Link>
        <span style={{ color: "var(--color-border)" }}>·</span>
        <Link href={`/workflows/${workflowId}/history`} style={{ fontSize: 13, color: "var(--color-text-muted)", textDecoration: "none" }}>
          Run History
        </Link>
        <span style={{ color: "var(--color-border)" }}>·</span>
        <code style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{runId.slice(0, 8)}</code>
      </div>

      {/* ── Run header ── */}
      <div style={{
        padding: "18px 20px",
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 12,
        marginBottom: 24,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{
            display: "inline-block", width: 10, height: 10,
            borderRadius: "50%", backgroundColor: statusDot, flexShrink: 0,
          }} />
          <span style={{ fontSize: 18, fontWeight: 700, color: statusColor, textTransform: "capitalize" }}>
            {statusLabel(run.status)}
          </span>
          <code style={{ fontSize: 12, color: "var(--color-text-muted)", marginLeft: 4 }}>
            {run.id}
          </code>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "8px 24px",
        }}>
          <MetaField label="Created" value={new Date(run.createdAt).toLocaleString()} />
          {run.startedAt && <MetaField label="Started" value={new Date(run.startedAt).toLocaleString()} />}
          {run.completedAt && <MetaField label="Completed" value={new Date(run.completedAt).toLocaleString()} />}
          <MetaField label="Duration" value={durationLabel(run.startedAt, run.completedAt)} />
          {run.totalCost != null && run.totalCost > 0 && (
            <MetaField label="Total cost" value={`$${run.totalCost.toFixed(4)}`} />
          )}
          {run.budgetCap != null && (
            <MetaField label="Budget" value={`$${run.budgetCap.toFixed(2)} (${run.budgetMode ?? "hard_stop"})`} />
          )}
        </div>
      </div>

      {/* ── Nodes ── */}
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 12 }}>
        Nodes
        <span style={{ fontSize: 12, fontWeight: 400, color: "var(--color-text-muted)", marginLeft: 8 }}>
          {nodeExecutions.length} executed
        </span>
      </h2>

      {nodeExecutions.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 24 }}>
          No node execution records for this run.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 28 }}>
          {nodeExecutions.map((ne) => (
            <NodeExecutionCard
              key={ne.id}
              ne={ne}
              label={nodeLabels[ne.nodeId] ?? ne.nodeId}
            />
          ))}
        </div>
      )}

      {/* ── Outputs ── */}
      {outputs.length > 0 && (
        <>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 12 }}>
            Outputs
          </h2>
          <div style={{
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            overflow: "hidden",
          }}>
            {nodeExecutions
              .filter((ne) => outputMap.has(ne.nodeId))
              .map((ne, idx) => (
                <NodeOutputBlock
                  key={ne.nodeId}
                  label={nodeLabels[ne.nodeId] ?? ne.nodeId}
                  outputs={outputMap.get(ne.nodeId)!}
                  last={idx === nodeExecutions.filter((n) => outputMap.has(n.nodeId)).length - 1}
                />
              ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{value}</div>
    </div>
  );
}

function NodeExecutionCard({ ne, label }: { ne: NodeExecutionRow; label: string }) {
  const dot = STATUS_COLOR[ne.status] ?? "#737373";
  const textColor = STATUS_TEXT_COLOR[ne.status] ?? "var(--color-text-muted)";

  return (
    <div style={{
      padding: "10px 14px",
      backgroundColor: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{
          display: "inline-block", width: 7, height: 7,
          borderRadius: "50%", backgroundColor: dot, flexShrink: 0,
        }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", flex: 1, minWidth: 100 }}>
          {label}
        </span>
        <span style={{ fontSize: 12, color: textColor, textTransform: "capitalize" }}>
          {statusLabel(ne.status)}
        </span>
        <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
          {durationLabel(ne.startedAt, ne.completedAt)}
        </span>
        {ne.cost != null && ne.cost > 0 && (
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            ${ne.cost.toFixed(4)}
          </span>
        )}
        {ne.providerId && (
          <span style={{ fontSize: 11, color: "var(--color-text-muted)", fontStyle: "italic" }}>
            {ne.providerId}{ne.modelId ? ` · ${ne.modelId}` : ""}
          </span>
        )}
      </div>

      {ne.error && (
        <pre style={{
          marginTop: 8,
          padding: "6px 8px",
          backgroundColor: "rgba(248,113,113,0.08)",
          border: "1px solid rgba(248,113,113,0.2)",
          borderRadius: 6,
          fontSize: 11,
          color: "#fca5a5",
          fontFamily: "monospace",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}>
          {ne.error}
        </pre>
      )}
    </div>
  );
}

function NodeOutputBlock({
  label,
  outputs,
  last,
}: {
  label: string;
  outputs: Record<string, unknown>;
  last: boolean;
}) {
  return (
    <div style={{
      padding: "14px 18px",
      borderBottom: last ? "none" : "1px solid var(--color-border)",
    }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 10 }}>
        {label}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Object.entries(outputs).map(([key, value]) => (
          <OutputEntry key={key} portKey={key} value={value} />
        ))}
      </div>
    </div>
  );
}

function OutputEntry({ portKey, value }: { portKey: string; value: unknown }) {
  // Direct image ArtifactRef
  if (isArtifactRef(value) && value.mimeType.startsWith("image/")) {
    return (
      <div>
        <PortLabel label={portKey} />
        <ArtifactImage ref={value} />
      </div>
    );
  }

  // Collection / selection — extract embedded image refs
  const imageRefs = extractImageRefs(value);
  if (imageRefs.length > 0) {
    return (
      <div>
        <PortLabel label={portKey} note={`${imageRefs.length} image${imageRefs.length !== 1 ? "s" : ""}`} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {imageRefs.map((ref, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <ArtifactImage key={i} ref={ref} />
          ))}
        </div>
      </div>
    );
  }

  // String
  if (typeof value === "string") {
    return (
      <div>
        <PortLabel label={portKey} />
        <pre style={{
          margin: 0,
          padding: "8px 10px",
          backgroundColor: "var(--color-surface-hover, #1a1a1a)",
          border: "1px solid var(--color-border)",
          borderRadius: 6,
          fontSize: 12,
          color: "var(--color-text-secondary)",
          fontFamily: "monospace",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          maxHeight: 120,
          overflow: "auto",
        }}>
          {value}
        </pre>
      </div>
    );
  }

  // Primitive
  if (typeof value !== "object" || value === null) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <PortLabel label={portKey} />
        <code style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{String(value)}</code>
      </div>
    );
  }

  // JSON fallback
  return (
    <div>
      <PortLabel label={portKey} />
      <pre style={{
        margin: 0,
        padding: "8px 10px",
        backgroundColor: "var(--color-surface-hover, #1a1a1a)",
        border: "1px solid var(--color-border)",
        borderRadius: 6,
        fontSize: 11,
        color: "var(--color-text-muted)",
        fontFamily: "monospace",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        maxHeight: 160,
        overflow: "auto",
      }}>
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function PortLabel({ label, note }: { label: string; note?: string }) {
  return (
    <div style={{ marginBottom: 5, display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 500 }}>{label}</span>
      {note && <span style={{ fontSize: 11, color: "var(--color-text-muted)", opacity: 0.6 }}>{note}</span>}
    </div>
  );
}

function ArtifactImage({ ref }: { ref: ArtifactRef }) {
  const [failed, setFailed] = useState(false);
  const src = `/api/artifacts?path=${encodeURIComponent(ref.path)}`;

  if (failed) {
    return (
      <div style={{
        padding: "8px 12px",
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 6,
        fontSize: 11,
        color: "var(--color-text-muted)",
      }}>
        {ref.filename}
        {ref.width && ref.height ? ` (${ref.width}×${ref.height})` : ""}
        {" — file no longer available"}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={ref.filename}
      title={ref.width && ref.height ? `${ref.filename} (${ref.width}×${ref.height})` : ref.filename}
      onError={() => setFailed(true)}
      style={{
        maxHeight: 200,
        maxWidth: "min(240px, 100%)",
        borderRadius: 6,
        border: "1px solid var(--color-border)",
        backgroundColor: "var(--color-surface)",
        objectFit: "contain",
        display: "block",
      }}
    />
  );
}
