"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface ProviderConfig {
  id: string;
  validatedAt: string | null;
  createdAt: string;
}

interface ProviderMeta {
  id: string;
  label: string;
  description: string;
  docsUrl: string;
  keyPlaceholder: string;
}

const PROVIDERS: ProviderMeta[] = [
  {
    id: "fal",
    label: "Fal.ai",
    description: "Fast inference for FLUX, Stable Diffusion, and other image/video models.",
    docsUrl: "https://fal.ai/dashboard/keys",
    keyPlaceholder: "fal-...",
  },
  {
    id: "replicate",
    label: "Replicate",
    description: "Run open-source models via API. Supports image, video, audio, and text models.",
    docsUrl: "https://replicate.com/account/api-tokens",
    keyPlaceholder: "r8_...",
  },
  {
    id: "google",
    label: "Google AI",
    description: "Access Imagen and other Google AI models for image generation.",
    docsUrl: "https://aistudio.google.com/app/apikey",
    keyPlaceholder: "AIza...",
  },
];

export default function ProvidersPage() {
  const [configs, setConfigs] = useState<Record<string, ProviderConfig>>({});
  const [loading, setLoading] = useState(true);

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await fetch("/api/providers");
      if (res.ok) {
        const data: ProviderConfig[] = await res.json();
        const map: Record<string, ProviderConfig> = {};
        for (const c of data) map[c.id] = c;
        setConfigs(map);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  return (
    <div style={{ padding: 32, maxWidth: 640 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <Link
          href="/settings"
          style={{ fontSize: 13, color: "var(--color-text-muted)", textDecoration: "none" }}
        >
          ← Settings
        </Link>
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 8 }}>
        AI Providers
      </h1>
      <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 28 }}>
        Add an API key for at least one provider to start generating content. Keys are encrypted at rest with AES-256-GCM.
      </p>

      {loading ? (
        <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>Loading...</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {PROVIDERS.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              config={configs[provider.id] ?? null}
              onSaved={() => fetchConfigs()}
              onRemoved={() => fetchConfigs()}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Provider Card ──

function ProviderCard({
  provider,
  config,
  onSaved,
  onRemoved,
}: {
  provider: ProviderMeta;
  config: ProviderConfig | null;
  onSaved: () => void;
  onRemoved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = config !== null;

  async function handleSave() {
    if (!apiKey.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/providers/${provider.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      if (res.ok) {
        setApiKey("");
        setEditing(false);
        onSaved();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Failed to save — please try again");
      }
    } catch {
      setError("Connection error — please try again");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (removing) return;
    setRemoving(true);
    setError(null);
    try {
      const res = await fetch(`/api/providers/${provider.id}`, { method: "DELETE" });
      if (res.ok) {
        setEditing(false);
        setApiKey("");
        onRemoved();
      } else {
        setError("Failed to remove — please try again");
      }
    } catch {
      setError("Connection error — please try again");
    } finally {
      setRemoving(false);
    }
  }

  function handleCancel() {
    setEditing(false);
    setApiKey("");
    setError(null);
  }

  return (
    <div
      style={{
        padding: 20,
        backgroundColor: "var(--color-surface)",
        border: `1px solid ${isConfigured ? "var(--color-success)" : "var(--color-border)"}`,
        borderRadius: 10,
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)" }}>
            {provider.label}
          </span>
          {isConfigured ? (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
              backgroundColor: "rgba(34,197,94,0.12)", color: "var(--color-success)",
            }}>
              Configured
            </span>
          ) : (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
              backgroundColor: "var(--color-bg-primary)", color: "var(--color-text-muted)",
              border: "1px solid var(--color-border)",
            }}>
              Not configured
            </span>
          )}
        </div>
        <a
          href={provider.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12, color: "var(--color-text-muted)", textDecoration: "none" }}
        >
          Get API key ↗
        </a>
      </div>

      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 12 }}>
        {provider.description}
      </p>

      {/* Error */}
      {error && (
        <div style={{
          marginBottom: 12, padding: "8px 12px", borderRadius: 6,
          backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
          fontSize: 13, color: "var(--color-error)",
        }}>
          {error}
        </div>
      )}

      {/* Key input (shown when adding or editing) */}
      {(!isConfigured || editing) && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={provider.keyPlaceholder}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            style={{
              flex: 1,
              padding: "9px 12px",
              backgroundColor: "var(--color-bg-primary)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              color: "var(--color-text-primary)",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <button
            onClick={handleSave}
            disabled={!apiKey.trim() || saving}
            style={{
              padding: "9px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              backgroundColor: apiKey.trim() ? "var(--color-accent)" : "var(--color-surface-hover)",
              color: apiKey.trim() ? "#fff" : "var(--color-text-muted)",
              cursor: apiKey.trim() ? "pointer" : "default",
              whiteSpace: "nowrap",
            }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
          {editing && (
            <button
              onClick={handleCancel}
              style={{
                padding: "9px 12px",
                borderRadius: 8,
                fontSize: 13,
                border: "1px solid var(--color-border)",
                backgroundColor: "transparent",
                color: "var(--color-text-secondary)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {/* Actions for configured providers */}
      {isConfigured && !editing && (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => { setEditing(true); setError(null); }}
            style={{
              padding: "7px 14px",
              borderRadius: 7,
              fontSize: 13,
              border: "1px solid var(--color-border)",
              backgroundColor: "transparent",
              color: "var(--color-text-secondary)",
              cursor: "pointer",
            }}
          >
            Update Key
          </button>
          <button
            onClick={handleRemove}
            disabled={removing}
            style={{
              padding: "7px 14px",
              borderRadius: 7,
              fontSize: 13,
              border: "1px solid rgba(239,68,68,0.3)",
              backgroundColor: "transparent",
              color: removing ? "var(--color-text-muted)" : "var(--color-error)",
              cursor: removing ? "default" : "pointer",
            }}
          >
            {removing ? "Removing..." : "Remove"}
          </button>
          {config?.validatedAt && (
            <span style={{ fontSize: 12, color: "var(--color-text-muted)", alignSelf: "center", marginLeft: 4 }}>
              Validated {new Date(config.validatedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
