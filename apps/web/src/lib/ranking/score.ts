import type { ModelOption } from "@/config/models";
import type { ModelRunResult } from "@/hooks/usePromptRunner";

export type RankingWeights = {
  quality: number;
  speed: number;
  cost: number;
};

export const DEFAULT_WEIGHTS: RankingWeights = {
  quality: 0.5,
  speed: 0.3,
  cost: 0.2,
};

export const BUDGET_WEIGHTS: RankingWeights = {
  quality: 0.4,
  speed: 0.2,
  cost: 0.4,
};

const QUALITY_SCORE: Record<string, number> = { draft: 1, production: 2 };
const SPEED_SCORE: Record<string, number> = { slow: 1, balanced: 2, fast: 3 };
const COST_SCORE: Record<string, number> = { high: 1, medium: 2, low: 3 };

export interface RankedModel {
  modelId: string;
  modelName: string;
  score: number;
  breakdown: { quality: number; speed: number; cost: number };
}

export interface RankingResult {
  ranked: RankedModel[];
  recommendedModelId: string | null;
}

/**
 * Rank completed model results using tier metadata.
 * Only models with status "completed" are scored.
 */
export function rankModels(
  results: ModelRunResult[],
  models: ModelOption[],
  weights: RankingWeights = DEFAULT_WEIGHTS,
): RankingResult {
  const modelMap = new Map(models.map((m) => [m.id, m]));

  const scored: RankedModel[] = results
    .filter((r) => r.status === "completed")
    .map((r) => {
      const model = modelMap.get(r.modelId);
      const q = QUALITY_SCORE[model?.qualityTier ?? "draft"] ?? 1;
      const s = SPEED_SCORE[model?.speedTier ?? "slow"] ?? 1;
      const c = COST_SCORE[model?.costTier ?? "high"] ?? 1;

      return {
        modelId: r.modelId,
        modelName: r.modelName,
        score: weights.quality * q + weights.speed * s + weights.cost * c,
        breakdown: { quality: q, speed: s, cost: c },
      };
    })
    .sort((a, b) => b.score - a.score);

  return {
    ranked: scored,
    recommendedModelId: scored[0]?.modelId ?? null,
  };
}
