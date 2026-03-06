import type { NodeDefinition } from "./nodeDefinition.js";
import { createProviderNodeDefinition } from "./nodeDefinitions/provider.js";

/**
 * Minimal model info needed to create a provider node definition.
 * Matches the shape of ModelOption from apps/web/src/config/models.ts
 * without importing it — keeps the shared package dependency-free.
 */
export interface ModelOptionLike {
  id: string;
  name: string;
  category: "image" | "video" | "voice";
  provider: string;
  providerKey: string;
  adapterModelId: string;
  supported: boolean;
  tags: string[];
  estimatedCost: number;
}

/**
 * Convert a model catalog entry into a registry-compatible NodeDefinition.
 *
 * This is the bridge between the existing frontend model catalog
 * (apps/web/src/config/models.ts) and the node registry system.
 *
 * Usage:
 *   import { IMAGE_MODELS } from "@/config/models";
 *   const nodeDefs = IMAGE_MODELS.map(modelToNodeDefinition);
 *   nodeRegistry.registerAll(nodeDefs);
 */
export function modelToNodeDefinition(model: ModelOptionLike): NodeDefinition | null {
  // Voice models are not yet node-compatible
  if (model.category === "voice") return null;

  return createProviderNodeDefinition({
    type: `${model.providerKey}/${model.id}`,
    label: model.name,
    description: `Generate using ${model.name} via ${model.provider}`,
    providerId: model.providerKey,
    modelId: model.adapterModelId,
    category: model.category,
    tags: model.tags,
    isAvailable: model.supported,
    estimatedCost: model.estimatedCost,
  });
}

/**
 * Convert an array of model options into node definitions,
 * filtering out unsupported categories.
 */
export function modelsToNodeDefinitions(models: ModelOptionLike[]): NodeDefinition[] {
  const defs: NodeDefinition[] = [];
  for (const model of models) {
    const def = modelToNodeDefinition(model);
    if (def) defs.push(def);
  }
  return defs;
}
