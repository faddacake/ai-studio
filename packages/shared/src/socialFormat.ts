// Social formatting engine — Phase 2.2

// ── Types ────────────────────────────────────────────────────────────

export type Platform = "instagram" | "twitter" | "tiktok" | "youtube" | "linkedin";

export interface PlatformPreset {
  platform: Platform;
  maxChars: number;
  aspectRatio: string;
  resolution: [number, number];
  hashtagLimit: number;
  lineBreakStyle: "\n" | "\n\n";
  ctaPlacement: "top" | "bottom" | "none";
  mentionPrefix: "@";
}

export interface FormatInput {
  text: string;
  headline?: string;
  cta?: string;
  hashtags?: string[];
  mentions?: string[];
  media?: { width: number; height: number; url: string };
}

export interface TextBlock {
  role: "headline" | "body" | "cta" | "hashtags" | "mentions";
  content: string;
}

export interface FormatOutput {
  blocks: TextBlock[];
  raw: string;
  charCount: number;
  charLimit: number;
  truncated: boolean;
  media: { width: number; height: number } | null;
  platform: Platform;
}

// ── Platform Presets (config) ────────────────────────────────────────

const PRESETS: Record<Platform, PlatformPreset> = {
  instagram: {
    platform: "instagram",
    maxChars: 2200,
    aspectRatio: "4:5",
    resolution: [1080, 1350],
    hashtagLimit: 30,
    lineBreakStyle: "\n\n",
    ctaPlacement: "bottom",
    mentionPrefix: "@",
  },
  twitter: {
    platform: "twitter",
    maxChars: 280,
    aspectRatio: "16:9",
    resolution: [1200, 675],
    hashtagLimit: 5,
    lineBreakStyle: "\n",
    ctaPlacement: "none",
    mentionPrefix: "@",
  },
  tiktok: {
    platform: "tiktok",
    maxChars: 2200,
    aspectRatio: "9:16",
    resolution: [1080, 1920],
    hashtagLimit: 10,
    lineBreakStyle: "\n",
    ctaPlacement: "bottom",
    mentionPrefix: "@",
  },
  youtube: {
    platform: "youtube",
    maxChars: 5000,
    aspectRatio: "16:9",
    resolution: [1920, 1080],
    hashtagLimit: 15,
    lineBreakStyle: "\n\n",
    ctaPlacement: "bottom",
    mentionPrefix: "@",
  },
  linkedin: {
    platform: "linkedin",
    maxChars: 3000,
    aspectRatio: "1:1",
    resolution: [1080, 1080],
    hashtagLimit: 5,
    lineBreakStyle: "\n\n",
    ctaPlacement: "top",
    mentionPrefix: "@",
  },
};

// ── Helpers ──────────────────────────────────────────────────────────

function normalizeHashtags(tags: string[], limit: number): string[] {
  return tags
    .map((t) => (t.startsWith("#") ? t : `#${t}`))
    .slice(0, limit);
}

function normalizeMentions(mentions: string[], prefix: string): string[] {
  return mentions.map((m) => (m.startsWith(prefix) ? m : `${prefix}${m}`));
}

function truncate(text: string, max: number): { text: string; truncated: boolean } {
  if (text.length <= max) return { text, truncated: false };
  return { text: text.slice(0, max - 1) + "\u2026", truncated: true };
}

// ── Engine ───────────────────────────────────────────────────────────

function buildBlocks(preset: PlatformPreset, input: FormatInput): TextBlock[] {
  const blocks: TextBlock[] = [];

  if (input.cta && preset.ctaPlacement === "top") {
    blocks.push({ role: "cta", content: input.cta });
  }

  if (input.headline) {
    blocks.push({ role: "headline", content: input.headline });
  }

  blocks.push({ role: "body", content: input.text });

  if (input.mentions?.length) {
    const mentions = normalizeMentions(input.mentions, preset.mentionPrefix);
    blocks.push({ role: "mentions", content: mentions.join(" ") });
  }

  if (input.cta && preset.ctaPlacement === "bottom") {
    blocks.push({ role: "cta", content: input.cta });
  }

  if (input.hashtags?.length) {
    const tags = normalizeHashtags(input.hashtags, preset.hashtagLimit);
    blocks.push({ role: "hashtags", content: tags.join(" ") });
  }

  return blocks;
}

function assembleRaw(blocks: TextBlock[], lineBreak: string): string {
  return blocks.map((b) => b.content).join(lineBreak);
}

export function getSpec(platform: Platform): PlatformPreset {
  return PRESETS[platform];
}

export function formatForPlatform(platform: Platform, input: FormatInput): FormatOutput {
  const preset = PRESETS[platform];
  const blocks = buildBlocks(preset, input);
  const joined = assembleRaw(blocks, preset.lineBreakStyle);
  const { text: raw, truncated } = truncate(joined, preset.maxChars);

  const media = input.media
    ? { width: preset.resolution[0], height: preset.resolution[1] }
    : null;

  return {
    blocks,
    raw,
    charCount: raw.length,
    charLimit: preset.maxChars,
    truncated,
    media,
    platform,
  };
}

export function formatAll(input: FormatInput): Record<Platform, FormatOutput> {
  const platforms = Object.keys(PRESETS) as Platform[];
  return Object.fromEntries(
    platforms.map((p) => [p, formatForPlatform(p, input)])
  ) as Record<Platform, FormatOutput>;
}
