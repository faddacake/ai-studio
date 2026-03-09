/**
 * Candidate Contract — shared data types for multi-candidate pipelines.
 *
 * These types normalize the shape of items flowing between generation,
 * scoring, ranking, formatting, and export nodes. Any node that produces
 * or consumes batches of results should speak this contract.
 *
 * Design principles:
 * - CandidateItem is the atomic unit — one image, one video, one text result
 * - CandidateScore is a single metric measurement attached to an item
 * - CandidateCollection wraps a batch of items with provenance metadata
 * - All fields beyond `id` and `type` are optional to support progressive enrichment
 *   (generation → scoring → ranking → formatting → export)
 */

// ── Candidate Item ──

/** The kind of asset a candidate represents. */
export type CandidateType = "image" | "video" | "text" | "audio" | "json";

/**
 * A single candidate result flowing through the pipeline.
 *
 * This is the atomic unit of the candidate contract. Items start with
 * just an id, type, and value (from generation), then accumulate scores,
 * rank, and metadata as they pass through downstream nodes.
 */
export interface CandidateItem {
  /** Unique identifier (typically crypto.randomUUID) */
  id: string;
  /** What kind of asset this candidate is */
  type: CandidateType;
  /** The asset reference — URL, file path, base64 data, or inline value */
  value: unknown;
  /** The prompt that generated this candidate (if applicable) */
  prompt?: string;
  /** All scores attached to this candidate */
  scores?: CandidateScore[];
  /** 1-based rank within its collection (set by ranking nodes) */
  rank?: number;
  /** Which node produced this candidate */
  sourceNodeId?: string;
  /** Extensible metadata (model used, generation params, timing, etc.) */
  metadata?: CandidateMetadata;
}

// ── Candidate Score ──

/**
 * A single score measurement for a candidate.
 *
 * Candidates can accumulate multiple scores from different metrics
 * (CLIP similarity, aesthetic quality, safety, etc.). Each score
 * records the metric name, raw value, optional normalized value,
 * and the model/method that produced it.
 */
export interface CandidateScore {
  /** Name of the scoring metric (e.g. "clip_similarity", "aesthetic", "safety") */
  metric: string;
  /** Raw score value */
  value: number;
  /** Score normalized to 0–100 range (optional) */
  normalized?: number;
  /** Model or method that produced this score */
  model?: string;
}

// ── Candidate Metadata ──

/**
 * Extensible metadata bag for candidates.
 *
 * Common fields are typed; additional fields go in the index signature.
 */
export interface CandidateMetadata {
  /** Provider that generated this candidate */
  providerId?: string;
  /** Model that generated this candidate */
  modelId?: string;
  /** Generation duration in ms */
  durationMs?: number;
  /** Generation cost in USD */
  cost?: number;
  /** Any additional key-value pairs */
  [key: string]: unknown;
}

// ── Candidate Collection ──

/** What kind of processing produced this collection. */
export type CollectionType =
  | "generated"    // raw generation output
  | "scored"       // items have scores attached
  | "ranked"       // items are sorted by score with ranks
  | "selected"     // items filtered by topK/threshold
  | "formatted"    // items processed for output format
  | "mixed";       // heterogeneous or unknown origin

/**
 * A batch of candidate items with collection-level metadata.
 *
 * This is the primary data structure passed between capability nodes.
 * It wraps an array of CandidateItems and records how/where the
 * collection was produced.
 */
export interface CandidateCollection {
  /** The candidate items in this collection */
  items: CandidateItem[];
  /** What stage of processing produced this collection */
  collectionType?: CollectionType;
  /** Which node produced this collection */
  producedByNodeId?: string;
  /** Collection-level metadata */
  metadata?: CandidateMetadata;
}

// ── Candidate Selection ──

/**
 * The result of a selection/ranking operation.
 *
 * Extends CandidateCollection with selection-specific fields
 * so downstream nodes know what criteria were applied.
 */
export interface CandidateSelection extends CandidateCollection {
  /** How items were selected */
  selectionMode: "topK" | "threshold" | "sort" | "manual";
  /** The metric used for selection (if score-based) */
  selectionMetric?: string;
  /** Total items before selection */
  totalBeforeSelection: number;
}
