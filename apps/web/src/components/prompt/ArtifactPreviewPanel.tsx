"use client";

import { useCallback, useEffect, useState } from "react";

/** Minimal shape required by ArtifactPreviewPanel. ModelRunResult satisfies this structurally. */
export interface ArtifactPreviewable {
  /** Stable unique id used to reset download state when the previewed artifact changes. */
  modelId: string;
  modelName: string;
  outputUrl?: string;
  /** Explicit download filename; overrides URL-derived name when provided. */
  filename?: string;
  /** MIME type of the artifact (e.g. "image/png", "video/mp4"). Defaults to image rendering. */
  mimeType?: string;
  cost?: number;
  durationMs?: number;
  score?: number;
  rank?: number;
  /** File size in bytes. Rendered as a human-readable hint when present. */
  sizeBytes?: number;
}

interface ArtifactPreviewPanelProps {
  result: ArtifactPreviewable;
  /** Override the eyebrow label above the model name. Defaults to "Selected for export". */
  label?: string;
  /** Use accent border to signal active winner selection. Set false for neutral/history contexts. Defaults to true. */
  highlighted?: boolean;
  /**
   * When provided, a "Use in Canvas" button appears that calls this callback with the
   * artifact URL and resolved filename. Intended for canvas inspector contexts only.
   */
  onUseInCanvas?: (url: string, filename: string) => void;
}

function formatBytes(n: number): string {
  if (n < 1000) return `${n} B`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)} KB`;
  return `${(n / 1_000_000).toFixed(1)} MB`;
}

function deriveFilename(url: string, modelName: string, explicit?: string): string {
  if (explicit) return explicit;
  const extMatch = url.split("?")[0].match(/\.(\w{2,5})$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : "png";
  const base = modelName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "artifact";
  return `${base}.${ext}`;
}

/**
 * Focused artifact preview shown when a winner is selected.
 * Renders a larger view of the winning output with key metadata,
 * acting as a review layer before export.
 */
export function ArtifactPreviewPanel({ result, label = "Selected for export", highlighted = true, onUseInCanvas }: ArtifactPreviewPanelProps) {
  const [downloadState, setDownloadState] = useState<"idle" | "downloading" | "error">("idle");

  useEffect(() => { setDownloadState("idle"); }, [result.modelId]);

  const handleDownload = useCallback(async () => {
    if (!result.outputUrl) return;
    setDownloadState("downloading");
    try {
      const res = await fetch(result.outputUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = deriveFilename(result.outputUrl, result.modelName, result.filename);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
      setDownloadState("idle");
    } catch {
      setDownloadState("error");
    }
  }, [result.outputUrl, result.modelName, result.filename]);

  useEffect(() => {
    if (!result.outputUrl) return;
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
      if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        handleDownload();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [result.outputUrl, handleDownload]);

  if (!result.outputUrl) return null;

  return (
    <div
      style={{
        marginBottom: 16,
        padding: 16,
        backgroundColor: "var(--color-surface)",
        border: `1px solid ${highlighted ? "var(--color-accent)" : "var(--color-border)"}`,
        borderRadius: 12,
        display: "flex",
        gap: 20,
        alignItems: "flex-start",
        flexWrap: "wrap",
      }}
    >
      {/* Artifact preview — image or video */}
      {result.mimeType?.startsWith("video/") ? (
        <video
          src={result.outputUrl}
          controls
          playsInline
          style={{
            maxWidth: 340,
            maxHeight: 340,
            width: "100%",
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            backgroundColor: "var(--color-bg-primary)",
            display: "block",
            flex: "0 1 340px",
          }}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={result.outputUrl}
          alt={`${result.modelName} output preview`}
          style={{
            maxWidth: 340,
            maxHeight: 340,
            width: "100%",
            objectFit: "contain",
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            backgroundColor: "var(--color-bg-primary)",
            display: "block",
            flex: "0 1 340px",
          }}
        />
      )}

      {/* Metadata */}
      <div style={{ flex: 1, minWidth: 160, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-muted)", marginBottom: 4 }}>
            {label}
          </p>
          <p style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)" }}>
            {result.modelName}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {result.score != null && result.score >= 0 && (
            <MetaRow label="AI Match Score" value={String(result.score)} highlight />
          )}
          {result.rank != null && (
            <MetaRow label="Rank" value={`#${result.rank}`} />
          )}
          {result.cost !== undefined && (
            <MetaRow label="Cost" value={`$${result.cost.toFixed(3)}`} />
          )}
          {result.durationMs !== undefined && (
            <MetaRow label="Generated in" value={`${(result.durationMs / 1000).toFixed(1)}s`} />
          )}
          {result.sizeBytes !== undefined && (
            <MetaRow label="File size" value={formatBytes(result.sizeBytes)} />
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloadState === "downloading"}
            aria-disabled={downloadState === "downloading" ? true : undefined}
            aria-busy={downloadState === "downloading" ? true : undefined}
            title="Download (D)"
            aria-keyshortcuts="d"
            aria-label={downloadState === "downloading" ? "Downloading artifact" : downloadState === "error" ? "Download failed, retry" : "Download artifact"}
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "6px 14px",
              borderRadius: 6,
              border: `1px solid ${downloadState === "error" ? "var(--color-error)" : "var(--color-border)"}`,
              backgroundColor: "transparent",
              color: downloadState === "downloading"
                ? "var(--color-text-muted)"
                : downloadState === "error"
                  ? "var(--color-error)"
                  : "var(--color-text-secondary)",
              cursor: downloadState === "downloading" ? "default" : "pointer",
            }}
          >
            {downloadState === "downloading" ? "Downloading…" : downloadState === "error" ? "Failed — Retry" : "Download"}
          </button>

          {onUseInCanvas && (
            <button
              type="button"
              onClick={() => onUseInCanvas(
                result.outputUrl!,
                deriveFilename(result.outputUrl!, result.modelName, result.filename),
              )}
              title="Insert as input node on canvas"
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "6px 14px",
                borderRadius: 6,
                border: "1px solid var(--color-accent, #3b82f6)",
                backgroundColor: "transparent",
                color: "var(--color-accent, #3b82f6)",
                cursor: "pointer",
              }}
            >
              Use in Canvas
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 12, color: "var(--color-text-muted)", minWidth: 110 }}>{label}</span>
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: highlight ? "var(--color-success)" : "var(--color-text-secondary)",
        }}
      >
        {value}
      </span>
    </div>
  );
}
