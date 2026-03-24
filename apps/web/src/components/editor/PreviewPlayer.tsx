"use client";

import type { AspectRatio, Scene, TextOverlay } from "@/lib/editorProjectTypes";

interface PreviewPlayerProps {
  scene: Scene | null;
  aspectRatio: AspectRatio;
  isPlaying: boolean;
  canPlay: boolean;
  onPlayPause: () => void;
}

// CSS padding-bottom trick: height = 0, padding-bottom = ratio %
const ASPECT_PADDING: Record<AspectRatio, string> = {
  "16:9": "56.25%",
  "9:16": "177.78%",
  "1:1":  "100%",
};

function artifactUrl(path: string): string {
  return `/api/artifacts?path=${encodeURIComponent(path)}`;
}

function overlayTextStyle(style: TextOverlay["style"]): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-block",
    maxWidth: "100%",
    wordBreak: "break-word",
    textAlign: "center",
    lineHeight: 1.4,
  };
  if (style === "title") {
    return {
      ...base,
      fontSize: "clamp(16px, 4%, 28px)",
      fontWeight: 700,
      color: "#fff",
      textShadow: "0 2px 8px rgba(0,0,0,0.8)",
      letterSpacing: "0.01em",
    };
  }
  if (style === "minimal") {
    return {
      ...base,
      fontSize: "clamp(10px, 2.5%, 16px)",
      fontWeight: 400,
      color: "rgba(255,255,255,0.85)",
      textShadow: "0 1px 4px rgba(0,0,0,0.6)",
    };
  }
  // subtitle (default)
  return {
    ...base,
    fontSize: "clamp(12px, 3%, 20px)",
    fontWeight: 600,
    color: "#fff",
    backgroundColor: "rgba(0,0,0,0.55)",
    padding: "4px 12px",
    borderRadius: 4,
  };
}

export function PreviewPlayer({ scene, aspectRatio, isPlaying, canPlay, onPlayPause }: PreviewPlayerProps) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        backgroundColor: "var(--color-bg-primary)",
      }}
    >
      {/* Preview area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          overflow: "auto",
        }}
      >
      {scene ? (
        <div
          style={{
            width: "100%",
            maxWidth: aspectRatio === "9:16" ? 360 : 720,
          }}
        >
          {/* Aspect-ratio container */}
          <div
            style={{
              position: "relative",
              width: "100%",
              paddingBottom: ASPECT_PADDING[aspectRatio],
              backgroundColor: "#000",
              borderRadius: 8,
              overflow: "hidden",
              border: "1px solid var(--color-border)",
            }}
          >
            {scene.type === "video" ? (
              <video
                key={scene.src}
                src={artifactUrl(scene.src)}
                controls
                playsInline
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={scene.src}
                src={artifactUrl(scene.src)}
                alt="Scene preview"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            )}

            {scene.textOverlay && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  ...(scene.textOverlay.position === "top"
                    ? { top: "8%" }
                    : scene.textOverlay.position === "bottom"
                    ? { bottom: "8%" }
                    : { top: "50%", transform: "translateY(-50%)" }),
                  display: "flex",
                  justifyContent: "center",
                  padding: "0 8%",
                  pointerEvents: "none",
                }}
              >
                <span style={overlayTextStyle(scene.textOverlay.style)}>
                  {scene.textOverlay.text}
                </span>
              </div>
            )}
          </div>

          {/* Scene info beneath preview */}
          <div
            style={{
              marginTop: 10,
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 12,
              color: "var(--color-text-muted)",
            }}
          >
            <span
              style={{
                padding: "1px 7px",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                backgroundColor: scene.type === "video"
                  ? "rgba(249,115,22,0.12)"
                  : "rgba(168,85,247,0.12)",
                color: scene.type === "video" ? "#f97316" : "#a855f7",
                border: `1px solid ${scene.type === "video" ? "rgba(249,115,22,0.25)" : "rgba(168,85,247,0.25)"}`,
              }}
            >
              {scene.type}
            </span>
            <span>{scene.duration}s</span>
            {scene.transition && (
              <span style={{ color: "var(--color-text-muted)" }}>
                → {scene.transition}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div
          style={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <svg
            width={40}
            height={40}
            viewBox="0 0 40 40"
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="5" y="8" width="30" height="24" rx="3" />
            <path d="M16 16l8 4-8 4V16z" />
          </svg>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
            Select a scene to preview
          </p>
        </div>
      )}
      </div>

      {/* Playback controls */}
      <div
        style={{
          borderTop: "1px solid var(--color-border)",
          backgroundColor: "var(--color-bg-secondary)",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={onPlayPause}
          disabled={!canPlay}
          title={isPlaying ? "Pause" : "Play"}
          aria-label={isPlaying ? "Pause" : "Play"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 6,
            border: "1px solid var(--color-border)",
            backgroundColor: isPlaying ? "var(--color-accent)" : "var(--color-surface)",
            color: isPlaying ? "#fff" : "var(--color-text-secondary)",
            cursor: canPlay ? "pointer" : "default",
            opacity: canPlay ? 1 : 0.4,
            transition: "background-color 120ms, color 120ms",
          }}
        >
          {isPlaying ? (
            <svg width={12} height={12} viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
              <rect x="2" y="1" width="3" height="10" rx="1" />
              <rect x="7" y="1" width="3" height="10" rx="1" />
            </svg>
          ) : (
            <svg width={12} height={12} viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
              <path d="M3 1.5l7 4.5-7 4.5V1.5z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
