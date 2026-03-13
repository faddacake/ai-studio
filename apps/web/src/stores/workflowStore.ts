"use client";

import { create } from "zustand";
import type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowGraph,
} from "@aistudio/shared";
import type { RunDebugSnapshot } from "@aistudio/engine";
import {
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type Connection,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from "@xyflow/react";

// ── React Flow ↔ WorkflowNode adapters ──

export function toFlowNode(wn: WorkflowNode): Node {
  return {
    id: wn.id,
    type: "custom",
    position: wn.position,
    data: {
      ...wn.data,
      inputs: wn.inputs,
      outputs: wn.outputs,
      nodeType: wn.type,
    },
  };
}

export function toFlowEdge(we: WorkflowEdge): Edge {
  return {
    id: we.id,
    source: we.source,
    sourceHandle: we.sourceHandle,
    target: we.target,
    targetHandle: we.targetHandle,
    type: "default",
  };
}

export function fromFlowNode(node: Node): WorkflowNode {
  const d = node.data as Record<string, unknown>;
  return {
    id: node.id,
    type: (d.nodeType as string) ?? "unknown",
    position: node.position,
    data: {
      label: (d.label as string) ?? "",
      params: (d.params as Record<string, unknown>) ?? {},
      retryCount: (d.retryCount as number) ?? 1,
      timeoutMs: (d.timeoutMs as number) ?? 300_000,
      ...(d.providerId ? { providerId: d.providerId as string } : {}),
      ...(d.modelId ? { modelId: d.modelId as string } : {}),
    },
    inputs: (d.inputs as WorkflowNode["inputs"]) ?? [],
    outputs: (d.outputs as WorkflowNode["outputs"]) ?? [],
  };
}

// ── Store types ──

interface WorkflowMeta {
  id: string;
  name: string;
  description: string;
}

interface HistorySnapshot {
  nodes: Node[];
  edges: Edge[];
}

interface WorkflowState {
  // Workflow identity
  meta: WorkflowMeta | null;

  // React Flow state
  nodes: Node[];
  edges: Edge[];

  // Undo history
  historyStack: HistorySnapshot[];

  // UI state
  selectedNodeId: string | null;
  paletteOpen: boolean;
  inspectorOpen: boolean;
  debuggerOpen: boolean;
  templatePickerOpen: boolean;
  saveAsTemplateOpen: boolean;
  debugSnapshot: RunDebugSnapshot | null;
  currentRunId: string | null;
  dirty: boolean;
  saving: boolean;
  isRunning: boolean;

  // React Flow callbacks
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;

  // Actions
  loadWorkflow: (meta: WorkflowMeta, graph: WorkflowGraph) => void;
  addNode: (node: WorkflowNode) => void;
  removeNode: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  updateNodeParam: (nodeId: string, key: string, value: unknown) => void;
  togglePalette: () => void;
  toggleInspector: () => void;
  toggleDebugger: () => void;
  toggleTemplatePicker: () => void;
  toggleSaveAsTemplate: () => void;
  setDebugSnapshot: (snapshot: RunDebugSnapshot | null) => void;
  setCurrentRunId: (runId: string | null) => void;
  saveGraph: () => Promise<void>;
  runWorkflow: () => Promise<void>;
  updateMetaName: (name: string) => void;
  getWorkflowGraph: () => WorkflowGraph;
  pushHistory: () => void;
  undo: () => void;
}

// ── Store ──

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  meta: null,
  nodes: [],
  edges: [],
  historyStack: [],
  selectedNodeId: null,
  paletteOpen: true,
  inspectorOpen: false,
  debuggerOpen: false,
  templatePickerOpen: false,
  saveAsTemplateOpen: false,
  debugSnapshot: null,
  currentRunId: null,
  dirty: false,
  saving: false,
  isRunning: false,

  pushHistory: () => {
    const { nodes, edges, historyStack } = get();
    const snapshot: HistorySnapshot = { nodes, edges };
    const next = historyStack.length >= 50
      ? [...historyStack.slice(1), snapshot]
      : [...historyStack, snapshot];
    set({ historyStack: next });
  },

  undo: () => {
    const { historyStack } = get();
    if (historyStack.length === 0) return;
    const snapshot = historyStack[historyStack.length - 1];
    set({
      nodes: snapshot.nodes,
      edges: snapshot.edges,
      historyStack: historyStack.slice(0, -1),
      selectedNodeId: null,
      dirty: true,
    });
  },

  onNodesChange: (changes) => {
    if (changes.some((c) => c.type === "remove")) {
      get().pushHistory();
    }
    set((s) => ({
      nodes: applyNodeChanges(changes, s.nodes),
      dirty: true,
    }));
  },

  onEdgesChange: (changes) => {
    if (changes.some((c) => c.type === "remove")) {
      get().pushHistory();
    }
    set((s) => ({
      edges: applyEdgeChanges(changes, s.edges),
      dirty: true,
    }));
  },

  onConnect: (connection) => {
    get().pushHistory();
    set((s) => ({
      edges: addEdge(
        { ...connection, id: crypto.randomUUID(), type: "default" },
        s.edges,
      ),
      dirty: true,
    }));
  },

  loadWorkflow: (meta, graph) => {
    set({
      meta,
      nodes: graph.nodes.map(toFlowNode),
      edges: graph.edges.map(toFlowEdge),
      selectedNodeId: null,
      dirty: false,
      historyStack: [],
    });
  },

  addNode: (node) => {
    get().pushHistory();
    set((s) => ({
      nodes: [...s.nodes, toFlowNode(node)],
      dirty: true,
    }));
  },

  removeNode: (nodeId) => {
    get().pushHistory();
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== nodeId),
      edges: s.edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId,
      ),
      selectedNodeId: s.selectedNodeId === nodeId ? null : s.selectedNodeId,
      dirty: true,
    }));
  },

  selectNode: (nodeId) => {
    set({
      selectedNodeId: nodeId,
      inspectorOpen: nodeId !== null,
    });
  },

  updateNodeParam: (nodeId, key, value) => {
    get().pushHistory();
    set((s) => ({
      nodes: s.nodes.map((n) => {
        if (n.id !== nodeId) return n;
        const params = { ...(n.data.params as Record<string, unknown>), [key]: value };
        return { ...n, data: { ...n.data, params } };
      }),
      dirty: true,
    }));
  },

  togglePalette: () => set((s) => ({ paletteOpen: !s.paletteOpen })),
  toggleInspector: () => set((s) => ({ inspectorOpen: !s.inspectorOpen })),
  toggleDebugger: () => set((s) => ({ debuggerOpen: !s.debuggerOpen })),
  toggleTemplatePicker: () => set((s) => ({ templatePickerOpen: !s.templatePickerOpen })),
  toggleSaveAsTemplate: () => set((s) => ({ saveAsTemplateOpen: !s.saveAsTemplateOpen })),
  setDebugSnapshot: (snapshot) => set({ debugSnapshot: snapshot }),
  setCurrentRunId: (runId) => set({ currentRunId: runId }),

  getWorkflowGraph: () => {
    const { nodes, edges } = get();
    return {
      version: 1 as const,
      nodes: nodes.map(fromFlowNode),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        sourceHandle: e.sourceHandle ?? "",
        target: e.target,
        targetHandle: e.targetHandle ?? "",
      })),
    };
  },

  saveGraph: async () => {
    const { meta } = get();
    if (!meta) return;

    set({ saving: true });
    try {
      const graph = get().getWorkflowGraph();
      const res = await fetch(`/api/workflows/${meta.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ graph }),
      });
      if (res.ok) {
        set({ dirty: false });
      }
    } finally {
      set({ saving: false });
    }
  },

  updateMetaName: (name) => {
    set((s) => ({
      meta: s.meta ? { ...s.meta, name } : s.meta,
    }));
  },

  runWorkflow: async () => {
    const { meta, dirty } = get();
    if (!meta) return;

    set({ isRunning: true });
    try {
      // Auto-save so the DB has the latest graph before running
      if (dirty) {
        await get().saveGraph();
      }

      const res = await fetch(`/api/workflows/${meta.id}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`Failed to start run: ${res.status}`);
      const { id: runId } = (await res.json()) as { id: string };

      // Clear stale snapshot immediately so the debugger doesn't flash the
      // previous run's state while the SSE connection is being established.
      set({ currentRunId: runId, debuggerOpen: true, debugSnapshot: null });
    } catch (err) {
      console.error("[runWorkflow]", err);
    } finally {
      set({ isRunning: false });
    }
  },
}));
