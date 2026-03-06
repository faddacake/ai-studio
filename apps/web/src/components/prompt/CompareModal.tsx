"use client";

import { memo } from "react";
import type { ModelRunResult } from "@/hooks/usePromptRunner";

interface CompareModalProps {
  results: ModelRunResult[];
  prompt: string;
  onClose: () => void;
}

export const CompareModal = memo(function CompareModal({
  results,
  prompt,
  onClose,
}: CompareModalProps) {
  const completed = results.filter((r) => r.status === "completed");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        backgroundColor: "rgba(0,0,0,0.75)",
        display: "flex",
        flexDirection: "column",
      }}
      onClick={onClose}
    >
      <div
        style={{
          flex: 1,
          margin: 24,
          backgroundColor: "var(--color-bg-primary)",
          border: "1px solid var(--color-border)",
          borderRadius: 16,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>
              Side-by-Side Comparison
            </h2>
            <p style={{
              fontSize: 13,
              color: "var(--color-text-muted)",
              maxWidth: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {prompt}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close comparison"
            style={{
              background: "none",
              border: "none",
              color: "var(--color-text-muted)",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Comparison grid */}
        <div style={{
          flex: 1,
          overflow: "auto",
          padding: 20,
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(completed.length, 4)}, 1fr)`,
          gap: 16,
        }}>
          {completed.map((r) => (
            <div
              key={r.modelId}
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--color-border)" }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>
                  {r.modelName}
                </span>
                {r.cost !== undefined && (
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)", marginLeft: 8 }}>
                    ${r.cost.toFixed(3)}
                  </span>
                )}
              </div>
              <div style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
                minHeight: 300,
              }}>
                {r.outputUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.outputUrl}
                    alt={`${r.modelName} output`}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      borderRadius: 8,
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <p style={{ fontSize: 13, color: "var(--color-text-secondary)", textAlign: "center", lineHeight: 1.5 }}>
                    {r.error || "Output pending"}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
