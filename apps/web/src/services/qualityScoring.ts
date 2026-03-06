export type ScoredResult = {
  imageUrl: string;
  score: number;
  rank: number;
};

function isScoringEnabled(): boolean {
  return process.env.ENABLE_SCORING === "true";
}

/**
 * Score a single image against a prompt using a CLIP-compatible API.
 * Returns a normalized score 0–100, or `null` if scoring is disabled/fails.
 */
export async function scoreImageAgainstPrompt(
  prompt: string,
  imageUrl: string,
): Promise<number | null> {
  if (!isScoringEnabled()) return null;

  const clipUrl = process.env.CLIP_API_URL;
  const clipKey = process.env.CLIP_API_KEY;

  if (!clipUrl) return null;

  try {
    const res = await fetch(clipUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(clipKey ? { Authorization: `Bearer ${clipKey}` } : {}),
      },
      body: JSON.stringify({ prompt, image_url: imageUrl }),
    });

    if (!res.ok) return -1;

    const data = await res.json();
    const cosineSimilarity: number = data.similarity ?? data.score ?? 0;

    // Normalize from [-1, 1] cosine similarity to 0–100
    return Math.round((cosineSimilarity + 1) * 50);
  } catch {
    return -1;
  }
}

/**
 * Score multiple results against a prompt, sort descending, assign ranks.
 * Returns the original array unchanged if scoring is disabled.
 */
export async function scoreResults(
  prompt: string,
  results: { imageUrl: string }[],
): Promise<ScoredResult[]> {
  if (!isScoringEnabled()) return [];

  const scored = await Promise.all(
    results.map(async (r) => {
      const score = await scoreImageAgainstPrompt(prompt, r.imageUrl);
      return { imageUrl: r.imageUrl, score: score ?? -1 };
    }),
  );

  scored.sort((a, b) => b.score - a.score);

  return scored.map((s, i) => ({
    imageUrl: s.imageUrl,
    score: s.score,
    rank: i + 1,
  }));
}
