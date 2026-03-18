"use client";

import { useState } from "react";
import type { Scene } from "@/lib/editorProjectTypes";

interface SceneListProps {
  scenes: Scene[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (idx: number, dir: "up" | "down") => void;
  onRemove: (idx: number) => void;
  onDurationChange: (idx: number, duration: number) => void;
}

function artifactUrl(path: string): string {
  return `/api/artifacts?path=${encodeURIComponent(path)}`;
}

export function SceneList({
  scenes,
  selectedId,
  onSelect,
  onMove,
  onRemove,
  onDurationChange,
}: SceneListProps) {
  return (
    <div
      style={{
        width: 220,
        flexShrink: 0,
        borderRight: "1px solid var(--color-border)",
        backgroundColor: "var(--color-bg-secondary)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 12px 8px",
          borderBottom: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-muted)" }}>
          Scenes
        </span>
        <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
          {scenes.length}
        </span>
      </div>

      {/* Scene cards */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
        {scenes.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--color-text-muted)", padding: "12px 4px", textAlign: "center" }}>
            No scenes yet.
          </p>
        ) : (
          scenes.map((scene, idx) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              idx={idx}
              total={scenes.length}
              isSelected={scene.id === selectedId}
              onSelect={() => onSelect(scene.id)}
              onMoveUp={() => onMove(idx, "up")}
              onMoveDown={() => onMove(idx, "down")}
              onRemove={() => onRemove(idx)}
              onDurationChange={(d) => onDurationChange(idx, d)}
            />
          ))
        )}
      </div>

      {/* Add scene placeholder */}
      <div
        style={{
          padding: "8px",
          borderTop: "1px solid var(--color-border)",
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          disabled
          title="Add scene — coming soon: pick from run artifacts"
          style={{
            width: "100%",
            padding: "7px",
            fontSize: 12,
            color: "var(--color-text-muted)",
            background: "none",
            border: "1px dashed var(--color-border)",
            borderRadius: 6,
            cursor: "not-allowed",
            textAlign: "center",
          }}
        >
          + Add Scene
        </button>
      </div>
    </div>
  );
}

// ── Scene card ──────────────────────────────────────────────────────────────

interface SceneCardProps {
  scene: Scene;
  idx: number;
  total: number;
  isSelected: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onDurationChange: (duration: number) => void;
}

function SceneCard({
  scene,
  idx,
  total,
  isSelected,
  onSelect,
  onMoveUp,
  onMoveDown,
  onRemove,
  onDurationChange,
}: SceneCardProps) {
  const [editingDuration, setEditingDuration] = useState(false);
  const [durationInput, setDurationInput] = useState(String(scene.duration));

  function commitDuration() {
    const val = parseFloat(durationInput);
    if (!isNaN(val) && val > 0) {
      onDurationChange(Math.round(val * 10) / 10);
    } else {
      setDurationInput(String(scene.duration));
    }
    setEditingDuration(false);
  }

  const src = artifactUrl(scene.src);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); }}}
      style={{
        borderRadius: 6,
        border: `1px solid ${isSelected ? "var(--color-accent)" : "var(--color-border)"}`,
        backgroundColor: isSelected ? "rgba(59,130,246,0.06)" : "var(--color-surface)",
        cursor: "pointer",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          position: "relative",
          height: 52,
          backgroundColor: "var(--color-bg-primary)",
          overflow: "hidden",
        }}
      >
        {scene.type === "video" ? (
          <video
            src={src}
            muted
            playsInline
            preload="metadata"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={`Scene ${idx + 1}`}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        )}

        {/* Type badge */}
        <span
          style={{
            position: "absolute",
            top: 4,
            left: 4,
            fontSize: 9,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            padding: "1px 5px",
            borderRadius: 3,
            backgroundColor: scene.type === "video" ? "rgba(249,115,22,0.85)" : "rgba(168,85,247,0.85)",
            color: "#fff",
          }}
        >
          {scene.type}
        </span>

        {/* Scene index */}
        <span
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            fontSize: 9,
            color: "rgba(255,255,255,0.6)",
            fontWeight: 600,
          }}
        >
          {idx + 1}
        </span>
      </div>

      {/* Controls row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          padding: "4px 6px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Duration */}
        {editingDuration ? (
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={durationInput}
            onChange={(e) => setDurationInput(e.target.value)}
            onBlur={commitDuration}
            onKeyDown={(e) => { if (e.key === "Enter") commitDuration(); if (e.key === "Escape") { setDurationInput(String(scene.duration)); setEditingDuration(false); } }}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            style={{
              width: 44,
              fontSize: 11,
              background: "var(--color-bg-primary)",
              border: "1px solid var(--color-accent)",
              borderRadius: 3,
              color: "var(--color-text-primary)",
              padding: "1px 4px",
              outline: "none",
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => { setDurationInput(String(scene.duration)); setEditingDuration(true); }}
            title="Click to edit duration (seconds)"
            style={{
              fontSize: 11,
              color: "var(--color-text-muted)",
              background: "none",
              border: "none",
              padding: "1px 2px",
              cursor: "pointer",
              borderRadius: 3,
              flexShrink: 0,
            }}
          >
            {scene.duration}s
          </button>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Move up */}
        <IconButton
          onClick={onMoveUp}
          disabled={idx === 0}
          title="Move scene up"
          aria-label="Move scene up"
        >
          <svg width={10} height={10} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 6.5l3-3 3 3" />
          </svg>
        </IconButton>

        {/* Move down */}
        <IconButton
          onClick={onMoveDown}
          disabled={idx === total - 1}
          title="Move scene down"
          aria-label="Move scene down"
        >
          <svg width={10} height={10} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 3.5l3 3 3-3" />
          </svg>
        </IconButton>

        {/* Remove */}
        <IconButton
          onClick={onRemove}
          title="Remove scene"
          aria-label="Remove scene"
          danger
        >
          <svg width={10} height={10} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
            <path d="M2 2l6 6M8 2L2 8" />
          </svg>
        </IconButton>
      </div>
    </div>
  );
}

// ── Icon button ──────────────────────────────────────────────────────────────

function IconButton({
  onClick,
  disabled,
  title,
  "aria-label": ariaLabel,
  danger,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  "aria-label"?: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 18,
        height: 18,
        padding: 0,
        background: "none",
        border: "none",
        borderRadius: 3,
        cursor: disabled ? "default" : "pointer",
        color: disabled
          ? "var(--color-border)"
          : danger
          ? "var(--color-text-muted)"
          : "var(--color-text-muted)",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.color = danger ? "var(--color-error)" : "var(--color-text-secondary)";
          e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = disabled ? "var(--color-border)" : "var(--color-text-muted)";
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      {children}
    </button>
  );
}
