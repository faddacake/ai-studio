import type { ModelCategory } from "./models";

export interface PromptPreset {
  id: string;
  name: string;
  category: ModelCategory;
  defaultModels: string[];
  defaultParams: Record<string, unknown>;
}

export const PRESETS: PromptPreset[] = [
  // ── Image ──
  {
    id: "instagram-post",
    name: "Instagram Post",
    category: "image",
    defaultModels: ["flux-1.1-pro", "sdxl"],
    defaultParams: { aspectRatio: "1:1", resolution: "1024", quality: 3 },
  },
  {
    id: "youtube-thumbnail",
    name: "YouTube Thumbnail",
    category: "image",
    defaultModels: ["flux-1.1-pro", "sdxl"],
    defaultParams: { aspectRatio: "16:9", resolution: "1536", quality: 3 },
  },
  {
    id: "blog-hero",
    name: "Blog Hero",
    category: "image",
    defaultModels: ["flux-1.1-pro", "sdxl"],
    defaultParams: { aspectRatio: "16:9", resolution: "1024", quality: 2 },
  },
  {
    id: "product-mockup",
    name: "Product Mockup",
    category: "image",
    defaultModels: ["flux-1.1-pro", "sdxl"],
    defaultParams: { aspectRatio: "1:1", resolution: "1536", quality: 3 },
  },

  // ── Video ──
  {
    id: "short-form-reel",
    name: "Short Form Reel",
    category: "video",
    defaultModels: ["kling", "pika"],
    defaultParams: { aspectRatio: "9:16", duration: "3", resolution: "1080p" },
  },
  {
    id: "explainer-video",
    name: "Explainer Video",
    category: "video",
    defaultModels: ["luma-dream-machine", "pika"],
    defaultParams: { aspectRatio: "16:9", duration: "10", resolution: "1080p" },
  },

  // ── Voice ──
  {
    id: "podcast-intro",
    name: "Podcast Intro",
    category: "voice",
    defaultModels: ["elevenlabs", "murf-ai"],
    defaultParams: { tone: "warm", speed: 2, format: "mp3" },
  },
  {
    id: "ad-voiceover",
    name: "Ad Voiceover",
    category: "voice",
    defaultModels: ["elevenlabs", "azure-neural-tts"],
    defaultParams: { tone: "energetic", speed: 3, format: "wav" },
  },
];

export function getPresetsByCategory(category: ModelCategory): PromptPreset[] {
  return PRESETS.filter((p) => p.category === category);
}

export function getPresetById(id: string): PromptPreset | undefined {
  return PRESETS.find((p) => p.id === id);
}
