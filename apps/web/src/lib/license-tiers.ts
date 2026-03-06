export type LicenseTier = "free" | "creator" | "pro";

export interface TierLimits {
  maxModels: number;
  ranking: boolean;
  compareMode: boolean;
  budgetOptimizer: boolean;
  presets: boolean;
}

export const TIER_LIMITS: Record<LicenseTier, TierLimits> = {
  free: {
    maxModels: 1,
    ranking: false,
    compareMode: false,
    budgetOptimizer: false,
    presets: false,
  },
  creator: {
    maxModels: 3,
    ranking: true,
    compareMode: false,
    budgetOptimizer: false,
    presets: false,
  },
  pro: {
    maxModels: Infinity,
    ranking: true,
    compareMode: true,
    budgetOptimizer: true,
    presets: true,
  },
};
