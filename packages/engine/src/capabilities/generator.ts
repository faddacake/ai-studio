/**
 * Generator adapter abstraction.
 *
 * Decouples image generation from the Best-of-N executor so that the
 * underlying generator can be swapped without touching the scoring/ranking
 * pipeline.  Currently ships two implementations:
 *
 *   - MockGeneratorAdapter   — deterministic solid-color PNGs; used in tests
 *                              and as the fallback when no API key is present.
 *   - FalGeneratorAdapter    — calls fal.ai FLUX Schnell via a plain `fetch`;
 *                              activated when FAL_API_KEY env var is set.
 *
 * Adding a new provider (Replicate, Together, etc.) means implementing
 * the three-method `GeneratorAdapter` interface and registering it in
 * `createGenerator`.
 */

import sharp from "sharp";

// ── Types ──────────────────────────────────────────────────────────────────

export interface GenerateOpts {
  prompt: string;
  /** Desired width in pixels. Adapters may round to nearest supported size. */
  width?: number;
  /** Desired height in pixels. */
  height?: number;
  /**
   * Optional seed for reproducibility.
   * Real providers forward this to the model; the mock uses it to derive a
   * deterministic color so the same seed always produces the same image.
   */
  seed?: number;
  signal?: AbortSignal;
}

export interface GeneratedImage {
  buffer:   Buffer;
  width:    number;
  height:   number;
  /** MIME type of the generated image (e.g. "image/png", "image/jpeg"). */
  mimeType: string;
}

export interface GeneratorAdapter {
  /** Identifies the adapter; surfaced in node metadata as `generatorKind`. */
  readonly kind: string;
  generate(opts: GenerateOpts): Promise<GeneratedImage>;
}

// ── Mock Adapter ───────────────────────────────────────────────────────────

/**
 * Deterministic solid-color PNG generator.
 *
 * Derives a unique RGB color from `seed` using simple linear arithmetic so
 * that different seeds reliably produce visually distinct images.  This lets
 * the CLIP-scoring step (which ignores pixel content in mock mode) still
 * differentiate candidates by stable collection index.
 */
export class MockGeneratorAdapter implements GeneratorAdapter {
  readonly kind = "mock";

  async generate(opts: GenerateOpts): Promise<GeneratedImage> {
    const seed   = opts.seed ?? 42;
    const width  = opts.width  ?? 64;
    const height = opts.height ?? 64;

    const r = seed % 256;
    const g = (seed * 3 + 71)  % 256;
    const b = (seed * 7 + 113) % 256;

    const buffer = await sharp({
      create: { width, height, channels: 3, background: { r, g, b } },
    })
      .png()
      .toBuffer();

    return { buffer, width, height, mimeType: "image/png" };
  }
}

// ── Fal Adapter ────────────────────────────────────────────────────────────

interface FalApiResponse {
  images: Array<{
    url:          string;
    width?:       number;
    height?:      number;
    content_type?: string;
  }>;
}

/**
 * Fal.ai image generation adapter.
 *
 * Uses a plain `fetch` call — no SDK dependency required.
 * Defaults to `fal-ai/flux/schnell` (4-step FLUX model; fast and free-tier
 * friendly). The model ID is overridable via `modelId`.
 *
 * Activation: set `FAL_API_KEY` environment variable.
 */
export class FalGeneratorAdapter implements GeneratorAdapter {
  readonly kind = "fal";

  constructor(
    private readonly apiKey:  string,
    private readonly modelId: string = "fal-ai/flux/schnell",
  ) {}

  async generate(opts: GenerateOpts): Promise<GeneratedImage> {
    const width  = opts.width  ?? 512;
    const height = opts.height ?? 512;

    // Map pixel dimensions to the nearest supported fal image_size preset.
    const imageSize = width <= 512 && height <= 512 ? "square" : "square_hd";

    const body: Record<string, unknown> = {
      prompt:               opts.prompt || "abstract image",
      image_size:           imageSize,
      num_images:           1,
      num_inference_steps:  4,   // Schnell works well at 1–4 steps
    };
    if (opts.seed !== undefined) {
      body.seed = opts.seed;
    }

    const response = await fetch(`https://fal.run/${this.modelId}`, {
      method:  "POST",
      headers: {
        Authorization:  `Key ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body:   JSON.stringify(body),
      signal: opts.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "unknown error");
      throw new Error(`Fal API error ${response.status}: ${errorText}`);
    }

    const data      = await response.json() as FalApiResponse;
    const imageInfo = data.images?.[0];

    if (!imageInfo?.url) {
      throw new Error("Fal API returned no images in response");
    }

    // Download the generated image to a Buffer.
    const imageResponse = await fetch(imageInfo.url, { signal: opts.signal });
    if (!imageResponse.ok) {
      throw new Error(
        `Failed to download generated image from Fal CDN: ${imageResponse.status}`,
      );
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer      = Buffer.from(arrayBuffer);

    return {
      buffer,
      width:    imageInfo.width  ?? width,
      height:   imageInfo.height ?? height,
      mimeType: imageInfo.content_type ?? "image/jpeg",
    };
  }
}

// ── Factory ────────────────────────────────────────────────────────────────

export interface GeneratorAdapterOptions {
  /** "fal" (more to come). Ignored when no apiKey is provided. */
  provider?: string;
  /** Provider API key. Absence falls back to MockGeneratorAdapter. */
  apiKey?:   string;
  /** Provider-specific model ID override. */
  modelId?:  string;
}

/**
 * Returns the appropriate GeneratorAdapter for the given options.
 *
 * Priority:
 *   1. FAL_API_KEY env var (or explicit `apiKey`) with provider "fal" → FalGeneratorAdapter
 *   2. Fallback → MockGeneratorAdapter
 *
 * This is the primary entry point used by `executeBestOfN`; tests inject
 * a custom adapter directly via `context.params.__generator`.
 */
export function createGenerator(opts: GeneratorAdapterOptions = {}): GeneratorAdapter {
  const { provider = "fal", modelId } = opts;
  const apiKey = opts.apiKey ?? process.env.FAL_API_KEY;

  if (provider === "fal" && apiKey) {
    return new FalGeneratorAdapter(apiKey, modelId ?? "fal-ai/flux/schnell");
  }

  return new MockGeneratorAdapter();
}
