"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadCanvasData, saveCanvasData, type CanvasData } from "@/hooks/useCanvasStore";
import { useExportBundle } from "@/hooks/useExportBundle";
import { useLicenseTier } from "@/hooks/useLicenseTier";
import type { PlatformVariants, PlatformId } from "@/services/socialFormatter";

const PLATFORM_LABELS: Record<PlatformId, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X",
  linkedin: "LinkedIn",
  youtubeShorts: "YouTube Shorts",
};

const PLATFORM_IDS: PlatformId[] = ["instagram", "tiktok", "x", "linkedin", "youtubeShorts"];

export default function CanvasClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workflowId = searchParams.get("workflow");
  const exporter = useExportBundle();
  const { tier } = useLicenseTier();
  const [data, setData] = useState<CanvasData | null>(null);
  const [variants, setVariants] = useState<PlatformVariants | null>(null);
  const [dirty, setDirty] = useState(false);

  // Load from sessionStorage on mount, or fetch from workflow API if param present
  useEffect(() => {
    const raw = sessionStorage.getItem("ai-studio:canvas");
    if (process.env.NODE_ENV !== "production") {
      console.log("[Canvas] storage bytes", raw?.length ?? 0);
      console.log("[Canvas] workflow param", workflowId);
    }

    const loaded = loadCanvasData();
    if (process.env.NODE_ENV !== "production") {
      console.log("[Canvas] loaded", { hasData: !!loaded, hasVariants: !!(loaded?.variants) });
    }

    if (loaded && loaded.variants) {
      setData(loaded);
      setVariants(loaded.variants);
      return;
    }

    if (loaded && loaded.prompt) {
      // Data exists but variants are missing — build fallback
      if (process.env.NODE_ENV !== "production") {
        console.log("[Canvas] variants missing, building fallback from prompt");
      }
      const fallbackVariants = buildFallbackVariants(loaded.prompt);
      const fixed = { ...loaded, variants: fallbackVariants };
      saveCanvasData(fixed);
      setData(fixed);
      setVariants(fallbackVariants);
      return;
    }

    // No sessionStorage data — try workflow param
    if (workflowId) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[Canvas] no storage, fetching workflow", workflowId);
      }
      fetch(`/api/workflows/${workflowId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((wf) => {
          if (!wf) return;
          const promptText = wf.prompt || wf.caption || wf.name || wf.topic || "Untitled";
          const topic = wf.topic || promptText.split(/\s+/).slice(0, 5).join(" ");
          const fallbackVariants = buildFallbackVariants(promptText);
          const canvasData: CanvasData = {
            prompt: promptText,
            topic,
            imageUrl: wf.imageUrl || "",
            modelName: wf.modelName || "AI Model",
            variants: fallbackVariants,
          };
          saveCanvasData(canvasData);
          setData(canvasData);
          setVariants(fallbackVariants);
        })
        .catch(() => { /* workflow fetch failed — empty state will show */ });
    }
  }, [workflowId]);

  // Persist edits back to sessionStorage so prompt page can pick them up
  const handleSave = useCallback(() => {
    if (!data || !variants) return;
    const updated = { ...data, variants };
    saveCanvasData(updated);
    setData(updated);
    setDirty(false);
  }, [data, variants]);

  const handleExport = useCallback(() => {
    if (!data || !variants) return;
    exporter.exportCampaign({
      prompt: data.prompt,
      imageUrl: data.imageUrl,
      topic: data.topic,
      modelName: data.modelName,
      editedVariants: variants,
    });
  }, [data, variants, exporter]);

  // Caption/text updaters per platform
  const updateCaption = useCallback((platform: PlatformId, value: string) => {
    setVariants((prev) => {
      if (!prev) return prev;
      if (platform === "youtubeShorts") return prev; // handled separately
      return {
        ...prev,
        [platform]: { ...prev[platform], caption: value },
      };
    });
    setDirty(true);
  }, []);

  const updateHashtags = useCallback((platform: PlatformId, value: string) => {
    setVariants((prev) => {
      if (!prev) return prev;
      const entry = prev[platform];
      if (!("hashtags" in entry)) return prev;
      return {
        ...prev,
        [platform]: { ...entry, hashtags: value.split(/\s+/).filter(Boolean) },
      };
    });
    setDirty(true);
  }, []);

  const updateYouTubeField = useCallback((field: "title" | "description", value: string) => {
    setVariants((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        youtubeShorts: { ...prev.youtubeShorts, [field]: value },
      };
    });
    setDirty(true);
  }, []);

  // ── Empty state ──
  if (!data || !variants) {
    return (
      <div style={{ padding: "28px 32px", maxWidth: 1100, marginLeft: "auto", marginRight: "auto" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.02em", marginBottom: 4 }}>
          Canvas Editor
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 24 }}>
          Edit your generated variants before exporting.
        </p>
        <div style={{
          padding: 40,
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 14,
          textAlign: "center",
        }}>
          <p style={{ fontSize: 15, color: "var(--color-text-secondary)", marginBottom: 16 }}>
            No variants to edit. Generate content in Prompt Studio first.
          </p>
          <button
            onClick={() => router.push("/prompt")}
            style={{
              padding: "10px 22px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              border: "none",
              backgroundColor: "var(--color-accent)",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Go to Prompt Studio
          </button>
        </div>
      </div>
    );
  }

  const isExporting = exporter.status === "preparing" || exporter.status === "fetching-images" || exporter.status === "building-zip";

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, marginLeft: "auto", marginRight: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.02em", marginBottom: 4 }}>
            Canvas Editor
          </h1>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
            Edit your generated variants before exporting.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {dirty && (
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 6,
              backgroundColor: "rgba(234,179,8,0.12)",
              color: "var(--color-warning)",
            }}>
              Unsaved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={!dirty}
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: "1px solid var(--color-border)",
              backgroundColor: "transparent",
              color: dirty ? "var(--color-text-secondary)" : "var(--color-text-muted)",
              cursor: dirty ? "pointer" : "default",
            }}
          >
            Save
          </button>
          <ExportButtonInline
            status={exporter.status}
            progress={exporter.progress}
            error={exporter.error}
            isFree={tier === "free"}
            onExport={handleExport}
            onReset={exporter.reset}
            disabled={isExporting}
          />
        </div>
      </div>

      {/* Context bar */}
      <div style={{
        padding: "12px 16px",
        backgroundColor: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: 10,
        marginBottom: 20,
        display: "flex",
        gap: 24,
        fontSize: 13,
        color: "var(--color-text-secondary)",
        flexWrap: "wrap",
      }}>
        <span><strong style={{ color: "var(--color-text-primary)" }}>Prompt:</strong> {data.prompt.length > 80 ? data.prompt.slice(0, 80) + "..." : data.prompt}</span>
        <span><strong style={{ color: "var(--color-text-primary)" }}>Model:</strong> {data.modelName}</span>
      </div>

      {/* Platform editors */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {PLATFORM_IDS.map((platform) => (
          <PlatformEditor
            key={platform}
            platform={platform}
            variant={variants[platform]}
            onCaptionChange={(v) => updateCaption(platform, v)}
            onHashtagsChange={(v) => updateHashtags(platform, v)}
            onYouTubeFieldChange={platform === "youtubeShorts" ? updateYouTubeField : undefined}
          />
        ))}
      </div>
    </div>
  );
}

// ── Platform Editor Card ──

function PlatformEditor({
  platform,
  variant,
  onCaptionChange,
  onHashtagsChange,
  onYouTubeFieldChange,
}: {
  platform: PlatformId;
  variant: PlatformVariants[PlatformId];
  onCaptionChange: (v: string) => void;
  onHashtagsChange: (v: string) => void;
  onYouTubeFieldChange?: (field: "title" | "description", v: string) => void;
}) {
  const isYouTube = platform === "youtubeShorts";
  const ytVariant = isYouTube ? (variant as PlatformVariants["youtubeShorts"]) : null;
  const hasHashtags = "hashtags" in variant && Array.isArray((variant as { hashtags?: string[] }).hashtags);
  const hashtags = hasHashtags ? (variant as { hashtags: string[] }).hashtags : null;

  return (
    <div style={{
      padding: 20,
      backgroundColor: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
          {PLATFORM_LABELS[platform]}
        </h3>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          padding: "2px 6px",
          borderRadius: 4,
          backgroundColor: "rgba(59,130,246,0.12)",
          color: "var(--color-accent)",
          textTransform: "uppercase",
        }}>
          {platform}
        </span>
      </div>

      {isYouTube && ytVariant ? (
        <>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 6 }}>
            Title
          </label>
          <input
            value={ytVariant.title}
            onChange={(e) => onYouTubeFieldChange?.("title", e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              backgroundColor: "var(--color-bg-primary)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              color: "var(--color-text-primary)",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
              marginBottom: 12,
            }}
          />
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 6 }}>
            Description
          </label>
          <textarea
            value={ytVariant.description}
            onChange={(e) => onYouTubeFieldChange?.("description", e.target.value)}
            rows={4}
            style={{
              width: "100%",
              padding: "10px 12px",
              backgroundColor: "var(--color-bg-primary)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              color: "var(--color-text-primary)",
              fontSize: 14,
              lineHeight: 1.6,
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </>
      ) : (
        <>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 6 }}>
            Caption
          </label>
          <textarea
            value={(variant as { caption: string }).caption}
            onChange={(e) => onCaptionChange(e.target.value)}
            rows={3}
            style={{
              width: "100%",
              padding: "10px 12px",
              backgroundColor: "var(--color-bg-primary)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              color: "var(--color-text-primary)",
              fontSize: 14,
              lineHeight: 1.6,
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </>
      )}

      {hashtags !== null && (
        <div style={{ marginTop: 12 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 6 }}>
            Hashtags
          </label>
          <input
            value={hashtags.join(" ")}
            onChange={(e) => onHashtagsChange(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              backgroundColor: "var(--color-bg-primary)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              color: "var(--color-text-primary)",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
            }}
            placeholder="#hashtag1 #hashtag2"
          />
        </div>
      )}
    </div>
  );
}

// ── Inline Export Button (reuses same status patterns as ExportButton) ──

function ExportButtonInline({
  status,
  progress,
  error,
  isFree,
  onExport,
  onReset,
  disabled,
}: {
  status: string;
  progress: string;
  error: string | null;
  isFree: boolean;
  onExport: () => void;
  onReset: () => void;
  disabled: boolean;
}) {
  if (status === "error") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, color: "var(--color-error)" }}>{error || "Export failed"}</span>
        <button
          onClick={onReset}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            border: "1px solid var(--color-border)",
            backgroundColor: "transparent",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
          }}
        >
          Dismiss
        </button>
      </div>
    );
  }

  if (status === "ready") {
    return (
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 16px",
        borderRadius: 8,
        backgroundColor: "rgba(34,197,94,0.10)",
        fontSize: 13,
        fontWeight: 600,
        color: "var(--color-success)",
      }}>
        Download ready
      </div>
    );
  }

  const isWorking = status === "preparing" || status === "fetching-images" || status === "building-zip";

  if (isWorking) {
    return (
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 16px",
        borderRadius: 8,
        backgroundColor: "rgba(59,130,246,0.08)",
        fontSize: 13,
        fontWeight: 600,
        color: "var(--color-accent)",
      }}>
        {progress}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button
        onClick={onExport}
        disabled={disabled}
        style={{
          padding: "10px 22px",
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          border: "none",
          backgroundColor: disabled ? "var(--color-surface-hover)" : "var(--color-accent)",
          color: disabled ? "var(--color-text-muted)" : "#fff",
          cursor: disabled ? "default" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        Export Campaign
      </button>
      {isFree && (
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          padding: "2px 6px",
          borderRadius: 4,
          backgroundColor: "rgba(234,179,8,0.12)",
          color: "var(--color-warning)",
        }}>
          Watermarked
        </span>
      )}
    </div>
  );
}

/** Build minimal variants from prompt text so Canvas never loads empty. */
function buildFallbackVariants(caption: string): PlatformVariants {
  return {
    instagram: { caption, hashtags: [] },
    tiktok: { caption, hashtags: [] },
    x: { caption },
    linkedin: { caption },
    youtubeShorts: { title: caption.slice(0, 100), description: caption, hashtags: [] },
  };
}
