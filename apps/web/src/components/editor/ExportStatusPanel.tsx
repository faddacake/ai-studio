"use client";

/**
 * ExportStatusPanel — minimal export trigger and status display.
 *
 * Renders inside the EditorToolbar. Shows:
 *   idle        → "Export" button
 *   triggering  → "Exporting…" static label (POST in flight)
 *   fetching    → pulsing dot + status-aware label (actively polling)
 *                   pending  → "Queued"
 *                   running  → "Rendering…"
 *                   fallback → "Exporting…"
 *   done        → "✓ Export done" + sceneCount + totalDurationMs + dismiss
 *                  (or "✓ Export queued" when renderResult is absent)
 *   error       → error message + "Retry" button
 *
 * Artifact preview is surfaced in the editor's right column (EditorShell),
 * not in this panel, so the toolbar stays compact in all states.
 *
 * Accessibility:
 *   A single `role="status"` live region is always mounted inside a
 *   `display: contents` wrapper. It carries a short announcement string that
 *   updates as the export state progresses so screen-reader users hear the
 *   same transitions that are shown visually. The wrapper uses
 *   `display: contents` so neither it nor the off-screen live region affects
 *   the toolbar's flex layout.
 */

import type { CSSProperties } from "react";
import { formatDurationMs, hasRenderResult } from "@/lib/exportJobStatus";
import type { ExportJobStatusResponse } from "@/lib/exportJobStatus";
import type { ExportJobHookState } from "@/hooks/useExportJob";

// ── Platform ───────────────────────────────────────────────────────────────────

/** True when running in a macOS browser context. Used for shortcut hints only. */
const isMac =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

const EXPORT_SHORTCUT_HINT = isMac ? "Export (⌘E)" : "Export (Ctrl+E)";
const RETRY_SHORTCUT_HINT  = isMac ? "Retry (⌘E)"  : "Retry (Ctrl+E)";

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Standard visually-hidden utility (sr-only). Position absolute keeps it
 *  out of flex flow while remaining reachable by screen readers. */
const srOnly: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
};

/**
 * Derives the text content for the aria-live region from current state.
 * Returns an empty string for `idle` so no announcement fires on reset.
 */
function liveAnnouncement(
  state: ExportJobHookState,
  jobStatus: ExportJobStatusResponse | null,
  hasResult: boolean,
): string {
  switch (state) {
    case "triggering":
      return "Exporting";
    case "fetching":
      if (jobStatus?.status === "running") return "Export rendering";
      if (jobStatus?.status === "pending") return "Export queued";
      return "Exporting";
    case "error":
      return "Export failed";
    case "done":
      return hasResult ? "Export done" : "Export queued successfully";
    default:
      return ""; // idle — no announcement on reset
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

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
  // Compute once — used by both the live region and the done branch.
  const hasResult = jobStatus !== null && hasRenderResult(jobStatus);
  const announcement = liveAnnouncement(state, jobStatus, hasResult);

  // `display: contents` makes this wrapper transparent to the toolbar's flex
  // layout: its children participate directly in the flex container while the
  // wrapper element itself contributes no box. The live region uses
  // `position: absolute` so it is further removed from flex flow.
  return (
    <span style={{ display: "contents" }}>

      {/*
       * Persistent live region — never unmounts across state transitions.
       * A stable DOM node is required: if the element were mounted/unmounted
       * per-branch, browsers reset the ARIA machinery and the first
       * announcement after mount can be suppressed.
       * aria-atomic ensures the whole string is read as a unit.
       */}
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={srOnly}
      >
        {announcement}
      </span>

      {/* ── Visual content (unchanged from previous pass) ─────────────────── */}

      {state === "idle" && (
        <button
          type="button"
          onClick={onExport}
          title={EXPORT_SHORTCUT_HINT}
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
      )}

      {state === "triggering" && (
        <span
          style={{
            fontSize: 12,
            color: "var(--color-text-muted)",
            flexShrink: 0,
          }}
        >
          Exporting…
        </span>
      )}

      {state === "fetching" && (() => {
        const pollLabel =
          jobStatus?.status === "running"
            ? "Rendering…"
            : jobStatus?.status === "pending"
            ? "Queued"
            : "Exporting…";

        return (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "var(--color-text-muted)",
              flexShrink: 0,
            }}
          >
            {/* Inject keyframe once — scoped name avoids global collisions. */}
            <style>{`@keyframes esp-pulse{0%,100%{opacity:.25}50%{opacity:1}}`}</style>
            <span
              aria-hidden="true"
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: "var(--color-accent, #6366f1)",
                display: "inline-block",
                animation: "esp-pulse 1.4s ease-in-out infinite",
              }}
            />
            {pollLabel}
          </span>
        );
      })()}

      {state === "error" && (
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
            title={`${RETRY_SHORTCUT_HINT}${error ? ` — ${error}` : ""}`}
          >
            Retry
          </button>
        </span>
      )}

      {state === "done" && (
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
          ✓ {hasResult ? "Export done" : "Export queued"}
          {hasResult && (
            <span style={{ color: "var(--color-text-muted)", fontSize: 11 }}>
              {jobStatus.renderResult.sceneCount} scenes ·{" "}
              {formatDurationMs(jobStatus.renderResult.totalDurationMs)}
            </span>
          )}
          <button
            type="button"
            onClick={onReset}
            aria-label="Dismiss export status"
            title="Dismiss (Esc)"
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
      )}

    </span>
  );
}
