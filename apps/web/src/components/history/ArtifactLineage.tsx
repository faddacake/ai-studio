"use client";

import { useState } from "react";
import { ArtifactPreviewPanel } from "@/components/prompt/ArtifactPreviewPanel";
import type { ArtifactPreviewable } from "@/components/prompt/ArtifactPreviewPanel";

// ── Types ──

export interface LineageRunRecord {
  id: string;
  status: string;
  createdAt: string;
  provenanceLinks: Array<{ sourceRunId: string; artifactPath: string }>;
}

interface LineageNode {
  kind: "run";
  run: LineageRunRecord;
}

interface LineageEdge {
  kind: "artifact";
  sourceRunId: string;
  consumerRunId: string;
  artifactPath: string;
}

type LineageItem = LineageNode | LineageEdge;

// ── Build lineage sequence ──
// Walk runs oldest-first. For each run with provenance links, insert
// an artifact edge between the source run and this consumer run.

function buildLineage(runs: LineageRunRecord[]): LineageItem[] {
  const oldest = [...runs].reverse(); // runs arrive newest-first; flip for timeline order
  const items: LineageItem[] = [];
  const emittedRunIds = new Set<string>();

  for (const run of oldest) {
    // Emit any artifact edges whose source run precedes this consumer run.
    for (const link of run.provenanceLinks) {
      items.push({
        kind: "artifact",
        sourceRunId: link.sourceRunId,
        consumerRunId: run.id,
        artifactPath: link.artifactPath,
      });
    }
    if (!emittedRunIds.has(run.id)) {
      items.push({ kind: "run", run });
      emittedRunIds.add(run.id);
    }
  }

  return items;
}

// ── Component ──

export interface ArtifactLineageProps {
  runs: LineageRunRecord[];
}

const STATUS_DOT: Record<string, string> = {
  completed: "#4ade80",
  failed: "#f87171",
  partial_failure: "#f87171",
  cancelled: "#737373",
  budget_exceeded: "#facc15",
  running: "#60a5fa",
  pending: "#a3a3a3",
};

export function ArtifactLineage({ runs }: ArtifactLineageProps) {
  const [previewArtifact, setPreviewArtifact] = useState<ArtifactPreviewable | null>(null);

  const lineage = buildLineage(runs.filter((r) => r.provenanceLinks.length > 0 || true));
  const hasLinks = runs.some((r) => r.provenanceLinks.length > 0);

  if (!hasLinks) {
    return (
      <div style={{
        padding: "32px 20px", textAlign: "center",
        border: "1px dashed var(--color-border)", borderRadius: 12,
        backgroundColor: "var(--color-surface)",
        fontSize: 13, color: "var(--color-text-muted)",
      }}>
        No artifact reuse detected yet. Use <strong style={{ color: "var(--color-text-secondary)" }}>Use in Canvas</strong> on a run artifact to create lineage links.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 24 }}>
      {/* Timeline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0, minWidth: 0, flex: 1 }}>
        {lineage.map((item, idx) => {
          if (item.kind === "run") {
            const dot = STATUS_DOT[item.run.status] ?? "#737373";
            return (
              <div key={`run-${item.run.id}`} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                {/* Track line + dot */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20, flexShrink: 0 }}>
                  {idx > 0 && (
                    <div style={{ width: 2, height: 12, backgroundColor: "var(--color-border)" }} />
                  )}
                  <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: dot, flexShrink: 0 }} />
                  {idx < lineage.length - 1 && (
                    <div style={{ width: 2, flex: 1, minHeight: 12, backgroundColor: "var(--color-border)" }} />
                  )}
                </div>
                {/* Run card */}
                <div style={{
                  padding: "8px 12px",
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)", borderRadius: 8,
                  flex: 1, marginTop: idx > 0 ? 4 : 0, marginBottom: 4,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", textTransform: "capitalize" }}>
                    Run {item.run.id.slice(0, 8)}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--color-text-muted)", marginLeft: 8 }}>
                    {item.run.status.replace(/_/g, " ")} · {new Date(item.run.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          }

          // Artifact edge
          const artifactUrl = `/api/artifacts?path=${encodeURIComponent(item.artifactPath)}`;
          const artifactFilename = item.artifactPath.split("/").pop() ?? "artifact";
          const artifactMimeType = artifactFilename.endsWith(".mp4") ? "video/mp4" : undefined;
          const previewable: ArtifactPreviewable = {
            modelId: item.artifactPath,
            modelName: `Artifact from ${item.sourceRunId.slice(0, 8)}`,
            outputUrl: artifactUrl,
            filename: artifactFilename,
            mimeType: artifactMimeType,
          };

          return (
            <div key={`artifact-${item.artifactPath}-${item.consumerRunId}`} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              {/* Track line (no dot for edges) */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20, flexShrink: 0 }}>
                <div style={{ width: 2, flex: 1, minHeight: 32, backgroundColor: "var(--color-border)", borderLeft: "2px dashed var(--color-border)", borderRight: "none" }} />
              </div>
              {/* Artifact chip */}
              <button
                onClick={() => setPreviewArtifact(previewArtifact?.modelId === item.artifactPath ? null : previewable)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "4px 10px", borderRadius: 6, cursor: "pointer",
                  backgroundColor: previewArtifact?.modelId === item.artifactPath
                    ? "rgba(139,92,246,0.15)"
                    : "rgba(88,28,135,0.12)",
                  border: previewArtifact?.modelId === item.artifactPath
                    ? "1px solid rgba(139,92,246,0.5)"
                    : "1px solid rgba(167,139,250,0.25)",
                  color: "#c4b5fd", fontSize: 11, margin: "8px 0",
                  alignSelf: "flex-start",
                }}
              >
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                  <path d="M6.5 4.5a2 2 0 00-2.83 0L1.5 6.67a2 2 0 002.83 2.83l.55-.55" />
                  <path d="M3.5 5.5a2 2 0 002.83 0l2.17-2.17a2 2 0 00-2.83-2.83l-.55.55" />
                </svg>
                artifact reused
                <span style={{ opacity: 0.6, fontSize: 10 }}>{artifactFilename}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Preview panel — shown when an artifact is selected */}
      {previewArtifact && (
        <div style={{ width: 260, flexShrink: 0 }}>
          <ArtifactPreviewPanel
            result={previewArtifact}
            label="Lineage artifact"
            highlighted={false}
          />
        </div>
      )}
    </div>
  );
}
