"use client";

import { useState, useEffect } from "react";
import type { Scene, TextOverlay } from "@/lib/editorProjectTypes";
import { MIN_SCENE_DURATION_S, clampDurationS } from "@/lib/sceneTiming";

interface SceneInspectorProps {
  scene: Scene;
  onDurationChange: (duration: number) => void;
  onTransitionChange: (transition: "cut" | "fade") => void;
  onFadeDurationChange: (ms: number) => void;
  onOverlayChange: (overlay: TextOverlay | null) => void;
}

const POSITIONS: TextOverlay["position"][] = ["top", "center", "bottom"];
const STYLES: TextOverlay["style"][] = ["subtitle", "title", "minimal"];

const FADE_DEFAULT_MS = 800;

export function SceneInspector({ scene, onDurationChange, onTransitionChange, onFadeDurationChange, onOverlayChange }: SceneInspectorProps) {
  const overlay = scene.textOverlay ?? null;

  // Local drafts — synced to scene prop changes (scene selection)
  const [durationInput, setDurationInput] = useState(String(scene.duration));
  const [fadeDurationInput, setFadeDurationInput] = useState(String(scene.fadeDurationMs ?? FADE_DEFAULT_MS));
  const [text, setText] = useState(overlay?.text ?? "");
  const [position, setPosition] = useState<TextOverlay["position"]>(overlay?.position ?? "bottom");
  const [style, setStyle] = useState<TextOverlay["style"]>(overlay?.style ?? "subtitle");

  useEffect(() => {
    setDurationInput(String(scene.duration));
    setFadeDurationInput(String(scene.fadeDurationMs ?? FADE_DEFAULT_MS));
    setText(overlay?.text ?? "");
    setPosition(overlay?.position ?? "bottom");
    setStyle(overlay?.style ?? "subtitle");
  }, [scene.id]); // reset when switching scenes

  function commitFadeDuration() {
    const val = parseInt(fadeDurationInput, 10);
    if (!isNaN(val) && val >= 100) {
      const clamped = Math.min(val, 10000);
      onFadeDurationChange(clamped);
      setFadeDurationInput(String(clamped));
    } else {
      setFadeDurationInput(String(scene.fadeDurationMs ?? FADE_DEFAULT_MS));
    }
  }

  function commitDuration() {
    const val = parseFloat(durationInput);
    if (!isNaN(val) && val > 0) {
      const clamped = clampDurationS(val);
      onDurationChange(clamped);
      setDurationInput(String(clamped));
    } else {
      setDurationInput(String(scene.duration));
    }
  }

  function commit(
    nextText: string,
    nextPosition: TextOverlay["position"],
    nextStyle: TextOverlay["style"],
  ) {
    if (!nextText.trim()) {
      onOverlayChange(null);
    } else {
      onOverlayChange({ text: nextText, position: nextPosition, style: nextStyle });
    }
  }

  function handleTextBlur() {
    commit(text, position, style);
  }

  function handlePosition(p: TextOverlay["position"]) {
    setPosition(p);
    if (overlay) commit(text, p, style);
  }

  function handleStyle(s: TextOverlay["style"]) {
    setStyle(s);
    if (overlay) commit(text, position, s);
  }

  function handleClear() {
    setText("");
    onOverlayChange(null);
  }

  return (
    <div
      style={{
        width: 220,
        flexShrink: 0,
        borderLeft: "1px solid var(--color-border)",
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
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--color-text-muted)",
          }}
        >
          Scene
        </span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
        {/* Duration */}
        <div style={{ marginBottom: 12 }}>
          <span style={labelStyle}>Duration (s)</span>
          <input
            type="number"
            min={String(MIN_SCENE_DURATION_S)}
            step="0.1"
            value={durationInput}
            onChange={(e) => setDurationInput(e.target.value)}
            onBlur={commitDuration}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.currentTarget.blur(); }
              if (e.key === "Escape") { setDurationInput(String(scene.duration)); e.currentTarget.blur(); }
            }}
            style={{
              display: "block",
              width: "100%",
              fontSize: 12,
              padding: "5px 8px",
              background: "var(--color-bg-primary)",
              border: "1px solid var(--color-border)",
              borderRadius: 5,
              color: "var(--color-text-primary)",
              outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-accent)"; }}
            onBlurCapture={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; }}
          />
        </div>

        {/* Video duration hint — playback window vs natural clip length */}
        {scene.type === "video" && (
          <p style={{ fontSize: 10, color: "var(--color-text-muted)", margin: "-8px 0 12px", lineHeight: 1.5 }}>
            {scene.naturalDuration !== undefined
              ? `Clip: ${scene.naturalDuration}s · playback window, not a trim`
              : "Playback window · sets how long this scene plays"}
          </p>
        )}

        {/* Transition */}
        <div style={{ marginBottom: scene.transition === "fade" ? 8 : 12 }}>
          <span style={labelStyle}>Transition</span>
          <div style={{ display: "flex", gap: 4 }}>
            <ToggleButton
              active={(scene.transition ?? "cut") === "cut"}
              onClick={() => onTransitionChange("cut")}
            >
              cut
            </ToggleButton>
            <ToggleButton
              active={scene.transition === "fade"}
              onClick={() => onTransitionChange("fade")}
            >
              fade
            </ToggleButton>
          </div>
        </div>

        {/* Fade duration — visible only when transition is fade */}
        {scene.transition === "fade" && (
          <div style={{ marginBottom: 12 }}>
            <span style={labelStyle}>Fade (ms)</span>
            <input
              type="number"
              min="100"
              max="10000"
              step="100"
              value={fadeDurationInput}
              onChange={(e) => setFadeDurationInput(e.target.value)}
              onBlur={commitFadeDuration}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.currentTarget.blur(); }
                if (e.key === "Escape") {
                  setFadeDurationInput(String(scene.fadeDurationMs ?? FADE_DEFAULT_MS));
                  e.currentTarget.blur();
                }
              }}
              style={{
                display: "block",
                width: "100%",
                fontSize: 12,
                padding: "5px 8px",
                background: "var(--color-bg-primary)",
                border: "1px solid var(--color-border)",
                borderRadius: 5,
                color: "var(--color-text-primary)",
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-accent)"; }}
              onBlurCapture={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; }}
            />
          </div>
        )}

        <div
          style={{
            borderTop: "1px solid var(--color-border)",
            marginBottom: 12,
            marginLeft: -12,
            marginRight: -12,
            paddingTop: 10,
            paddingLeft: 12,
            paddingRight: 12,
          }}
        >
          <span style={labelStyle}>Text Overlay</span>
        </div>

        {/* Text input */}
        <label style={{ display: "block", marginBottom: 8 }}>
          <span style={labelStyle}>Text</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleTextBlur}
            placeholder="Add overlay text…"
            rows={3}
            style={{
              display: "block",
              width: "100%",
              resize: "vertical",
              fontSize: 12,
              padding: "6px 8px",
              background: "var(--color-bg-primary)",
              border: "1px solid var(--color-border)",
              borderRadius: 5,
              color: "var(--color-text-primary)",
              outline: "none",
              boxSizing: "border-box",
              fontFamily: "inherit",
              lineHeight: 1.5,
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-accent)"; }}
            onBlurCapture={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; }}
          />
        </label>

        {/* Position */}
        <div style={{ marginBottom: 10 }}>
          <span style={labelStyle}>Position</span>
          <div style={{ display: "flex", gap: 4 }}>
            {POSITIONS.map((p) => (
              <ToggleButton
                key={p}
                active={position === p}
                onClick={() => handlePosition(p)}
              >
                {p}
              </ToggleButton>
            ))}
          </div>
        </div>

        {/* Style */}
        <div style={{ marginBottom: 12 }}>
          <span style={labelStyle}>Style</span>
          <div style={{ display: "flex", gap: 4 }}>
            {STYLES.map((s) => (
              <ToggleButton
                key={s}
                active={style === s}
                onClick={() => handleStyle(s)}
              >
                {s}
              </ToggleButton>
            ))}
          </div>
        </div>

        {/* Clear */}
        {overlay && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              fontSize: 11,
              padding: "4px 10px",
              background: "none",
              border: "1px solid var(--color-border)",
              borderRadius: 5,
              color: "var(--color-text-muted)",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--color-error, #ef4444)";
              e.currentTarget.style.color = "var(--color-error, #ef4444)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--color-border)";
              e.currentTarget.style.color = "var(--color-text-muted)";
            }}
          >
            Clear overlay
          </button>
        )}

        {/* Empty hint */}
        {!overlay && (
          <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: 0, lineHeight: 1.5 }}>
            Type text above and click outside to apply.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--color-text-muted)",
  marginBottom: 4,
};

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        fontSize: 10,
        padding: "4px 0",
        borderRadius: 4,
        border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
        background: active ? "rgba(59,130,246,0.1)" : "none",
        color: active ? "var(--color-accent)" : "var(--color-text-muted)",
        cursor: "pointer",
        fontWeight: active ? 600 : 400,
        textTransform: "capitalize",
      }}
    >
      {children}
    </button>
  );
}
