import { providerRegistry } from "./registry";
import type { ModelExecutionResult } from "./types";
import type { ModelOption } from "@/config/models";

export async function executeModel(
  model: ModelOption,
  prompt: string,
  params?: Record<string, unknown>,
): Promise<ModelExecutionResult> {
  const adapter = providerRegistry[model.providerKey];

  if (!adapter) {
    return {
      status: "error",
      error: `No adapter registered for provider "${model.providerKey}"`,
    };
  }

  return adapter.generate({
    prompt,
    params: { ...model.defaultParams, ...params },
  });
}
