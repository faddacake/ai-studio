import { nodeExecutor } from "../executor.js";
import { executeBestOfN } from "./bestOfN.js";
import { executeClipScoring } from "./clipScoring.js";
import { executeRanking } from "./ranking.js";
import { executeSocialFormat } from "./socialFormat.js";
import { executeExportBundle } from "./exportBundle.js";

export { executeBestOfN } from "./bestOfN.js";
export { executeClipScoring } from "./clipScoring.js";
export { executeRanking } from "./ranking.js";
export { executeSocialFormat } from "./socialFormat.js";
export { executeExportBundle } from "./exportBundle.js";

export {
  MockGeneratorAdapter,
  FalGeneratorAdapter,
  createGenerator,
} from "./generator.js";
export type {
  GeneratorAdapter,
  GeneratorAdapterOptions,
  GenerateOpts,
  GeneratedImage,
} from "./generator.js";

/**
 * Register all built-in capability executors with the node executor.
 *
 * Call this once at worker/host startup after the node registry is
 * initialized. Each capability executor is keyed by its node type
 * string, matching the NodeDefinition.type in the registry.
 */
export function registerCapabilityExecutors(): void {
  nodeExecutor.registerCapability("best-of-n",    executeBestOfN);
  nodeExecutor.registerCapability("clip-scoring",  executeClipScoring);
  nodeExecutor.registerCapability("ranking",       executeRanking);
  nodeExecutor.registerCapability("social-format", executeSocialFormat);
  nodeExecutor.registerCapability("export-bundle", executeExportBundle);
}
