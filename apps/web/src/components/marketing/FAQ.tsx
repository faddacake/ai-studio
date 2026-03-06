"use client";

import { useState } from "react";

export function FAQ({
  items,
}: {
  items: { question: string; answer: string }[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {items.map((item, i) => (
        <FAQItem key={i} question={item.question} answer={item.answer} />
      ))}
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "20px 0",
          background: "none",
          border: "none",
          color: "var(--color-text-primary)",
          fontSize: 15,
          fontWeight: 600,
          cursor: "pointer",
          textAlign: "left",
          gap: 16,
        }}
      >
        {question}
        <svg
          width={16}
          height={16}
          viewBox="0 0 16 16"
          fill="none"
          style={{
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 200ms ease",
          }}
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <p
          style={{
            padding: "0 0 20px 0",
            fontSize: 14,
            color: "var(--color-text-secondary)",
            lineHeight: 1.7,
          }}
        >
          {answer}
        </p>
      )}
    </div>
  );
}
