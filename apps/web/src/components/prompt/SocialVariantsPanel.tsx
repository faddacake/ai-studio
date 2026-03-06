"use client";

import { memo, useState, useCallback } from "react";
import {
  PLATFORM_LABELS,
  PLATFORM_IMAGE_SPECS,
  type PlatformId,
  type PlatformVariants,
} from "@/services/socialFormatter";
import type { SocialVariantsStatus } from "@/hooks/useSocialVariants";

const PLATFORMS: PlatformId[] = ["instagram", "tiktok", "x", "linkedin", "youtubeShorts"];

export type PlatformTarget = "auto" | PlatformId;

interface SocialVariantsPanelProps {
  status: SocialVariantsStatus;
  variants: PlatformVariants | null;
  images: Record<string, string> | null;
  error: string | null;
  selectedPlatforms: PlatformTarget;
  onPlatformChange: (target: PlatformTarget) => void;
  onGenerate: () => void;
}

const PLATFORM_TARGETS: { id: PlatformTarget; label: string }[] = [
  { id: "auto", label: "Auto (All)" },
  ...PLATFORMS.map((p) => ({ id: p as PlatformTarget, label: PLATFORM_LABELS[p] })),
];

export const SocialVariantsPanel = memo(function SocialVariantsPanel({
  status,
  variants,
  images,
  error,
  selectedPlatforms,
  onPlatformChange,
  onGenerate,
}: SocialVariantsPanelProps) {
  const [activePlatform, setActivePlatform] = useState<PlatformId>("instagram");
  const visiblePlatforms = selectedPlatforms === "auto" ? PLATFORMS : [selectedPlatforms];

  if (status === "idle") {
    return (
      <div style={{
        padding: 24,
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 12,
        textAlign: "center",
      }}>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 14 }}>
          Generate platform-optimized captions and images for your content.
        </p>
        <button
          onClick={onGenerate}
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
          Generate Social Variants
        </button>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div style={{
        padding: 32,
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 12,
        textAlign: "center",
      }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <Spinner />
          <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
            Generating social variants...
          </span>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={{
        padding: 24,
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 12,
        textAlign: "center",
      }}>
        <p style={{ fontSize: 13, color: "var(--color-error)", marginBottom: 12 }}>
          {error || "Failed to generate social variants."}
        </p>
        <button
          onClick={onGenerate}
          style={{
            padding: "8px 18px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            border: "1px solid var(--color-border)",
            backgroundColor: "transparent",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!variants) return null;

  // Ensure activePlatform is within visible set
  if (!visiblePlatforms.includes(activePlatform)) {
    setActivePlatform(visiblePlatforms[0]);
  }

  return (
    <div style={{
      backgroundColor: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: 12,
      overflow: "hidden",
    }}>
      {/* Platform target selector */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "12px 16px",
        borderBottom: "1px solid var(--color-border)",
        overflowX: "auto",
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginRight: 4, whiteSpace: "nowrap" }}>
          Target
        </span>
        {PLATFORM_TARGETS.map((t) => (
          <button
            key={t.id}
            onClick={() => onPlatformChange(t.id)}
            style={{
              padding: "5px 12px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              border: selectedPlatforms === t.id
                ? "1px solid var(--color-accent)"
                : "1px solid var(--color-border)",
              backgroundColor: selectedPlatforms === t.id
                ? "rgba(59, 130, 246, 0.1)"
                : "transparent",
              color: selectedPlatforms === t.id
                ? "var(--color-accent)"
                : "var(--color-text-secondary)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 100ms ease",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Platform tabs */}
      <div style={{
        display: "flex",
        gap: 0,
        borderBottom: "1px solid var(--color-border)",
        overflowX: "auto",
      }}>
        {visiblePlatforms.map((p) => (
          <button
            key={p}
            onClick={() => setActivePlatform(p)}
            style={{
              padding: "12px 18px",
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              borderBottom: activePlatform === p ? "2px solid var(--color-accent)" : "2px solid transparent",
              backgroundColor: "transparent",
              color: activePlatform === p ? "var(--color-text-primary)" : "var(--color-text-muted)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "color 100ms ease",
            }}
          >
            {PLATFORM_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Active platform content */}
      <div style={{ padding: 20 }}>
        <PlatformCard
          platform={activePlatform}
          variants={variants}
          imageUrl={images?.[activePlatform] ?? null}
        />
      </div>
    </div>
  );
});

// ── Platform Card ──

function PlatformCard({
  platform,
  variants,
  imageUrl,
}: {
  platform: PlatformId;
  variants: PlatformVariants;
  imageUrl: string | null;
}) {
  const spec = PLATFORM_IMAGE_SPECS[platform];
  const variant = variants[platform];

  const caption = "caption" in variant ? variant.caption : "";
  const hashtags = "hashtags" in variant ? (variant as { hashtags: string[] }).hashtags : [];
  const title = "title" in variant ? (variant as { title: string }).title : null;
  const description = "description" in variant ? (variant as { description: string }).description : null;

  return (
    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
      {/* Image preview */}
      {imageUrl && (
        <div style={{ flex: "0 0 auto" }}>
          <div style={{
            width: spec.width > spec.height ? 280 : 160,
            aspectRatio: `${spec.width} / ${spec.height}`,
            maxHeight: 280,
            borderRadius: 8,
            overflow: "hidden",
            backgroundColor: "var(--color-bg-primary)",
            border: "1px solid var(--color-border)",
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={`${PLATFORM_LABELS[platform]} format`}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
              {spec.aspectRatio} ({spec.width}x{spec.height})
            </span>
            <DownloadButton url={imageUrl} platform={platform} />
          </div>
        </div>
      )}

      {/* Caption content */}
      <div style={{ flex: 1, minWidth: 240 }}>
        {title && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Title
            </label>
            <CopyableBlock text={title} />
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {description ? "Description" : "Caption"}
          </label>
          <CopyableBlock text={description || caption} />
        </div>

        {hashtags.length > 0 && (
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Hashtags ({hashtags.length})
            </label>
            <CopyableBlock text={hashtags.join(" ")} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Copyable Text Block ──

function CopyableBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <div style={{
      position: "relative",
      marginTop: 4,
      padding: "10px 12px",
      paddingRight: 60,
      backgroundColor: "var(--color-bg-primary)",
      border: "1px solid var(--color-border)",
      borderRadius: 8,
      fontSize: 13,
      lineHeight: 1.6,
      color: "var(--color-text-primary)",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      maxHeight: 200,
      overflowY: "auto",
    }}>
      {text}
      <button
        onClick={handleCopy}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          fontSize: 11,
          fontWeight: 600,
          padding: "4px 10px",
          borderRadius: 5,
          border: "1px solid var(--color-border)",
          backgroundColor: copied ? "rgba(34,197,94,0.12)" : "var(--color-surface)",
          color: copied ? "var(--color-success)" : "var(--color-text-secondary)",
          cursor: "pointer",
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

// ── Download Button ──

function DownloadButton({ url, platform }: { url: string; platform: PlatformId }) {
  const handleDownload = useCallback(() => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `${platform}-image.png`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [url, platform]);

  return (
    <button
      onClick={handleDownload}
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 8px",
        borderRadius: 5,
        border: "1px solid var(--color-border)",
        backgroundColor: "transparent",
        color: "var(--color-text-secondary)",
        cursor: "pointer",
      }}
    >
      Download
    </button>
  );
}

// ── Spinner ──

function Spinner() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}>
      <circle cx={12} cy={12} r={10} stroke="var(--color-border)" strokeWidth={3} />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--color-accent)" strokeWidth={3} strokeLinecap="round" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}
