export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { scoreResults } from "@/services/qualityScoring";

export async function POST(request: Request) {
  if (process.env.ENABLE_SCORING !== "true") {
    return NextResponse.json(
      { error: "Scoring is disabled", results: [] },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const { prompt, imageUrls } = body as {
      prompt?: string;
      imageUrls?: string[];
    };

    if (!prompt || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json(
        { error: "Missing prompt or imageUrls", results: [] },
        { status: 400 },
      );
    }

    const results = await scoreResults(
      prompt,
      imageUrls.map((url) => ({ imageUrl: url })),
    );

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[scoring] Error:", err);
    return NextResponse.json(
      { error: "Scoring failed", results: [] },
      { status: 500 },
    );
  }
}
