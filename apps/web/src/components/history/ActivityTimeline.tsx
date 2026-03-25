"use client";

import { useState } from "react";
import Link from "next/link";
import { ArtifactPreviewPanel } from "@/components/prompt/ArtifactPreviewPanel";
import type { ArtifactPreviewable } from "@/components/prompt/ArtifactPreviewPanel";

// ── Types ──────────────────────────────────────────────────────────────────

export type ActivityEventType = "run" | "checkpoint" | "artifact_reuse" | "fragment_created";

export interface ActivityEvent {
  type: ActivityEventType;
  timestamp: Date;
  label: string;
  metadata?: Record<string, unknown>;
}

// ── Prop shapes (minimal — callers pass slices of their own state) ──────────

interface RunRecord {
  id: string;
  status: string;
  createdAt: string;
  graphStats?: {
    provenanceLinks?: Array<{ sourceRunId: string; artifactPath: string }>;
  };
}

interface RevisionRecord {
  id: string;
  label: string | null;
  createdAt: string;
}

interface FragmentRecord {
  id: string;
  name: string;
  createdAt: string;
  nodeCount?: number;
}

export interface ActivityTimelineProps {
  workflowId: string;
  runs: RunRecord[];
  revisions: RevisionRecord[];
  fragments: FragmentRecord[];
  /** Called when the user clicks a checkpoint row; receives the revision id. */
  onCheckpointClick?: (revisionId: string) => void;
}

// ── Build normalised event list ────────────────────────────────────────────

function buildEvents(
  runs: RunRecord[],
  revisions: RevisionRecord[],
  fragments: FragmentRecord[],
): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  for (const run of runs) {
    events.push({
      type: "run",
      timestamp: new Date(run.createdAt),
      label: `Run ${run.id.slice(0, 8)} ${run.status.replace(/_/g, " ")}`,
      metadata: { runId: run.id, status: run.status },
    });

    for (const link of run.graphStats?.provenanceLinks ?? []) {
      events.push({
        type: "artifact_reuse",
        timestamp: new Date(run.createdAt),
        label: `Artifact reused from Run ${link.sourceRunId.slice(0, 8)}`,
        metadata: {
          runId: run.id,
          sourceRunId: link.sourceRunId,
          artifactPath: link.artifactPath,
        },
      });
    }
  }

  for (const rev of revisions) {
    events.push({
      type: "checkpoint",
      timestamp: new Date(rev.createdAt),
      label: `Checkpoint created: "${rev.label ?? "Checkpoint"}"`,
      metadata: { revisionId: rev.id, label: rev.label },
    });
  }

  for (const frag of fragments) {
    events.push({
      type: "fragment_created",
      timestamp: new Date(frag.createdAt),
      label: `Fragment saved: "${frag.name}"`,
      metadata: { fragmentId: frag.id, name: frag.name, nodeCount: frag.nodeCount },
    });
  }

  return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

// ── Relative timestamp ─────────────────────────────────────────────────────

function relativeTime(date: Date): string {
  const ms = Date.now() - date.getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

// ── Icons ──────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  completed: "#4ade80",
  failed: "#f87171",
  partial_failure: "#f87171",
  cancelled: "#737373",
  budget_exceeded: "#facc15",
  running: "#60a5fa",
  pending: "#a3a3a3",
};

function RunIcon({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? "#a3a3a3";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 20,
        height: 20,
        borderRadius: "50%",
        backgroundColor: `${color}22`,
        border: `1.5px solid ${color}`,
        flexShrink: 0,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: color }} />
    </span>
  );
}

function CheckpointIcon() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 20,
        height: 20,
        borderRadius: 4,
        backgroundColor: "rgba(251,191,36,0.12)",
        border: "1.5px solid rgba(251,191,36,0.45)",
        flexShrink: 0,
        fontSize: 10,
        color: "#fbbf24",
        fontWeight: 700,
      }}
    >
      ✦
    </span>
  );
}

function ArtifactIcon() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 20,
        height: 20,
        borderRadius: 4,
        backgroundColor: "rgba(139,92,246,0.12)",
        border: "1.5px solid rgba(139,92,246,0.4)",
        flexShrink: 0,
        color: "#c4b5fd",
      }}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
        <path d="M6.5 4.5a2 2 0 00-2.83 0L1.5 6.67a2 2 0 002.83 2.83l.55-.55" />
        <path d="M3.5 5.5a2 2 0 002.83 0l2.17-2.17a2 2 0 00-2.83-2.83l-.55.55" />
      </svg>
    </span>
  );
}

function FragmentIcon() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 20,
        height: 20,
        borderRadius: 4,
        backgroundColor: "rgba(34,211,238,0.1)",
        border: "1.5px solid rgba(34,211,238,0.35)",
        flexShrink: 0,
        color: "#67e8f9",
      }}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="1" y="4" width="4" height="5" rx="1" />
        <rect x="5" y="1" width="4" height="5" rx="1" />
      </svg>
    </span>
  );
}

function EventIcon({ event }: { event: ActivityEvent }) {
  if (event.type === "run") return <RunIcon status={(event.metadata?.status as string) ?? "pending"} />;
  if (event.type === "checkpoint") return <CheckpointIcon />;
  if (event.type === "artifact_reuse") return <ArtifactIcon />;
  return <FragmentIcon />;
}

// ── Main component ─────────────────────────────────────────────────────────

export function ActivityTimeline({
  workflowId,
  runs,
  revisions,
  fragments,
  onCheckpointClick,
}: ActivityTimelineProps) {
  const [previewArtifact, setPreviewArtifact] = useState<ArtifactPreviewable | null>(null);

  const events = buildEvents(runs, revisions, fragments);

  if (events.length === 0) {
    return (
      <div
        style={{
          padding: "32px 20px",
          textAlign: "center",
          border: "1px dashed var(--color-border)",
          borderRadius: 12,
          backgroundColor: "var(--color-surface)",
          fontSize: 13,
          color: "var(--color-text-muted)",
        }}
      >
        No activity yet.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
      {/* Timeline list */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {events.map((event, idx) => (
          <div
            key={`${event.type}-${String(event.metadata?.runId ?? event.metadata?.revisionId ?? event.metadata?.fragmentId ?? "")}-${idx}`}
            style={{ display: "flex", alignItems: "flex-start", gap: 10 }}
          >
            {/* Vertical track + icon */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flexShrink: 0,
                width: 20,
              }}
            >
              {idx > 0 && (
                <div style={{ width: 2, height: 8, backgroundColor: "var(--color-border)" }} />
              )}
              <EventIcon event={event} />
              {idx < events.length - 1 && (
                <div style={{ width: 2, flex: 1, minHeight: 8, backgroundColor: "var(--color-border)" }} />
              )}
            </div>

            {/* Row content */}
            <div
              style={{
                flex: 1,
                paddingTop: idx > 0 ? 3 : 0,
                paddingBottom: idx < events.length - 1 ? 3 : 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {event.type === "run" && (
                  <Link
                    href={`/workflows/${workflowId}/history/${event.metadata?.runId as string}`}
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--color-text-primary)",
                      textDecoration: "none",
                    }}
                  >
                    {event.label}
                  </Link>
                )}

                {event.type === "checkpoint" && (
                  <button
                    onClick={() =>
                      onCheckpointClick?.(event.metadata?.revisionId as string)
                    }
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "var(--color-text-primary)",
                      cursor: onCheckpointClick ? "pointer" : "default",
                      textAlign: "left",
                    }}
                  >
                    {event.label}
                  </button>
                )}

                {event.type === "artifact_reuse" && (() => {
                  const path = event.metadata?.artifactPath as string;
                  const sourceRunId = event.metadata?.sourceRunId as string;
                  const artifactFilename = path.split("/").pop() ?? "artifact";
                  const artifact: ArtifactPreviewable = {
                    modelId: path,
                    modelName: `Artifact from Run ${sourceRunId.slice(0, 8)}`,
                    outputUrl: `/api/artifacts?path=${encodeURIComponent(path)}`,
                    filename: artifactFilename,
                    mimeType: artifactFilename.endsWith(".mp4") ? "video/mp4" : undefined,
                  };
                  return (
                    <button
                      onClick={() =>
                        setPreviewArtifact(
                          previewArtifact?.modelId === path ? null : artifact,
                        )
                      }
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        background: "none",
                        border: "none",
                        padding: 0,
                        color:
                          previewArtifact?.modelId === path
                            ? "#c4b5fd"
                            : "var(--color-text-primary)",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      {event.label}
                    </button>
                  );
                })()}

                {event.type === "fragment_created" && (
                  <Link
                    href={`/workflows/${workflowId}/library`}
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--color-text-primary)",
                      textDecoration: "none",
                    }}
                  >
                    {event.label}
                  </Link>
                )}

                <span
                  title={event.timestamp.toLocaleString()}
                  style={{ fontSize: 11, color: "var(--color-text-muted)" }}
                >
                  {relativeTime(event.timestamp)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Artifact preview panel — shown when an artifact row is active */}
      {previewArtifact && (
        <div style={{ width: 260, flexShrink: 0 }}>
          <ArtifactPreviewPanel result={previewArtifact} label="Reused artifact" highlighted={false} />
        </div>
      )}
    </div>
  );
}
