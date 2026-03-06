import type { ProviderAdapter, ModelExecutionInput, ModelExecutionResult } from "./types";

export class GoogleAdapter implements ProviderAdapter {
  async generate(input: ModelExecutionInput): Promise<ModelExecutionResult> {
    // TODO: Integrate with Google AI APIs (Gemini, Veo, etc.)
    // Will use provider API key from encrypted storage via /api/providers/:id/key
    // Endpoints vary by product: Gemini API, Veo API, etc.
    void input;
    return {
      status: "success",
      output: null,
      metadata: { provider: "google" },
    };
  }
}
