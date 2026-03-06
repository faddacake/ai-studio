import { CTAButton } from "./CTAButton";

export function PricingCard({
  name,
  price,
  period,
  description,
  features,
  ctaText,
  ctaHref,
  highlighted = false,
  badge,
}: {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  ctaText: string;
  ctaHref: string;
  highlighted?: boolean;
  badge?: string;
}) {
  return (
    <div
      style={{
        padding: 32,
        backgroundColor: "var(--color-surface)",
        border: highlighted
          ? "2px solid var(--color-accent)"
          : "1px solid var(--color-border)",
        borderRadius: 16,
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {badge && (
        <span
          style={{
            position: "absolute",
            top: -12,
            left: 24,
            backgroundColor: "var(--color-accent)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            padding: "4px 12px",
            borderRadius: 20,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {badge}
        </span>
      )}
      <h3
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: "var(--color-text-primary)",
          marginBottom: 8,
        }}
      >
        {name}
      </h3>
      <p
        style={{
          fontSize: 14,
          color: "var(--color-text-secondary)",
          marginBottom: 20,
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
      <div style={{ marginBottom: 24 }}>
        <span
          style={{
            fontSize: 40,
            fontWeight: 800,
            color: "var(--color-text-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          {price}
        </span>
        {period && (
          <span
            style={{
              fontSize: 14,
              color: "var(--color-text-muted)",
              marginLeft: 4,
            }}
          >
            {period}
          </span>
        )}
      </div>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          marginBottom: 32,
          flex: 1,
        }}
      >
        {features.map((f, i) => (
          <li
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "8px 0",
              fontSize: 14,
              color: "var(--color-text-secondary)",
              lineHeight: 1.5,
            }}
          >
            <svg
              width={16}
              height={16}
              viewBox="0 0 16 16"
              fill="none"
              style={{ marginTop: 2, flexShrink: 0 }}
            >
              <path
                d="M3 8.5L6.5 12L13 4"
                stroke="var(--color-success)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {f}
          </li>
        ))}
      </ul>
      <CTAButton
        href={ctaHref}
        variant={highlighted ? "primary" : "secondary"}
        size="md"
      >
        {ctaText}
      </CTAButton>
    </div>
  );
}
