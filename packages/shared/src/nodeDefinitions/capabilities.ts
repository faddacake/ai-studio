import type { NodeDefinition } from "../nodeDefinition.js";
import { NodeCategory, NodeRuntimeKind } from "../nodeDefinition.js";
import { PortType } from "../portTypes.js";

/**
 * CLIP Scoring node — evaluates image quality or prompt relevance.
 *
 * Receives an array of images and an optional text prompt, computes a
 * similarity/quality score per image, and returns structured results.
 * The executor uses a mock scoring function until a real CLIP model
 * (e.g. open_clip) is integrated.
 */
export const clipScoringNode: NodeDefinition = {
  type: "clip-scoring",
  label: "CLIP Scoring",
  category: NodeCategory.Scoring,
  description: "Score image quality or prompt relevance using CLIP similarity.",
  icon: "bar-chart",

  inputs: [
    {
      id: "images_in",
      label: "Images",
      type: PortType.Image,
      required: true,
      isArray: true,
      description: "Array of images to score",
    },
    {
      id: "prompt_in",
      label: "Prompt",
      type: PortType.Text,
      required: false,
      description: "Optional text prompt to score relevance against",
    },
  ],
  outputs: [
    {
      id: "scores_out",
      label: "Scores",
      type: PortType.Json,
      description: "Array of numeric scores (one per input image, backward-compatible)",
    },
    {
      id: "scored_images_out",
      label: "Scored Images",
      type: PortType.Json,
      description: "CandidateCollection with scores attached — connects directly to Ranking",
    },
  ],

  parameterSchema: [
    {
      key: "model",
      label: "Model",
      type: "enum",
      defaultValue: "open_clip",
      options: [
        { value: "open_clip", label: "OpenCLIP (ViT-B/32)" },
        { value: "open_clip_large", label: "OpenCLIP (ViT-L/14)" },
      ],
      description: "CLIP model variant to use for scoring",
    },
    {
      key: "normalizeScores",
      label: "Normalize Scores",
      type: "boolean",
      defaultValue: true,
      description: "Normalize scores to 0–100 range",
    },
    {
      key: "topKPreview",
      label: "Top-K Preview",
      type: "number",
      min: 1,
      max: 100,
      step: 1,
      description: "If set, only include the top K scored images in output (optional)",
    },
  ],

  uiSchema: {
    groups: [
      { label: "Model", fields: ["model"] },
      { label: "Output", fields: ["normalizeScores", "topKPreview"] },
    ],
  },

  runtimeKind: NodeRuntimeKind.Capability,
  tags: ["scoring", "quality", "clip", "image"],
  isAvailable: true,
};

/**
 * Social Format node — generates platform-specific social content per candidate.
 *
 * Accepts a CandidateCollection or CandidateSelection (typically from Ranking)
 * and attaches social metadata (caption, hook, hashtags, CTA) per candidate
 * per platform. Preserves all upstream scores and ranks.
 */
export const socialFormatNode: NodeDefinition = {
  type: "social-format",
  label: "Social Format",
  category: NodeCategory.Formatting,
  description: "Generate platform-specific captions, hashtags, hooks, and CTAs per candidate.",
  icon: "share-2",

  inputs: [
    {
      id: "candidates_in",
      label: "Candidates",
      type: PortType.Json,
      required: true,
      description: "CandidateCollection or CandidateSelection from upstream (e.g. Ranking)",
    },
    {
      id: "text_in",
      label: "Context Text",
      type: PortType.Text,
      required: false,
      description: "Optional text context for caption generation (overrides candidate prompt)",
    },
  ],
  outputs: [
    {
      id: "formatted_out",
      label: "Formatted Candidates",
      type: PortType.Json,
      description: "CandidateCollection with social variants attached per candidate",
    },
  ],

  parameterSchema: [
    {
      key: "platforms",
      label: "Platforms",
      type: "json",
      defaultValue: ["instagram", "x", "linkedin"],
      description: "Which platforms to generate variants for",
    },
    {
      key: "tone",
      label: "Tone",
      type: "enum",
      defaultValue: "professional",
      options: [
        { value: "professional", label: "Professional" },
        { value: "casual", label: "Casual" },
        { value: "bold", label: "Bold" },
      ],
      description: "Tone of the generated captions",
    },
    {
      key: "topic",
      label: "Topic",
      type: "string",
      placeholder: "AI art, digital creation",
      description: "Topic keywords for hashtag generation",
    },
    {
      key: "includeHashtags",
      label: "Include Hashtags",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "includeCTA",
      label: "Include CTA",
      type: "boolean",
      defaultValue: true,
      description: "Include a call-to-action per platform",
    },
  ],

  uiSchema: {
    groups: [
      { label: "Platforms", fields: ["platforms"] },
      { label: "Content", fields: ["tone", "topic", "includeHashtags", "includeCTA"] },
    ],
  },

  runtimeKind: NodeRuntimeKind.Capability,
  tags: ["formatting", "social", "caption", "hashtags"],
  isAvailable: true,
};

/**
 * Export Bundle node — assembles a structured export manifest from candidates.
 *
 * Accepts a CandidateCollection (typically from SocialFormat or Ranking)
 * and produces an export manifest with asset references, social content,
 * scores, and ranks. Ready for future real zip/folder generation.
 */
export const exportBundleNode: NodeDefinition = {
  type: "export-bundle",
  label: "Export Bundle",
  category: NodeCategory.Export,
  description: "Assemble an export manifest with assets, captions, scores, and ranks from candidates.",
  icon: "package",

  inputs: [
    {
      id: "candidates_in",
      label: "Candidates",
      type: PortType.Json,
      required: true,
      description: "CandidateCollection from upstream (e.g. SocialFormat or Ranking)",
    },
  ],
  outputs: [
    {
      id: "bundle_out",
      label: "Bundle Manifest",
      type: PortType.Json,
      description: "Structured export manifest with assets, social entries, and summary",
    },
    {
      id: "candidates_out",
      label: "Exported Candidates",
      type: PortType.Json,
      description: "CandidateCollection with export metadata attached",
    },
  ],

  parameterSchema: [
    {
      key: "bundleName",
      label: "Bundle Name",
      type: "string",
      placeholder: "campaign-spring-2026",
      description: "Name for the export bundle",
    },
    {
      key: "format",
      label: "Export Format",
      type: "enum",
      defaultValue: "manifest-only",
      options: [
        { value: "manifest-only", label: "Manifest Only (JSON)" },
        { value: "zip", label: "ZIP Archive" },
        { value: "folder", label: "Folder Structure" },
      ],
      description: "Output format (zip/folder require file system — currently manifest-only)",
    },
    {
      key: "includeImages",
      label: "Include Image Assets",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "includeMetadata",
      label: "Include Metadata",
      type: "boolean",
      defaultValue: true,
      description: "Include provenance and collection metadata",
    },
    {
      key: "includeSocialText",
      label: "Include Social Text",
      type: "boolean",
      defaultValue: true,
      description: "Include captions, hashtags, and CTAs from SocialFormat",
    },
    {
      key: "includeScores",
      label: "Include Scores",
      type: "boolean",
      defaultValue: true,
      description: "Include scoring data per candidate",
    },
  ],

  uiSchema: {
    groups: [
      { label: "Bundle", fields: ["bundleName", "format"] },
      { label: "Contents", fields: ["includeImages", "includeMetadata", "includeSocialText", "includeScores"] },
    ],
  },

  runtimeKind: NodeRuntimeKind.Capability,
  tags: ["export", "bundle", "campaign", "manifest"],
  isAvailable: true,
};

/**
 * Ranking node — sorts and selects items by score.
 *
 * Takes parallel arrays of items and scores, sorts by score descending,
 * and returns ranked results. Supports topK, threshold, and sort-only modes.
 */
export const rankingNode: NodeDefinition = {
  type: "ranking",
  label: "Ranking",
  category: NodeCategory.Scoring,
  description: "Sort and select items by score. Supports top-K selection, threshold filtering, and plain sorting.",
  icon: "trophy",

  inputs: [
    {
      id: "items_in",
      label: "Items",
      type: PortType.Json,
      required: true,
      isArray: true,
      description: "CandidateCollection or array of items to rank",
    },
    {
      id: "scores_in",
      label: "Scores",
      type: PortType.Json,
      required: false,
      isArray: true,
      description: "Parallel score array (optional if items already have scores from upstream)",
    },
  ],
  outputs: [
    {
      id: "top_items_out",
      label: "Top Items",
      type: PortType.Json,
      description: "CandidateSelection — selected items based on mode (topK or threshold)",
    },
    {
      id: "ranked_items_out",
      label: "Ranked Items",
      type: PortType.Json,
      description: "CandidateCollection — all items sorted by score with rank metadata",
    },
  ],

  parameterSchema: [
    {
      key: "mode",
      label: "Selection Mode",
      type: "enum",
      defaultValue: "topK",
      options: [
        { value: "topK", label: "Top K" },
        { value: "threshold", label: "Threshold" },
        { value: "sort", label: "Sort Only" },
      ],
      description: "How to select results: top K by count, threshold by minimum score, or sort only",
    },
    {
      key: "topK",
      label: "Top K",
      type: "number",
      min: 1,
      max: 100,
      step: 1,
      defaultValue: 5,
      description: "Number of top items to select (used in topK mode)",
    },
    {
      key: "threshold",
      label: "Score Threshold",
      type: "number",
      min: 0,
      max: 100,
      step: 1,
      description: "Minimum score to include (used in threshold mode)",
    },
  ],

  uiSchema: {
    groups: [
      { label: "Selection", fields: ["mode", "topK", "threshold"] },
    ],
  },

  runtimeKind: NodeRuntimeKind.Capability,
  tags: ["scoring", "ranking", "selection", "filter"],
  isAvailable: true,
};

export const capabilityNodes: NodeDefinition[] = [
  clipScoringNode,
  socialFormatNode,
  exportBundleNode,
  rankingNode,
];
