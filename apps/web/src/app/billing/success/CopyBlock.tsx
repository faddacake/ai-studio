"use client";

import { useState } from "react";

export function CopyBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      style={{
        position: "relative",
        backgroundColor: "var(--color-bg-primary)",
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        padding: "12px 48px 12px 16px",
        fontFamily: "monospace",
        fontSize: 13,
        color: "var(--color-text-primary)",
        overflowX: "auto",
        wordBreak: "break-all",
      }}
    >
      {code}
      <button
        onClick={handleCopy}
        aria-label="Copy to clipboard"
        style={{
          position: "absolute",
          right: 8,
          top: 8,
          background: "none",
          border: "none",
          color: copied ? "var(--color-success)" : "var(--color-text-muted)",
          cursor: "pointer",
          padding: 4,
        }}
      >
        {copied ? (
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth={2} />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth={2} />
          </svg>
        )}
      </button>
    </div>
  );
}
