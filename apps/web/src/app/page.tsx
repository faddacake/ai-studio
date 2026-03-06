import type { Metadata } from "next";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Container } from "@/components/marketing/Container";
import { Section, SectionHeader } from "@/components/marketing/Section";
import { CTAButton } from "@/components/marketing/CTAButton";
import { FeatureGrid, FeatureCard } from "@/components/marketing/FeatureGrid";
import { Steps } from "@/components/marketing/Steps";
import { FAQ } from "@/components/marketing/FAQ";

export const metadata: Metadata = {
  title: "AI Studio — Self-Hosted AI Workflow Builder",
  description:
    "Build AI workflows, run multi-model comparisons, control costs, and generate assets locally. One Docker container, your API keys, full privacy.",
  openGraph: {
    title: "AI Studio — Self-Hosted AI Workflow Builder",
    description:
      "Build AI workflows, run multi-model comparisons, control costs, and generate assets locally.",
    type: "website",
  },
};

export default function LandingPage() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section
        style={{
          padding: "100px 0 80px",
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(59, 130, 246, 0.08) 0%, transparent 60%)",
        }}
      >
        <Container>
          <div style={{ maxWidth: 720, marginLeft: "auto", marginRight: "auto", textAlign: "center" }}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--color-accent)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 16,
              }}
            >
              Self-Hosted &middot; Open Infrastructure &middot; Your Keys
            </p>
            <h1
              style={{
                fontSize: "clamp(36px, 6vw, 60px)",
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
                color: "var(--color-text-primary)",
                marginBottom: 20,
              }}
            >
              Your AI workflow studio.
              <br />
              <span style={{ color: "var(--color-accent)" }}>Run locally. Own everything.</span>
            </h1>
            <p
              style={{
                fontSize: "clamp(16px, 2.5vw, 20px)",
                color: "var(--color-text-secondary)",
                lineHeight: 1.6,
                marginBottom: 36,
                maxWidth: 560,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              Build workflows, run multi-model comparisons, keep costs controlled, and generate assets
              &mdash; all from a single Docker container with your own API keys.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <CTAButton href="/pricing" variant="primary" size="lg">
                Buy License
              </CTAButton>
              <CTAButton href="/docs" variant="secondary" size="lg">
                Install Guide
              </CTAButton>
            </div>
          </div>
        </Container>
      </section>

      {/* Social proof / stats bar */}
      <Section background="secondary">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 32,
            textAlign: "center",
          }}
        >
          {[
            { stat: "1 Container", label: "Docker deploy" },
            { stat: "0 Cloud Lock-in", label: "Your keys, your data" },
            { stat: "Parallel", label: "Multi-model runs" },
            { stat: "Real-time", label: "Cost tracking" },
          ].map(({ stat, label }) => (
            <div key={label}>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: "var(--color-text-primary)",
                  letterSpacing: "-0.02em",
                  marginBottom: 4,
                }}
              >
                {stat}
              </div>
              <div style={{ fontSize: 14, color: "var(--color-text-muted)" }}>{label}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* How it works */}
      <Section>
        <SectionHeader
          title="Up and running in 5 steps"
          subtitle="From purchase to generating your first assets in under 10 minutes."
        />
        <div style={{ maxWidth: 600, marginLeft: "auto", marginRight: "auto" }}>
          <Steps
            items={[
              {
                title: "Buy a license",
                description:
                  "One-time purchase. You get an offline license key that validates locally — no phone-home, no subscription lock.",
              },
              {
                title: "Run Docker",
                description:
                  "docker compose up — that's it. App + Redis spin up on your machine or server. No cloud required.",
              },
              {
                title: "Set your local password",
                description:
                  "First visit opens setup. Create a password — it stays on your machine, hashed with bcrypt.",
              },
              {
                title: "Connect your AI providers",
                description:
                  "Add API keys for Replicate, Fal, or others. Keys are encrypted at rest with AES-256-GCM.",
              },
              {
                title: "Run a workflow",
                description:
                  "Start from a template, type a prompt, or build a custom pipeline on the visual canvas. Export your assets.",
              },
            ]}
          />
        </div>
      </Section>

      {/* Features grid */}
      <Section background="secondary">
        <SectionHeader
          title="Built for creators who ship"
          subtitle="Image generation, video, upscaling, multi-model comparisons — one workspace, zero SaaS sprawl."
        />
        <FeatureGrid>
          <FeatureCard
            icon={<CanvasIcon />}
            title="Visual Workflow Canvas"
            description="Drag-and-drop node editor. Chain generation, processing, and output steps into repeatable pipelines."
          />
          <FeatureCard
            icon={<ModelsIcon />}
            title="Multi-Model Comparison"
            description="Run the same prompt across multiple models in parallel. Compare outputs side-by-side, pick the best."
          />
          <FeatureCard
            icon={<CostIcon />}
            title="Cost Control"
            description="Per-run cost estimates, budget caps, and usage dashboards. Never get surprised by a bill again."
          />
          <FeatureCard
            icon={<PrivacyIcon />}
            title="Privacy-First"
            description="Runs on your hardware. No data leaves your machine except API calls you authorize. No telemetry."
          />
          <FeatureCard
            icon={<QueueIcon />}
            title="Job Queue & Parallelism"
            description="Redis-backed queue processes nodes in parallel. Long-running jobs resume automatically on restart."
          />
          <FeatureCard
            icon={<HistoryIcon />}
            title="Run History & Replay"
            description="Every run is versioned. Review outputs, compare attempts, resume failed runs with a single click."
          />
        </FeatureGrid>
      </Section>

      {/* Use cases */}
      <Section>
        <SectionHeader
          title="What you can build"
          subtitle="AI Studio handles the orchestration so you can focus on the creative output."
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: 20,
          }}
        >
          {[
            {
              title: "Content Pipelines",
              desc: "Generate hero images, social variants, and video from a single brief.",
            },
            {
              title: "Image & Video Generation",
              desc: "Stable Diffusion, Flux, Runway, Kling — connect any provider, run any model.",
            },
            {
              title: "Upscaling & Post-Processing",
              desc: "Chain upscalers, format converters, and compositing steps into one workflow.",
            },
            {
              title: "Multi-Model Comparisons",
              desc: "Test the same prompt across 3+ models. Find what works before committing budget.",
            },
          ].map(({ title, desc }) => (
            <div
              key={title}
              style={{
                padding: 24,
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                backgroundColor: "var(--color-surface)",
              }}
            >
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                  marginBottom: 8,
                }}
              >
                {title}
              </h3>
              <p style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section background="secondary">
        <SectionHeader title="Frequently asked questions" />
        <div style={{ maxWidth: 640, marginLeft: "auto", marginRight: "auto" }}>
          <FAQ
            items={[
              {
                question: "Do I need a server to run AI Studio?",
                answer:
                  "Any machine that runs Docker works — your laptop, a home server, or a cloud VM. The app and Redis run in two lightweight containers.",
              },
              {
                question: "What AI providers are supported?",
                answer:
                  "Replicate and Fal are supported at launch, with more coming. You bring your own API keys and only pay providers directly for what you use.",
              },
              {
                question: "Is this a subscription?",
                answer:
                  "No. You buy a license once. The license key validates offline — no internet connection or account needed after purchase.",
              },
              {
                question: "How is my data stored?",
                answer:
                  "Everything is stored locally in SQLite inside your Docker volume. API keys are encrypted with AES-256-GCM. Nothing is sent to our servers.",
              },
              {
                question: "Can multiple people use one instance?",
                answer:
                  "The Personal license is single-user. A Team license with multiple seats is planned for a future release.",
              },
            ]}
          />
        </div>
      </Section>

      {/* Final CTA */}
      <section
        style={{
          padding: "80px 0",
          textAlign: "center",
          background:
            "radial-gradient(ellipse at 50% 100%, rgba(59, 130, 246, 0.06) 0%, transparent 60%)",
        }}
      >
        <Container>
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 800,
              color: "var(--color-text-primary)",
              letterSpacing: "-0.02em",
              marginBottom: 16,
            }}
          >
            Start building today
          </h2>
          <p
            style={{
              fontSize: 17,
              color: "var(--color-text-secondary)",
              marginBottom: 32,
              maxWidth: 480,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            One license. One Docker command. Full control over your AI content pipeline.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <CTAButton href="/pricing" variant="primary" size="lg">
              Buy License
            </CTAButton>
            <CTAButton href="/docs" variant="secondary" size="lg">
              Read the Docs
            </CTAButton>
          </div>
        </Container>
      </section>
    </MarketingLayout>
  );
}

/* ── Inline Icons ── */

function CanvasIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M17.5 14v7M14 17.5h7" />
    </svg>
  );
}

function ModelsIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3h5v5M8 3H3v5M16 21h5v-5M8 21H3v-5M12 8v8M8 12h8" />
    </svg>
  );
}

function CostIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6" />
    </svg>
  );
}

function PrivacyIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function QueueIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20V10M18 20V4M6 20v-4" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}
