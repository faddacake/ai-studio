import type { ProviderAdapter, ModelExecutionInput, ModelExecutionResult } from "./types";

export class ReplicateAdapter implements ProviderAdapter {
  async generate(input: ModelExecutionInput): Promise<ModelExecutionResult> {
    // TODO: Integrate with Replicate API
    // Will use provider API key from encrypted storage via /api/providers/:id/key
    // Endpoint: https://api.replicate.com/v1/predictions
    void input;
    return {
      status: "success",
      output: null,
      metadata: { provider: "replicate" },
    };
  }
}
