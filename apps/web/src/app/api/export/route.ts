export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createExportBundle } from "@/services/exportService";
import {
  generatePlatformVariants,
  resizeForPlatform,
  PLATFORM_IMAGE_SPECS,
  type PlatformId,
  type PlatformVariants,
} from "@/services/socialFormatter";
import { getLicenseTier } from "@/lib/license";

const PLATFORM_IDS: PlatformId[] = ["instagram", "tiktok", "x", "linkedin", "youtubeShorts"];

/**
 * Validate that editedVariants has the expected PlatformVariants shape.
 * Returns null if invalid, the validated object if OK.
 */
function validateEditedVariants(v: unknown): PlatformVariants | null {
  if (!v || typeof v !== "object") return null;
  const obj = v as Record<string, unknown>;

  for (const id of PLATFORM_IDS) {
    const entry = obj[id];
    if (!entry || typeof entry !== "object") return null;
    const e = entry as Record<string, unknown>;

    if (id === "youtubeShorts") {
      if (typeof e.title !== "string" || typeof e.description !== "string") return null;
    } else {
      if (typeof e.caption !== "string") return null;
    }
  }

  return obj as unknown as PlatformVariants;
}

/**
 * Normalize imageUrl: treat placeholders and non-http(s) URLs as "no image".
 * Returns "" for anything that isn't a real fetchable URL.
 */
function normalizeImageUrl(url: string | undefined): string {
  if (!url) return "";
  if (url.startsWith("placeholder:")) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  // Also accept root-relative URLs (e.g. /api/social-format/image?...)
  if (url.startsWith("/")) return url;
  return "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, imageUrl, topic, modelName, editedVariants } = body as {
      prompt?: string;
      imageUrl?: string;
      topic?: string;
      modelName?: string;
      editedVariants?: unknown;
    };

    if (!prompt || !topic) {
      return NextResponse.json(
        { error: "Missing required fields: prompt, topic" },
        { status: 400 },
      );
    }

    const tier = getLicenseTier();
    const resolvedImageUrl = normalizeImageUrl(imageUrl);

    // Use edited variants from the Canvas editor if provided and valid,
    // otherwise generate fresh variants from the prompt.
    const validated = editedVariants ? validateEditedVariants(editedVariants) : null;
    const variants = validated
      ?? await generatePlatformVariants({ caption: prompt, imageUrl: resolvedImageUrl, topic });

    const images: Record<string, string> = {};
    if (resolvedImageUrl) {
      for (const platform of Object.keys(PLATFORM_IMAGE_SPECS) as PlatformId[]) {
        images[platform] = resizeForPlatform(resolvedImageUrl, platform);
      }
    }

    const bundle = await createExportBundle({
      prompt,
      topic,
      imageUrl: resolvedImageUrl,
      variants,
      images,
      tier,
      modelName,
      edited: validated !== null,
    });

    return NextResponse.json(bundle);
  } catch (err) {
    console.error("[export] Error:", err);
    return NextResponse.json(
      { error: "Failed to create export bundle" },
      { status: 500 },
    );
  }
}
