import type { ProviderAdapter, ModelExecutionInput, ModelExecutionResult } from "./types";

export class FalAdapter implements ProviderAdapter {
  async generate(input: ModelExecutionInput): Promise<ModelExecutionResult> {
    // TODO: Integrate with Fal API
    // Will use provider API key from encrypted storage via /api/providers/:id/key
    // Endpoint: https://fal.run/{model_id}
    void input;
    return {
      status: "success",
      output: null,
      metadata: { provider: "fal" },
    };
  }
}
