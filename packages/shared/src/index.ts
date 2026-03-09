// ── Workflow Schema ──
export { WorkflowGraphSchema, NodeSchema, EdgeSchema, PortSchema } from "./workflowSchema.js";
export type { WorkflowGraph, WorkflowNode, WorkflowEdge, Port } from "./workflowSchema.js";

// ── Port & Node Type Enums ──
export { PortType, PORT_COMPATIBILITY } from "./portTypes.js";
export { NodeType } from "./nodeTypes.js";

// ── Errors ──
export { ErrorCode, AppError } from "./errors.js";

// ── Social Format ──
export { getSpec, formatForPlatform, formatAll } from "./socialFormat.js";
export type { Platform, PlatformPreset, FormatInput, FormatOutput, TextBlock } from "./socialFormat.js";

// ── Node Definition System ──
export {
  NodeRuntimeKind,
  NodeCategory,
  PortDefinitionSchema,
  NodeParameterFieldSchema,
  SerializableNodeDefinitionSchema,
  toSerializable,
} from "./nodeDefinition.js";
export type {
  NodeDefinition,
  PortDefinition,
  NodeParameterField,
  NodeParameterSchema,
  UISchema,
  CostEstimate,
  NodeExecutionContext,
  NodeExecutionResult,
  SerializableNodeDefinition,
} from "./nodeDefinition.js";

// ── Node Registry ──
export { NodeRegistry, nodeRegistry } from "./nodeRegistry.js";

// ── Built-in Node Definitions ──
export {
  builtInNodeDefinitions,
  registerBuiltInNodes,
  // IO nodes
  imageInputNode,
  outputNode,
  // Utility nodes
  resizeNode,
  cropNode,
  formatConvertNode,
  compositingNode,
  promptTemplateNode,
  commentNode,
  // Provider nodes (templates)
  imageGenerationNode,
  videoGenerationNode,
  createProviderNodeDefinition,
  // Capability nodes
  clipScoringNode,
  socialFormatNode,
  exportBundleNode,
  rankingNode,
} from "./nodeDefinitions/index.js";

// ── Node Definition Helpers ──
export {
  getDefaultParams,
  toWorkflowPorts,
  validateParams,
  arePortsCompatible,
  getNodeSummary,
} from "./nodeDefHelpers.js";

// ── Model Bridge ──
export { modelToNodeDefinition, modelsToNodeDefinitions } from "./modelBridge.js";
export type { ModelOptionLike } from "./modelBridge.js";

// ── Candidate Contract ──
export type {
  CandidateItem,
  CandidateScore,
  CandidateCollection,
  CandidateMetadata,
  CandidateSelection,
  CandidateType,
  CollectionType,
} from "./candidateTypes.js";

export {
  attachScore,
  attachScores,
  getScore,
  getBestScore,
  sortByMetric,
  rankByMetric,
  takeTopK,
  filterByThreshold,
  selectBest,
  toCollection,
  toSelection,
  fromRawValues,
  extractValues,
  isCandidateCollection,
  ensureCollection,
  attachMetadata,
  attachCollectionMetadata,
} from "./candidateHelpers.js";

// ── Template Packs ──
export {
  TemplatePackManifestSchema,
  TemplatePackLoader,
  templatePackLoader,
  parseTemplatePack,
} from "./templatePack.js";
export type {
  TemplatePackManifest,
  TemplatePack,
  TemplateEntry,
  TemplatePackSource,
  PackAvailability,
} from "./templatePack.js";

export { registerBuiltInPacks } from "./builtinPacks.js";
