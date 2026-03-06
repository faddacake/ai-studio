"use client";

import { memo, useState } from "react";
import type { ModelCategory } from "@/config/models";

interface AdvancedControlsProps {
  category: ModelCategory;
  presetParams?: Record<string, unknown>;
}

export const AdvancedControls = memo(function AdvancedControls({ category, presetParams }: AdvancedControlsProps) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginTop: 12 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "none",
          border: "none",
          color: "var(--color-text-muted)",
          fontSize: 12,
          fontWeight: 500,
          cursor: "pointer",
          padding: "4px 0",
        }}
      >
        <svg
          width={12}
          height={12}
          viewBox="0 0 12 12"
          fill="none"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 150ms" }}
        >
          <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Advanced Controls
      </button>

      {open && (
        <div style={{
          marginTop: 10,
          padding: 16,
          backgroundColor: "var(--color-bg-primary)",
          border: "1px solid var(--color-border)",
          borderRadius: 8,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
        }}>
          {category === "image" && (
            <>
              <ControlField label="Aspect Ratio">
                <select style={selectStyle} defaultValue={(presetParams?.aspectRatio as string) ?? "1:1"}>
                  <option value="1:1">1:1 (Square)</option>
                  <option value="16:9">16:9 (Landscape)</option>
                  <option value="9:16">9:16 (Portrait)</option>
                  <option value="4:3">4:3</option>
                </select>
              </ControlField>
              <ControlField label="Resolution">
                <select style={selectStyle} defaultValue={(presetParams?.resolution as string) ?? "1024"}>
                  <option value="512">512px</option>
                  <option value="768">768px</option>
                  <option value="1024">1024px</option>
                  <option value="1536">1536px</option>
                </select>
              </ControlField>
              <ControlField label="Quality vs Speed">
                <input type="range" min={1} max={3} defaultValue={(presetParams?.quality as number) ?? 2} style={{ width: "100%" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--color-text-muted)" }}>
                  <span>Fast</span><span>Balanced</span><span>Quality</span>
                </div>
              </ControlField>
            </>
          )}
          {category === "video" && (
            <>
              <ControlField label="Duration">
                <select style={selectStyle} defaultValue={(presetParams?.duration as string) ?? "5"}>
                  <option value="3">3 seconds</option>
                  <option value="5">5 seconds</option>
                  <option value="10">10 seconds</option>
                </select>
              </ControlField>
              <ControlField label="Resolution">
                <select style={selectStyle} defaultValue={(presetParams?.resolution as string) ?? "1080p"}>
                  <option value="720p">720p</option>
                  <option value="1080p">1080p</option>
                  <option value="4k">4K</option>
                </select>
              </ControlField>
              <ControlField label="Motion Intensity">
                <input type="range" min={1} max={3} defaultValue={2} style={{ width: "100%" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--color-text-muted)" }}>
                  <span>Subtle</span><span>Normal</span><span>Dynamic</span>
                </div>
              </ControlField>
            </>
          )}
          {category === "voice" && (
            <>
              <ControlField label="Tone">
                <select style={selectStyle} defaultValue={(presetParams?.tone as string) ?? "neutral"}>
                  <option value="neutral">Neutral</option>
                  <option value="warm">Warm</option>
                  <option value="professional">Professional</option>
                  <option value="energetic">Energetic</option>
                </select>
              </ControlField>
              <ControlField label="Speed">
                <input type="range" min={1} max={3} defaultValue={(presetParams?.speed as number) ?? 2} style={{ width: "100%" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--color-text-muted)" }}>
                  <span>Slow</span><span>Normal</span><span>Fast</span>
                </div>
              </ControlField>
              <ControlField label="Format">
                <select style={selectStyle} defaultValue={(presetParams?.format as string) ?? "mp3"}>
                  <option value="mp3">MP3</option>
                  <option value="wav">WAV</option>
                  <option value="ogg">OGG</option>
                </select>
              </ControlField>
            </>
          )}
        </div>
      )}
    </div>
  );
});

function ControlField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 6,
  color: "var(--color-text-primary)",
  fontSize: 13,
  outline: "none",
};
