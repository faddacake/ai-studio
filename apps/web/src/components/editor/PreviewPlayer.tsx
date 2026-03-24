"use client";

import { useState, useEffect, useRef } from "react";
import type { AspectRatio, Scene, TextOverlay } from "@/lib/editorProjectTypes";
import { computeFadeProgress } from "@/lib/sceneTiming";
import type { RenderPlan } from "@/lib/renderPlan";

interface PreviewPlayerProps {
  scene: Scene | null;
  scenes: Scene[];
  plan: RenderPlan;
  playIndex: number;
  playEpoch: number;
  seekOffsetMs: number;
  isScrubbing: boolean;
  aspectRatio: AspectRatio;
  isPlaying: boolean;
  canPlay: boolean;
  onPlayPause: () => void;
  onSeek: (targetMs: number) => void;
  onScrubStart: () => void;
  onScrubEnd: () => void;
  isLooping: boolean;
  onToggleLoop: () => void;
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


const MEDIA_STYLE: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "contain",
  display: "block",
};

function renderSceneLayer(s: Scene) {
  return (
    <>
      {s.type === "video" ? (
        <video
          key={s.src}
          src={artifactUrl(s.src)}
          muted
          playsInline
          style={MEDIA_STYLE}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={s.src}
          src={artifactUrl(s.src)}
          alt="Scene preview"
          style={MEDIA_STYLE}
        />
      )}
      {s.textOverlay && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            ...(s.textOverlay.position === "top"
              ? { top: "8%" }
              : s.textOverlay.position === "bottom"
              ? { bottom: "8%" }
              : { top: "50%", transform: "translateY(-50%)" }),
            display: "flex",
            justifyContent: "center",
            padding: "0 8%",
            pointerEvents: "none",
          }}
        >
          <span style={overlayTextStyle(s.textOverlay.style)}>{s.textOverlay.text}</span>
        </div>
      )}
    </>
  );
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

export function PreviewPlayer({ scene, scenes, plan, playIndex, playEpoch, seekOffsetMs, isScrubbing, aspectRatio, isPlaying, canPlay, onPlayPause, onSeek, onScrubStart, onScrubEnd, isLooping, onToggleLoop }: PreviewPlayerProps) {
  // ── Progress tracking ────────────────────────────────────────────────────
  const [sceneElapsedMs, setSceneElapsedMs] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);
  // Keep a ref so the playEpoch effect always reads the latest seekOffsetMs
  const seekOffsetMsRef = useRef(seekOffsetMs);
  seekOffsetMsRef.current = seekOffsetMs;
  // Local ref tracks whether a pointer drag is in progress (avoids relying on React state for event gating)
  const isDraggingRef = useRef(false);

  // Reset scene-elapsed clock when a new scene epoch starts (play, advance, loop, seek)
  useEffect(() => {
    setSceneElapsedMs(seekOffsetMsRef.current);
    lastTickRef.current = null;
  }, [playEpoch]);

  // RAF loop — runs only while playing and not scrubbing; local to PreviewPlayer only
  useEffect(() => {
    if (!isPlaying || isScrubbing) {
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      lastTickRef.current = null;
      return;
    }
    function tick(now: number) {
      if (lastTickRef.current !== null) {
        const delta = now - lastTickRef.current;
        setSceneElapsedMs((prev) => prev + delta);
      }
      lastTickRef.current = now;
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  }, [isPlaying, isScrubbing]);

  // Derived progress values — resolved from pre-computed plan entries (O(1) lookups)
  const activePlanEntry = plan.scenes[playIndex];
  const priorMs = activePlanEntry?.startMs ?? 0;
  const currentSceneDurationMs = activePlanEntry?.durationMs ?? 0;
  const elapsedMs = priorMs + Math.min(sceneElapsedMs, currentSceneDurationMs);
  const totalMs = plan.totalDurationMs;
  const progress = totalMs > 0 ? Math.min(elapsedMs / totalMs, 1) : 0;

  // Active-scene segment bounds as percentages
  const activeStartPct = totalMs > 0 ? (priorMs / totalMs) * 100 : 0;
  const activeEndPct   = totalMs > 0 ? (Math.min(priorMs + currentSceneDurationMs, totalMs) / totalMs) * 100 : 0;

  // Scene-boundary tick positions as percentages (skip 0 % — that's the bar start)
  const tickPcts: number[] = [];
  if (totalMs > 0 && plan.scenes.length > 1) {
    for (let i = 0; i < plan.scenes.length - 1; i++) {
      tickPcts.push((plan.scenes[i]!.endMs / totalMs) * 100);
    }
  }

  // Fade-transition progress (0 = no fade / cut; 1 = fully on next scene)
  const nextScene = scenes[playIndex + 1] ?? null;
  const currentScene = scenes[playIndex] ?? null;
  const fadeProgress = currentScene
    ? computeFadeProgress(currentScene, nextScene !== null, sceneElapsedMs)
    : 0;

  // ── Scrub helper ─────────────────────────────────────────────────────────
  function seekFromPointer(e: React.PointerEvent<HTMLDivElement>) {
    if (!canPlay || totalMs === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
    onSeek(fraction * totalMs);
  }
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
            {/* Outgoing (current) scene — fades out when transition === "fade" */}
            <div style={{ position: "absolute", inset: 0, opacity: 1 - fadeProgress }}>
              {renderSceneLayer(scene)}
            </div>
            {/* Incoming (next) scene — rendered only during a fade */}
            {fadeProgress > 0 && nextScene && (
              <div style={{ position: "absolute", inset: 0, opacity: fadeProgress }}>
                {renderSceneLayer(nextScene)}
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
          flexShrink: 0,
        }}
      >
        {/* Progress bar — 12 px hit area, 3 px visual track, drag-to-scrub */}
        <div
          aria-label="Seek"
          onPointerDown={(e) => {
            if (!canPlay || totalMs === 0) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            isDraggingRef.current = true;
            onScrubStart();
            seekFromPointer(e);
          }}
          onPointerMove={(e) => {
            if (!isDraggingRef.current) return;
            seekFromPointer(e);
          }}
          onPointerUp={(e) => {
            if (!isDraggingRef.current) return;
            isDraggingRef.current = false;
            seekFromPointer(e);
            onScrubEnd();
          }}
          onPointerCancel={() => {
            if (!isDraggingRef.current) return;
            isDraggingRef.current = false;
            onScrubEnd();
          }}
          style={{
            height: 12,
            display: "flex",
            alignItems: "center",
            cursor: canPlay ? "pointer" : "default",
            position: "relative",
            touchAction: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: 3,
              backgroundColor: "var(--color-border)",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress * 100}%`,
                backgroundColor: "var(--color-accent)",
              }}
            />
            {activeEndPct > activeStartPct && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: `${activeStartPct}%`,
                  width: `${activeEndPct - activeStartPct}%`,
                  backgroundColor: "var(--color-accent)",
                  opacity: 0.25,
                  pointerEvents: "none",
                }}
              />
            )}
            {tickPcts.map((pct) => (
              <div
                key={pct}
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: `${pct}%`,
                  width: 1,
                  backgroundColor: "var(--color-bg-secondary)",
                  opacity: 0.7,
                }}
              />
            ))}
          </div>
        </div>

        {/* Button row */}
        <div style={{ padding: "6px 12px", display: "flex", alignItems: "center", gap: 8 }}>
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

        <button
          type="button"
          onClick={onToggleLoop}
          title={isLooping ? "Loop on" : "Loop off"}
          aria-label={isLooping ? "Disable loop" : "Enable loop"}
          aria-pressed={isLooping}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 6,
            border: `1px solid ${isLooping ? "var(--color-accent)" : "var(--color-border)"}`,
            backgroundColor: isLooping ? "rgba(59,130,246,0.10)" : "transparent",
            color: isLooping ? "var(--color-accent)" : "var(--color-text-muted)",
            cursor: "pointer",
            transition: "border-color 120ms, color 120ms, background-color 120ms",
          }}
        >
          <svg width={12} height={12} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M1 5A4 4 0 0 1 8.5 2L10 2" />
            <path d="M8 1l2 1-2 1" />
            <path d="M11 7A4 4 0 0 1 3.5 10L2 10" />
            <path d="M4 11l-2-1 2-1" />
          </svg>
        </button>

          <div style={{ flex: 1 }} />

          {scenes.length > 0 && (
            <span
              style={{
                fontSize: 10,
                color: "var(--color-text-muted)",
                flexShrink: 0,
              }}
            >
              Scene {playIndex + 1} / {scenes.length}
            </span>
          )}

          <span
            style={{
              fontSize: 10,
              color: "var(--color-text-muted)",
              fontVariantNumeric: "tabular-nums",
              flexShrink: 0,
            }}
          >
            {formatTime(elapsedMs)} / {formatTime(totalMs)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}:${String(s % 60).padStart(2, "0")}` : `${s}s`;
}
