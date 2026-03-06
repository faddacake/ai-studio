import { Container } from "./Container";

export function Section({
  children,
  id,
  background = "primary",
}: {
  children: React.ReactNode;
  id?: string;
  background?: "primary" | "secondary";
}) {
  return (
    <section
      id={id}
      style={{
        padding: "80px 0",
        backgroundColor:
          background === "secondary"
            ? "var(--color-bg-secondary)"
            : "var(--color-bg-primary)",
      }}
    >
      <Container>{children}</Container>
    </section>
  );
}

export function SectionHeader({
  title,
  subtitle,
  align = "center",
}: {
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <div style={{ textAlign: align, marginBottom: 48 }}>
      <h2
        style={{
          fontSize: "clamp(28px, 4vw, 40px)",
          fontWeight: 800,
          color: "var(--color-text-primary)",
          lineHeight: 1.2,
          marginBottom: subtitle ? 16 : 0,
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          style={{
            fontSize: "clamp(16px, 2vw, 18px)",
            color: "var(--color-text-secondary)",
            maxWidth: 600,
            marginLeft: align === "center" ? "auto" : undefined,
            marginRight: align === "center" ? "auto" : undefined,
            lineHeight: 1.6,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
