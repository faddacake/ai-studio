/**
 * Candidate Helpers — utility functions for working with the candidate contract.
 *
 * These composable functions handle the common operations nodes perform
 * on candidates: attaching scores, sorting, filtering, selecting, and
 * converting between raw arrays and typed collections.
 */

import type {
  CandidateItem,
  CandidateScore,
  CandidateCollection,
  CandidateSelection,
  CandidateType,
  CollectionType,
} from "./candidateTypes.js";

// ── Score attachment ──

/**
 * Attach a score to a candidate item (immutable — returns a new item).
 * Appends to existing scores array.
 */
export function attachScore(
  item: CandidateItem,
  score: CandidateScore,
): CandidateItem {
  return {
    ...item,
    scores: [...(item.scores ?? []), score],
  };
}

/**
 * Attach scores to all items in a collection (immutable).
 * `scoreFn` receives each item and its index, returns a CandidateScore.
 */
export function attachScores(
  collection: CandidateCollection,
  scoreFn: (item: CandidateItem, index: number) => CandidateScore,
): CandidateCollection {
  return {
    ...collection,
    collectionType: "scored",
    items: collection.items.map((item, i) => attachScore(item, scoreFn(item, i))),
  };
}

// ── Score retrieval ──

/**
 * Get the score value for a specific metric from a candidate.
 * Returns the normalized value if available, otherwise the raw value.
 * Returns undefined if the metric is not found.
 */
export function getScore(item: CandidateItem, metric: string): number | undefined {
  const score = item.scores?.find((s) => s.metric === metric);
  if (!score) return undefined;
  return score.normalized ?? score.value;
}

/**
 * Get the best (highest) score across all metrics for a candidate.
 * Uses normalized values when available.
 */
export function getBestScore(item: CandidateItem): number | undefined {
  if (!item.scores || item.scores.length === 0) return undefined;
  return Math.max(...item.scores.map((s) => s.normalized ?? s.value));
}

// ── Sorting ──

/**
 * Sort candidates by a specific score metric (descending by default).
 * Items without the metric are placed at the end.
 */
export function sortByMetric(
  items: CandidateItem[],
  metric: string,
  ascending = false,
): CandidateItem[] {
  const sorted = [...items].sort((a, b) => {
    const aScore = getScore(a, metric);
    const bScore = getScore(b, metric);
    if (aScore === undefined && bScore === undefined) return 0;
    if (aScore === undefined) return 1;
    if (bScore === undefined) return -1;
    return ascending ? aScore - bScore : bScore - aScore;
  });
  return sorted;
}

/**
 * Sort and assign ranks to candidates by a specific metric.
 * Returns new items with `rank` set (1-based).
 */
export function rankByMetric(
  items: CandidateItem[],
  metric: string,
): CandidateItem[] {
  const sorted = sortByMetric(items, metric);
  return sorted.map((item, i) => ({ ...item, rank: i + 1 }));
}

// ── Selection / filtering ──

/**
 * Take the top K candidates by a specific score metric.
 */
export function takeTopK(
  items: CandidateItem[],
  k: number,
  metric: string,
): CandidateItem[] {
  return rankByMetric(items, metric).slice(0, k);
}

/**
 * Filter candidates that meet a minimum score threshold for a metric.
 */
export function filterByThreshold(
  items: CandidateItem[],
  metric: string,
  threshold: number,
): CandidateItem[] {
  return items.filter((item) => {
    const score = getScore(item, metric);
    return score !== undefined && score >= threshold;
  });
}

/**
 * Select the single best candidate by a metric.
 * Returns undefined if no items have the metric.
 */
export function selectBest(
  items: CandidateItem[],
  metric: string,
): CandidateItem | undefined {
  const ranked = takeTopK(items, 1, metric);
  return ranked[0];
}

// ── Collection builders ──

/**
 * Wrap raw items into a CandidateCollection.
 */
export function toCollection(
  items: CandidateItem[],
  collectionType: CollectionType = "mixed",
  producedByNodeId?: string,
): CandidateCollection {
  return {
    items,
    collectionType,
    producedByNodeId,
  };
}

/**
 * Build a CandidateSelection from a collection after applying selection.
 */
export function toSelection(
  selected: CandidateItem[],
  totalBefore: number,
  mode: CandidateSelection["selectionMode"],
  metric?: string,
  producedByNodeId?: string,
): CandidateSelection {
  return {
    items: selected,
    collectionType: "selected",
    producedByNodeId,
    selectionMode: mode,
    selectionMetric: metric,
    totalBeforeSelection: totalBefore,
  };
}

// ── Conversion helpers ──

/**
 * Convert raw values (URLs, paths, etc.) into CandidateItems.
 * Useful for adapting provider node outputs into the candidate contract.
 */
export function fromRawValues(
  values: unknown[],
  type: CandidateType,
  sourceNodeId?: string,
  prompt?: string,
): CandidateItem[] {
  return values.map((value) => ({
    id: globalThis.crypto?.randomUUID?.() ?? `candidate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    value,
    prompt,
    sourceNodeId,
  }));
}

/**
 * Extract raw values from a CandidateCollection.
 * Useful for passing candidate data to nodes that expect raw arrays.
 */
export function extractValues(collection: CandidateCollection): unknown[] {
  return collection.items.map((item) => item.value);
}

/**
 * Check if an unknown value is a CandidateCollection.
 * Uses structural typing — checks for `items` array with candidate shape.
 */
export function isCandidateCollection(value: unknown): value is CandidateCollection {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  if (!Array.isArray(obj.items)) return false;
  if (obj.items.length === 0) return true;
  const first = obj.items[0] as Record<string, unknown>;
  return typeof first.id === "string" && typeof first.type === "string" && "value" in first;
}

/**
 * Normalize input that might be raw values or a CandidateCollection.
 * Always returns a CandidateCollection, converting raw values if needed.
 */
export function ensureCollection(
  input: unknown,
  fallbackType: CandidateType = "image",
  sourceNodeId?: string,
): CandidateCollection {
  if (isCandidateCollection(input)) return input;

  const values = Array.isArray(input) ? input : input ? [input] : [];
  return toCollection(
    fromRawValues(values, fallbackType, sourceNodeId),
    "generated",
  );
}

// ── Metadata helpers ──

/**
 * Merge additional metadata into a candidate item (immutable).
 * Existing metadata keys are preserved; new keys are added/overwritten.
 */
export function attachMetadata(
  item: CandidateItem,
  metadata: Record<string, unknown>,
): CandidateItem {
  return {
    ...item,
    metadata: { ...item.metadata, ...metadata },
  };
}

/**
 * Merge metadata into all items in a collection (immutable).
 * `metadataFn` receives each item and its index, returns metadata to merge.
 */
export function attachCollectionMetadata(
  collection: CandidateCollection,
  metadataFn: (item: CandidateItem, index: number) => Record<string, unknown>,
): CandidateCollection {
  return {
    ...collection,
    items: collection.items.map((item, i) => attachMetadata(item, metadataFn(item, i))),
  };
}
