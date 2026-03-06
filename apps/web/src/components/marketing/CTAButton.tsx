import Link from "next/link";

export function CTAButton({
  href,
  children,
  variant = "primary",
  size = "md",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: { padding: "8px 16px", fontSize: 13 },
    md: { padding: "12px 24px", fontSize: 14 },
    lg: { padding: "16px 32px", fontSize: 16 },
  };

  const variants = {
    primary: {
      backgroundColor: "var(--color-accent)",
      color: "#fff",
      border: "none",
    },
    secondary: {
      backgroundColor: "transparent",
      color: "var(--color-text-primary)",
      border: "1px solid var(--color-border)",
    },
    ghost: {
      backgroundColor: "transparent",
      color: "var(--color-text-secondary)",
      border: "none",
    },
  };

  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderRadius: 8,
        fontWeight: 600,
        textDecoration: "none",
        transition: "opacity 150ms ease, transform 150ms ease",
        whiteSpace: "nowrap",
        ...sizes[size],
        ...variants[variant],
      }}
    >
      {children}
    </Link>
  );
}
