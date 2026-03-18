"use client";

import type { AspectRatio, Scene } from "@/lib/editorProjectTypes";

interface PreviewPlayerProps {
  scene: Scene | null;
  aspectRatio: AspectRatio;
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

export function PreviewPlayer({ scene, aspectRatio }: PreviewPlayerProps) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--color-bg-primary)",
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
            No scenes — add a scene to get started
          </p>
        </div>
      )}
    </div>
  );
}
