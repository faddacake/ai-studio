"use client";

/**
 * ExportStatusPanel — minimal export trigger and status display.
 *
 * Renders inside the EditorToolbar. Shows:
 *   idle      → "Export" button
 *   triggering/fetching → "Exporting…" label
 *   done      → "✓ Queued" + sceneCount + totalDurationMs (when renderResult present)
 *   error     → error message + "Retry" button
 *
 * No artifact/file affordances. No polling controls. Read-only status surface.
 */

import { formatDurationMs, hasRenderResult } from "@/lib/exportJobStatus";
import type { ExportJobStatusResponse } from "@/lib/exportJobStatus";
import type { ExportJobHookState } from "@/hooks/useExportJob";

interface ExportStatusPanelProps {
  state: ExportJobHookState;
  jobStatus: ExportJobStatusResponse | null;
  error: string | null;
  onExport: () => void;
  onReset: () => void;
}

export function ExportStatusPanel({
  state,
  jobStatus,
  error,
  onExport,
  onReset,
}: ExportStatusPanelProps) {
  if (state === "idle") {
    return (
      <button
        type="button"
        onClick={onExport}
        style={{
          fontSize: 12,
          fontWeight: 600,
          padding: "5px 14px",
          borderRadius: 6,
          border: "1px solid var(--color-border)",
          backgroundColor: "transparent",
          color: "var(--color-text-secondary)",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        Export
      </button>
    );
  }

  if (state === "triggering" || state === "fetching") {
    return (
      <span
        style={{
          fontSize: 12,
          color: "var(--color-text-muted)",
          flexShrink: 0,
        }}
      >
        Exporting…
      </span>
    );
  }

  if (state === "error") {
    return (
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          color: "var(--color-error)",
          flexShrink: 0,
        }}
      >
        Export failed
        <button
          type="button"
          onClick={onReset}
          style={{
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: 4,
            border: "1px solid var(--color-error)",
            background: "transparent",
            color: "var(--color-error)",
            cursor: "pointer",
          }}
          title={error ?? undefined}
        >
          Retry
        </button>
      </span>
    );
  }

  // state === "done"
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 12,
        color: "var(--color-success, #22c55e)",
        flexShrink: 0,
      }}
    >
      ✓ Export queued
      {jobStatus && hasRenderResult(jobStatus) && (
        <span style={{ color: "var(--color-text-muted)", fontSize: 11 }}>
          {jobStatus.renderResult.sceneCount} scenes ·{" "}
          {formatDurationMs(jobStatus.renderResult.totalDurationMs)}
        </span>
      )}
      <button
        type="button"
        onClick={onReset}
        aria-label="Dismiss export status"
        style={{
          fontSize: 11,
          lineHeight: 1,
          padding: "2px 5px",
          borderRadius: 4,
          border: "1px solid var(--color-border)",
          background: "transparent",
          color: "var(--color-text-muted)",
          cursor: "pointer",
        }}
      >
        ✕
      </button>
    </span>
  );
}
