"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ModelRunResult, ModelRunStatus } from "@/hooks/usePromptRunner";
import type { ModelOption } from "@/config/models";
import { rankModels, type RankingWeights } from "@/lib/ranking/score";
import { ArtifactPreviewPanel } from "./ArtifactPreviewPanel";

export type ResultsTab = "results" | "social";

interface ResultsGridProps {
  results: ModelRunResult[];
  models: ModelOption[];
  workflowId: string | null;
  winnerId: string | null;
  rankingWeights?: RankingWeights;
  showRanking?: boolean;
  showCompare?: boolean;
  autoSelectBest?: boolean;
  activeTab?: ResultsTab;
  onTabChange?: (tab: ResultsTab) => void;
  socialContent?: React.ReactNode;
  exportContent?: React.ReactNode;
  onToggleAutoSelect?: () => void;
  onSelectWinner: (id: string) => void;
  onCompare: () => void;
  /** Called to seed canvas sessionStorage before navigating to /canvas. */
  onOpenCanvas?: () => void;
}

export const ResultsGrid = memo(function ResultsGrid({
  results,
  models,
  workflowId,
  winnerId,
  rankingWeights,
  showRanking = true,
  showCompare = true,
  autoSelectBest = false,
  activeTab = "results",
  onTabChange,
  socialContent,
  exportContent,
  onToggleAutoSelect,
  onSelectWinner,
  onCompare,
  onOpenCanvas,
}: ResultsGridProps) {
  const router = useRouter();
  const handleOpenCanvas = useCallback(() => {
    if (process.env.NODE_ENV !== "production") console.log("[OpenCanvas] to canvas", { workflowId });
    onOpenCanvas?.();
    const target = workflowId ? `/canvas?workflow=${workflowId}` : "/canvas";
    if (process.env.NODE_ENV !== "production") console.log("[OpenCanvas] go", target);
    router.push(target);
  }, [workflowId, onOpenCanvas, router]);
  const completedCount = results.filter((r) => r.status === "completed").length;
  const ranking = useMemo(
    () => (showRanking && completedCount >= 1 ? rankModels(results, models, rankingWeights) : null),
    [results, models, rankingWeights, completedCount, showRanking],
  );

  const highestScoredId = useMemo(() => {
    const scored = results.filter((r) => r.score != null && r.score >= 0);
    if (scored.length === 0) return null;
    return scored.sort((a, b) => (b.score ?? -1) - (a.score ?? -1))[0].modelId;
  }, [results]);

  const hasCompleted = completedCount >= 1;

useEffect(() => {
  if (!autoSelectBest) return;
  if (winnerId) return;
  if (!results?.length) return;

  const firstSuccess = results.find(
    (r) => r.status === "completed"
  );
  if (!firstSuccess) return;

  onSelectWinner(firstSuccess.modelId);
}, [autoSelectBest, winnerId, results, onSelectWinner]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {onTabChange ? (
            <div style={{ display: "flex", gap: 0, backgroundColor: "var(--color-bg-primary)", borderRadius: 8, padding: 3 }}>
              {(["results", "social"] as ResultsTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => onTabChange(tab)}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: activeTab === tab ? "var(--color-surface)" : "transparent",
                    color: activeTab === tab ? "var(--color-text-primary)" : "var(--color-text-muted)",
                    transition: "all 100ms ease",
                  }}
                >
                  {tab === "results" ? "Results" : "Social Variants"}
                </button>
              ))}
            </div>
          ) : (
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-primary)" }}>Results</h2>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {onToggleAutoSelect && (
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={autoSelectBest}
                onChange={onToggleAutoSelect}
                style={{ accentColor: "var(--color-accent)" }}
              />
              Auto-select best result
            </label>
          )}
          {hasCompleted && exportContent}
          {showCompare && completedCount >= 2 && (
            <button
              onClick={onCompare}
              style={{
                fontSize: 13,
                fontWeight: 600,
                padding: "6px 14px",
                borderRadius: 6,
                border: "1px solid var(--color-border)",
                backgroundColor: "transparent",
                color: "var(--color-text-primary)",
                cursor: "pointer",
              }}
            >
              Compare Side-by-Side
            </button>
          )}
          {workflowId && (
            <button
              type="button"
              onClick={handleOpenCanvas}
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--color-accent)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "6px 0",
              }}
            >
              Open in Canvas &rarr;
            </button>
          )}
        </div>
      </div>

      {/* Social Variants tab */}
      {activeTab === "social" && socialContent}

      {/* Winner banner */}
      {activeTab === "results" && winnerId && (
        <div style={{
          padding: "12px 16px",
          backgroundColor: "rgba(59,130,246,0.08)",
          border: "1px solid var(--color-accent)",
          borderRadius: 10,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>
            Winner: {results.find((r) => r.modelId === winnerId)?.modelName}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            {workflowId && (
              <button type="button" onClick={handleOpenCanvas} style={{
                fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 6,
                backgroundColor: "var(--color-accent)", color: "#fff", border: "none", cursor: "pointer",
              }}>
                Open in Canvas
              </button>
            )}
            <button disabled style={{
              fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 6,
              border: "1px solid var(--color-border)", backgroundColor: "transparent",
              color: "var(--color-text-muted)", cursor: "default",
            }}>
              Upscale (Soon)
            </button>
          </div>
        </div>
      )}

      {/* Artifact preview — focused review of the selected winner before export */}
      {activeTab === "results" && winnerId && (() => {
        const winner = results.find((r) => r.modelId === winnerId);
        return winner ? <ArtifactPreviewPanel result={winner} /> : null;
      })()}

      {activeTab === "results" && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 12,
        }}>
          {results.map((r) => (
            <ResultCard
              key={r.modelId}
              result={r}
              isWinner={winnerId === r.modelId}
              isRecommended={ranking?.recommendedModelId === r.modelId && completedCount >= 2}
              isHighestScored={highestScoredId === r.modelId}
              onSelectWinner={() => onSelectWinner(r.modelId)}
              workflowId={workflowId}
              onOpenCanvas={handleOpenCanvas}
            />
          ))}
        </div>
      )}
    </div>
  );
});

function ResultCard({
  result: r,
  isWinner,
  isRecommended,
  isHighestScored,
  onSelectWinner,
  workflowId,
  onOpenCanvas,
}: {
  result: ModelRunResult;
  isWinner: boolean;
  isRecommended: boolean;
  isHighestScored: boolean;
  onSelectWinner: () => void;
  workflowId: string | null;
  onOpenCanvas?: () => void;
}) {
  const borderStyle = isWinner
    ? "2px solid var(--color-accent)"
    : isHighestScored
      ? "2px solid transparent"
      : "1px solid var(--color-border)";

  const backgroundImage = isHighestScored && !isWinner
    ? "linear-gradient(var(--color-surface), var(--color-surface)), linear-gradient(135deg, rgb(234,179,8), rgb(34,197,94))"
    : undefined;

  return (
    <div style={{
      padding: 16,
      backgroundColor: "var(--color-surface)",
      border: borderStyle,
      ...(backgroundImage
        ? { backgroundImage, backgroundOrigin: "border-box", backgroundClip: "padding-box, border-box" }
        : {}),
      borderRadius: 12,
      minHeight: 220,
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>{r.modelName}</span>
          {isRecommended && (
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 6,
              background: "linear-gradient(135deg, rgba(234,179,8,0.18), rgba(245,158,11,0.12))",
              color: "var(--color-warning)",
            }}>
              Recommended
            </span>
          )}
          {r.score != null && r.score >= 0 && (
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 6,
              background: isHighestScored
                ? "linear-gradient(135deg, rgba(234,179,8,0.18), rgba(34,197,94,0.15))"
                : "rgba(59,130,246,0.10)",
              color: isHighestScored ? "var(--color-success)" : "var(--color-accent)",
            }}>
              AI Match Score: {r.score}
            </span>
          )}
        </div>
        <StatusBadge status={r.status} />
      </div>

      {/* Cost + time */}
      {(r.cost !== undefined || r.durationMs !== undefined) && (
        <div style={{ display: "flex", gap: 12, marginBottom: 10, fontSize: 12, color: "var(--color-text-muted)" }}>
          {r.cost !== undefined && <span>${r.cost.toFixed(3)}</span>}
          {r.durationMs !== undefined && <span>{(r.durationMs / 1000).toFixed(1)}s</span>}
        </div>
      )}

      {/* Output area */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: "var(--color-bg-primary)", minHeight: 120, marginBottom: 12 }}>
        {r.status === "queued" && (
          <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Queued</span>
        )}
        {r.status === "running" && (
          <span style={{ fontSize: 13, color: "var(--color-accent)" }}>Generating...</span>
        )}
        {r.status === "completed" && r.outputUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.outputUrl} alt={`${r.modelName} output`} style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 6 }} />
        )}
        {r.status === "completed" && !r.outputUrl && r.error && (
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", textAlign: "center", lineHeight: 1.5, padding: "0 12px" }}>{r.error}</p>
        )}
        {r.status === "completed" && !r.outputUrl && !r.error && (
          <span style={{ fontSize: 13, color: "var(--color-success)" }}>Done</span>
        )}
        {r.status === "failed" && (
          <p style={{ fontSize: 12, color: "var(--color-error)", textAlign: "center", lineHeight: 1.5, padding: "0 12px" }}>{r.error || "Generation failed"}</p>
        )}
        {r.status === "idle" && (
          <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>—</span>
        )}
      </div>

      {/* Actions */}
      {r.status === "completed" && (
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={onSelectWinner}
            style={{
              flex: 1,
              fontSize: 12,
              fontWeight: 600,
              padding: "7px 0",
              borderRadius: 6,
              border: isWinner ? "none" : "1px solid var(--color-border)",
              backgroundColor: isWinner ? "var(--color-accent)" : "transparent",
              color: isWinner ? "#fff" : "var(--color-text-secondary)",
              cursor: "pointer",
            }}
          >
            {isWinner ? "Winner" : "Select Winner"}
          </button>
          {workflowId && (
            <button
              type="button"
              onClick={onOpenCanvas}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "7px 10px",
                borderRadius: 6,
                border: "1px solid var(--color-border)",
                backgroundColor: "transparent",
                color: "var(--color-text-secondary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              Canvas
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ModelRunStatus }) {
  const config: Record<ModelRunStatus, { bg: string; color: string; label: string }> = {
    idle: { bg: "rgba(102,102,102,0.15)", color: "var(--color-text-muted)", label: "Idle" },
    queued: { bg: "rgba(234,179,8,0.12)", color: "var(--color-warning)", label: "Queued" },
    running: { bg: "rgba(59,130,246,0.12)", color: "var(--color-accent)", label: "Running" },
    completed: { bg: "rgba(34,197,94,0.12)", color: "var(--color-success)", label: "Done" },
    failed: { bg: "rgba(239,68,68,0.12)", color: "var(--color-error)", label: "Failed" },
  };
  const c = config[status];
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 600,
      padding: "3px 8px",
      borderRadius: 6,
      backgroundColor: c.bg,
      color: c.color,
    }}>
      {c.label}
    </span>
  );
}
