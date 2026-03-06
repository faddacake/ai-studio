import type { NodeDefinition } from "../nodeDefinition.js";
import { NodeCategory, NodeRuntimeKind } from "../nodeDefinition.js";
import { PortType } from "../portTypes.js";

/**
 * CLIP Scoring node — evaluates how well an image matches a text prompt.
 *
 * This wraps the existing qualityScoring service as a node-compatible
 * definition. The executor calls the CLIP API and normalizes the score.
 */
export const clipScoringNode: NodeDefinition = {
  type: "clip-scoring",
  label: "CLIP Scoring",
  category: NodeCategory.Scoring,
  description: "Score how well an image matches a text prompt using CLIP similarity.",
  icon: "bar-chart",

  inputs: [
    { id: "image_in", label: "Image", type: PortType.Image, required: true },
    { id: "prompt_in", label: "Prompt", type: PortType.Text, required: true },
  ],
  outputs: [
    { id: "score_out", label: "Score", type: PortType.Number, description: "Similarity score (0–100)" },
    { id: "result_out", label: "Result", type: PortType.Json, description: "Full scoring result with metadata" },
  ],

  parameterSchema: [
    {
      key: "threshold",
      label: "Minimum Score",
      type: "number",
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 0,
      description: "Optional minimum score threshold — results below this are flagged",
    },
  ],

  runtimeKind: NodeRuntimeKind.Capability,
  tags: ["scoring", "quality", "clip"],
  isAvailable: true,
};

/**
 * Social Format node — generates platform-specific captions and media specs.
 *
 * This wraps the existing socialFormatter service as a node-compatible
 * definition. Takes a caption/prompt and outputs formatted variants
 * for each platform.
 */
export const socialFormatNode: NodeDefinition = {
  type: "social-format",
  label: "Social Format",
  category: NodeCategory.Formatting,
  description: "Generate platform-specific captions, hashtags, and image specs for social media.",
  icon: "share-2",

  inputs: [
    { id: "image_in", label: "Image", type: PortType.Image, required: false },
    { id: "text_in", label: "Caption / Prompt", type: PortType.Text, required: true },
  ],
  outputs: [
    {
      id: "variants_out",
      label: "Platform Variants",
      type: PortType.Json,
      description: "Formatted captions and specs per platform",
    },
    {
      id: "images_out",
      label: "Resized Images",
      type: PortType.Json,
      description: "Platform-specific image URLs/paths",
    },
  ],

  parameterSchema: [
    {
      key: "platforms",
      label: "Platforms",
      type: "json",
      defaultValue: ["instagram", "tiktok", "x", "linkedin", "youtubeShorts"],
      description: "Which platforms to generate variants for",
    },
    {
      key: "topic",
      label: "Topic",
      type: "string",
      placeholder: "AI art, digital creation",
      description: "Topic keywords for hashtag generation",
    },
  ],

  runtimeKind: NodeRuntimeKind.Capability,
  tags: ["formatting", "social", "caption"],
  isAvailable: true,
};

/**
 * Export Bundle node — assembles a campaign export package.
 *
 * This wraps the existing exportService as a node-compatible definition.
 * Takes formatted variants and images, produces a bundle manifest
 * that can be downloaded as a ZIP.
 */
export const exportBundleNode: NodeDefinition = {
  type: "export-bundle",
  label: "Export Bundle",
  category: NodeCategory.Export,
  description: "Assemble a campaign export package with captions, images, CSV scheduler, and posting guides.",
  icon: "package",

  inputs: [
    { id: "variants_in", label: "Platform Variants", type: PortType.Json, required: true },
    { id: "images_in", label: "Images", type: PortType.Json, required: false },
    { id: "prompt_in", label: "Prompt", type: PortType.Text, required: false },
  ],
  outputs: [
    { id: "bundle_out", label: "Bundle", type: PortType.Json, description: "Export bundle manifest and data" },
  ],

  parameterSchema: [
    {
      key: "topic",
      label: "Campaign Topic",
      type: "string",
      placeholder: "Product launch, brand campaign",
    },
    {
      key: "includeGuides",
      label: "Include Posting Guides",
      type: "boolean",
      defaultValue: true,
      description: "Add per-platform posting guides to the bundle",
    },
  ],

  runtimeKind: NodeRuntimeKind.Capability,
  tags: ["export", "bundle", "campaign"],
  isAvailable: true,
};

/**
 * Multi-Criteria Ranking node — ranks results by quality, speed, and cost.
 *
 * This wraps the existing ranking/score.ts logic as a node definition.
 */
export const rankingNode: NodeDefinition = {
  type: "ranking",
  label: "Result Ranking",
  category: NodeCategory.Scoring,
  description: "Rank multiple generation results by quality, speed, and cost using weighted scoring.",
  icon: "trophy",

  inputs: [
    {
      id: "results_in",
      label: "Results",
      type: PortType.Json,
      required: true,
      isArray: true,
      description: "Array of generation results to rank",
    },
  ],
  outputs: [
    { id: "ranked_out", label: "Ranked Results", type: PortType.Json },
    { id: "winner_out", label: "Best Result", type: PortType.Json },
  ],

  parameterSchema: [
    {
      key: "qualityWeight",
      label: "Quality Weight",
      type: "number",
      min: 0,
      max: 1,
      step: 0.1,
      defaultValue: 0.5,
    },
    {
      key: "speedWeight",
      label: "Speed Weight",
      type: "number",
      min: 0,
      max: 1,
      step: 0.1,
      defaultValue: 0.3,
    },
    {
      key: "costWeight",
      label: "Cost Weight",
      type: "number",
      min: 0,
      max: 1,
      step: 0.1,
      defaultValue: 0.2,
    },
  ],

  runtimeKind: NodeRuntimeKind.Capability,
  tags: ["scoring", "ranking"],
  isAvailable: true,
};

export const capabilityNodes: NodeDefinition[] = [
  clipScoringNode,
  socialFormatNode,
  exportBundleNode,
  rankingNode,
];
