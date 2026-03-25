/**
 * staleness — session-only stale-node tracking helpers.
 *
 * Delegates graph traversal to the canonical getDownstreamNodeIds helper
 * from downstream.ts so there is one traversal implementation.
 */
import type { Edge, Node } from "@xyflow/react";
import { getDownstreamNodeIds } from "./downstream";

/**
 * Returns a new staleNodeIds map with the given start node and all nodes
 * reachable downstream from it marked as stale.
 *
 * The existing map is spread first so callers accumulate stale state across
 * multiple edits without overwriting previous marks.
 */
export function computeStaleFromNode(
  startNodeId: string,
  nodes: Node[],
  edges: Edge[],
  existing: Record<string, true> = {},
): Record<string, true> {
  const ids = getDownstreamNodeIds(startNodeId, nodes, edges);
  if (ids.length === 0) return existing;
  const next = { ...existing };
  for (const id of ids) next[id] = true;
  return next;
}
