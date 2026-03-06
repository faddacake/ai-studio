"use client";

import { memo, useCallback } from "react";
import type { ExportStatus } from "@/hooks/useExportBundle";

interface ExportButtonProps {
  status: ExportStatus;
  onExport: () => void;
  onReset?: () => void;
  disabled?: boolean;
  error?: string | null;
}

const WORKING: ExportStatus[] = ["preparing", "fetching-images", "building-zip"];

export const ExportButton = memo(function ExportButton({
  status,
  onExport,
  onReset,
  disabled = false,
  error = null,
}: ExportButtonProps) {
  const isWorking = WORKING.includes(status);
  const isDisabled = disabled || isWorking;

  const handleClick = useCallback(() => {
    if (isDisabled) return;

    if (status === "error" && onReset) {
      onReset();
      return;
    }

    onExport();
  }, [isDisabled, status, onExport, onReset]);

  const label =
    status === "preparing"
      ? "Preparing…"
      : status === "fetching-images"
      ? "Fetching assets…"
      : status === "building-zip"
      ? "Building ZIP…"
      : status === "error"
      ? "Retry Export"
      : "Export Campaign";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {status === "error" ? (
        <span style={{ fontSize: 12, color: "var(--color-error)" }}>
          {error || "Export failed"}
        </span>
      ) : null}

      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        style={{
          opacity: isDisabled ? 0.55 : 1,
          cursor: isDisabled ? "not-allowed" : "pointer",
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid var(--color-border, rgba(255,255,255,0.12))",
          background: "var(--color-surface, rgba(255,255,255,0.06))",
          color: "inherit",
          fontWeight: 600,
        }}
        aria-disabled={isDisabled}
      >
        {label}
      </button>
    </div>
  );
});
