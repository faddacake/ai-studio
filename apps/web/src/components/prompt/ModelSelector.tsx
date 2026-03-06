"use client";

import { memo } from "react";
import type { ModelOption, ModelCategory } from "@/config/models";

interface ModelSelectorProps {
  category: ModelCategory;
  models: ModelOption[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
}

export const ModelSelector = memo(function ModelSelector({
  category,
  models,
  selected,
  onToggle,
  onSelectAll,
}: ModelSelectorProps) {
  const supportedCount = models.filter((m) => m.supported).length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)" }}>
          {category === "image" ? "Image" : category === "video" ? "Video" : "Voice"} Models
        </label>
        {supportedCount > 0 && (
          <button
            onClick={onSelectAll}
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--color-accent)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px 6px",
            }}
          >
            Select All Supported
          </button>
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {models.map((m) => {
          const isSelected = selected.has(m.id);
          const isDisabled = !m.supported;
          return (
            <button
              key={m.id}
              onClick={() => !isDisabled && onToggle(m.id)}
              disabled={isDisabled}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 12px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                cursor: isDisabled ? "default" : "pointer",
                opacity: isDisabled ? 0.45 : 1,
                border: isSelected
                  ? "1px solid var(--color-accent)"
                  : "1px solid var(--color-border)",
                backgroundColor: isSelected
                  ? "rgba(59, 130, 246, 0.1)"
                  : "transparent",
                color: isSelected
                  ? "var(--color-accent)"
                  : "var(--color-text-secondary)",
                transition: "all 100ms ease",
              }}
            >
              {/* Checkbox indicator */}
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  border: isSelected
                    ? "none"
                    : "1.5px solid var(--color-border)",
                  backgroundColor: isSelected ? "var(--color-accent)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {isSelected && (
                  <svg width={10} height={10} viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              {m.name}
              {m.supported && m.tags.includes("recommended") && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 5px",
                  borderRadius: 4,
                  backgroundColor: "rgba(34,197,94,0.12)",
                  color: "var(--color-success)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}>
                  Rec
                </span>
              )}
              {!m.supported && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "1px 5px",
                  borderRadius: 4,
                  backgroundColor: "rgba(102,102,102,0.15)",
                  color: "var(--color-text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}>
                  Soon
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});
