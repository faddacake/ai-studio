import type { Metadata } from "next";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Container } from "@/components/marketing/Container";
import { SectionHeader } from "@/components/marketing/Section";
import { PricingCard } from "@/components/marketing/PricingCard";
import { FAQ } from "@/components/marketing/FAQ";

export const metadata: Metadata = {
  title: "Pricing — AI Studio",
  description:
    "One-time license purchase. No subscriptions. Run AI Studio on your own hardware with full privacy and control.",
};

export default function PricingPage() {
  const stripeEnabled = process.env.STRIPE_ENABLED === "true";

  return (
    <MarketingLayout>
      <section style={{ padding: "80px 0 40px" }}>
        <Container>
          <SectionHeader
            title="Simple, one-time pricing"
            subtitle="Buy a license, install with Docker, own your AI workflow studio forever. No subscriptions."
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 24,
              maxWidth: 740,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            <PricingCard
              name="Personal"
              price="$49"
              description="Single-user license for creators and solo entrepreneurs."
              highlighted
              badge="Most Popular"
              features={[
                "Unlimited workflows",
                "All node types (image, video, text)",
                "Multi-model comparison",
                "Budget caps & cost tracking",
                "Run history & replay",
                "Visual canvas editor",
                "Encrypted key storage",
                "Lifetime updates (current major version)",
              ]}
              ctaText={stripeEnabled ? "Buy Now" : "Buy License"}
              ctaHref={stripeEnabled ? "/api/billing/checkout" : "/docs"}
            />
            <PricingCard
              name="Team"
              price="TBD"
              period=""
              description="Multi-user license with shared workflows and access controls."
              features={[
                "Everything in Personal",
                "Multiple user accounts",
                "Shared workflow library",
                "Role-based access",
                "Audit logs",
                "Priority support",
              ]}
              ctaText="Join Waitlist"
              ctaHref="/docs"
            />
          </div>
        </Container>
      </section>

      {/* What's included */}
      <section
        style={{
          padding: "60px 0",
          backgroundColor: "var(--color-bg-secondary)",
        }}
      >
        <Container>
          <div style={{ maxWidth: 640, marginLeft: "auto", marginRight: "auto" }}>
            <h2
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "var(--color-text-primary)",
                marginBottom: 24,
                textAlign: "center",
              }}
            >
              What you get
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 16,
              }}
            >
              {[
                { label: "Offline license key", detail: "Ed25519 signed token — validates locally, no phone-home" },
                { label: "Docker deployment", detail: "One compose file, two containers. Runs anywhere Docker runs." },
                { label: "All current features", detail: "Canvas editor, multi-model comparison, cost controls, run history" },
                { label: "Lifetime updates", detail: "Free updates for the current major version. No expiry on your license." },
              ].map(({ label, detail }) => (
                <div
                  key={label}
                  style={{
                    padding: 16,
                    backgroundColor: "var(--color-surface)",
                    borderRadius: 10,
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 4 }}>
                    {label}
                  </h3>
                  <p style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                    {detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section style={{ padding: "60px 0" }}>
        <Container>
          <div style={{ maxWidth: 640, marginLeft: "auto", marginRight: "auto" }}>
            <h2
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "var(--color-text-primary)",
                marginBottom: 24,
                textAlign: "center",
              }}
            >
              Pricing FAQ
            </h2>
            <FAQ
              items={[
                {
                  question: "Is this a subscription?",
                  answer: "No. You pay once and get a license key. There are no recurring charges. You only pay AI providers (Replicate, Fal, etc.) for the API calls you make.",
                },
                {
                  question: "What happens after I buy?",
                  answer: "You receive a LICENSE_KEY — an Ed25519 signed token. Add it to your Docker environment, and the app validates it locally. No account or internet connection needed.",
                },
                {
                  question: "Can I use it on multiple machines?",
                  answer: "The Personal license is for a single instance. You can move it between machines, but only run one active instance at a time.",
                },
                {
                  question: "What about updates?",
                  answer: "Your license includes free updates for the current major version. Pull the latest Docker image and restart — your data persists in the volume.",
                },
                {
                  question: "Do you offer refunds?",
                  answer: "Yes. If AI Studio doesn't work for your use case, contact us within 14 days of purchase for a full refund.",
                },
              ]}
            />
          </div>
        </Container>
      </section>
    </MarketingLayout>
  );
}
