export type ModelExecutionInput = {
  prompt: string;
  params?: Record<string, unknown>;
};

export type ModelExecutionStatus = "queued" | "running" | "success" | "error";

export interface ModelExecutionResult {
  status: ModelExecutionStatus;
  output?: unknown;
  error?: string;
  cost?: number;
  metadata?: Record<string, unknown>;
  score?: number;
  rank?: number;
}

export interface ProviderAdapter {
  generate(input: ModelExecutionInput): Promise<ModelExecutionResult>;
}
