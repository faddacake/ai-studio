import type { Edge, Node } from "@xyflow/react";

/**
 * Returns the IDs of all nodes reachable downstream from `startNodeId`
 * following edge direction (source → target), in breadth-first order.
 * The start node itself is included as the first element.
 *
 * Only IDs present in `nodes` are included — dangling edge targets are ignored.
 */
export function getDownstreamNodeIds(
  startNodeId: string,
  nodes: Node[],
  edges: Edge[],
): string[] {
  const nodeIdSet = new Set(nodes.map((n) => n.id));
  const visited = new Set<string>();
  const queue: string[] = [startNodeId];
  const result: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    if (nodeIdSet.has(current)) {
      result.push(current);
    }
    for (const edge of edges) {
      if (edge.source === current && !visited.has(edge.target)) {
        queue.push(edge.target);
      }
    }
  }

  return result;
}
