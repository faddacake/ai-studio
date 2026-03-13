"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import Link from "next/link";
import type { Connection, Edge, Node, OnBeforeDelete } from "@xyflow/react";
import type { WorkflowNode, WorkflowGraph } from "@aistudio/shared";
import { useWorkflowStore, fromFlowNode } from "@/stores/workflowStore";
import { useRunEvents } from "@/hooks/useRunEvents";
import { isConnectionValid } from "@/lib/connectionValidation";
import { NodePalette } from "./NodePalette";
import { TemplatePicker } from "./TemplatePicker";
import { SaveAsTemplateDialog } from "./SaveAsTemplateDialog";
import { CustomNode } from "./CustomNode";
import { ConfirmReplaceDialog } from "./ConfirmReplaceDialog";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import { InspectorPanel } from "@/components/inspector";
import { RunDebuggerPanel, RunOutputsPanel } from "@/components/debugger";

// ── Node types map (stable reference) ──

const nodeTypes: NodeTypes = { custom: CustomNode };

// ── Inner canvas (needs ReactFlowProvider ancestor) ──

function CanvasInner() {
  const {
    nodes,
    edges,
    meta,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectedNodeId,
    paletteOpen,
    inspectorOpen,
    debuggerOpen,
    templatePickerOpen,
    saveAsTemplateOpen,
    debugSnapshot,
    currentRunId,
    dirty,
    saving,
    isRunning,
    addNode,
    selectNode,
    updateNodeParam,
    loadWorkflow,
    togglePalette,
    toggleDebugger,
    toggleTemplatePicker,
    toggleSaveAsTemplate,
    saveGraph,
    runWorkflow,
    updateMetaName,
    getWorkflowGraph,
    pushHistory,
    undo,
    redo,
  } = useWorkflowStore();

  // ── Debug panel tab ───────────────────────────────────────────────────────
  const [activeDebugTab, setActiveDebugTab] = useState<"nodes" | "outputs">("nodes");

  // ── Template refresh key — incremented after a successful Save as Template ──
  const [templateRefreshKey, setTemplateRefreshKey] = useState(0);

  // ── Inline workflow rename ────────────────────────────────────────────────
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const handleStartRename = useCallback(() => {
    setNameInput(meta?.name ?? "");
    setEditingName(true);
  }, [meta?.name]);

  const handleCommitRename = useCallback(async () => {
    const trimmed = nameInput.trim();
    setEditingName(false);
    if (!trimmed || !meta || trimmed === meta.name) return;
    const previous = meta.name;
    updateMetaName(trimmed);
    try {
      const res = await fetch(`/api/workflows/${meta.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error(`PATCH failed: ${res.status}`);
    } catch {
      updateMetaName(previous);
    }
  }, [nameInput, meta, updateMetaName]);

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") { e.currentTarget.blur(); }
      if (e.key === "Escape") { setEditingName(false); }
    },
    [],
  );

  // ── Export workflow ───────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!meta?.id || exporting) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/workflows/${meta.id}/export`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? `${meta.name}.workflow.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [meta, exporting]);

  // Subscribe to SSE run events — updates debugSnapshot in the store,
  // which drives the status dots on CustomNode and the RunDebuggerPanel.
  useRunEvents(meta?.id ?? "", currentRunId);

  // ── Run-complete badge ────────────────────────────────────────────────────
  // Shows briefly next to the Run Workflow button when a run reaches a
  // terminal status, then auto-dismisses after 3 s.

  const [runBadge, setRunBadge] = useState<{
    label: string;
    colorClass: string;
  } | null>(null);
  const badgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const TERMINAL_BADGE: Record<string, { label: string; colorClass: string }> = {
    completed:       { label: "✓ Completed",       colorClass: "border-emerald-600 bg-emerald-600/10 text-emerald-400" },
    failed:          { label: "✗ Failed",           colorClass: "border-red-600 bg-red-600/10 text-red-400" },
    partial_failure: { label: "✗ Partial Failure",  colorClass: "border-red-600 bg-red-600/10 text-red-400" },
    cancelled:       { label: "— Cancelled",        colorClass: "border-yellow-500 bg-yellow-500/10 text-yellow-400" },
    budget_exceeded: { label: "— Budget Exceeded",  colorClass: "border-yellow-500 bg-yellow-500/10 text-yellow-400" },
  };

  // Detect transition to terminal status → show badge
  useEffect(() => {
    const status = debugSnapshot?.status;
    if (!status) return;
    const badge = TERMINAL_BADGE[status];
    if (!badge) return;

    setRunBadge(badge);
    if (badgeTimerRef.current) clearTimeout(badgeTimerRef.current);
    badgeTimerRef.current = setTimeout(() => {
      setRunBadge(null);
      badgeTimerRef.current = null;
    }, 3000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debugSnapshot?.status]);

  // New run started → dismiss badge immediately
  useEffect(() => {
    if (!isRunning) return;
    setRunBadge(null);
    if (badgeTimerRef.current) {
      clearTimeout(badgeTimerRef.current);
      badgeTimerRef.current = null;
    }
  }, [isRunning]);

  // Cleanup timer on unmount
  useEffect(() => () => {
    if (badgeTimerRef.current) clearTimeout(badgeTimerRef.current);
  }, []);

  const { screenToFlowPosition } = useReactFlow();

  // Pending template load — set when dirty=true and user picks a template.
  // Cleared on cancel or after confirming the replace.
  const [pendingTemplate, setPendingTemplate] = useState<{
    graph: WorkflowGraph;
    name: string;
  } | null>(null);

  // Pending node deletion — set when the node has connected edges.
  // The resolver lets us resolve the onBeforeDelete promise from dialog actions.
  const deleteResolverRef = useRef<((confirmed: boolean) => void) | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    nodeLabel: string;
    edgeCount: number;
  } | null>(null);

  const handleBeforeDelete: OnBeforeDelete<Node, Edge> = useCallback(
    ({ nodes: deletingNodes }) => {
      // Count edges connected to any node being deleted
      const connectedEdges = edges.filter(
        (e) => deletingNodes.some((n) => n.id === e.source || n.id === e.target),
      );

      if (connectedEdges.length === 0) return Promise.resolve(true);

      // Hold the deletion and wait for user confirmation
      const firstLabel = (deletingNodes[0]?.data?.label as string | undefined) ?? "Node";
      setPendingDelete({ nodeLabel: firstLabel, edgeCount: connectedEdges.length });

      return new Promise<boolean>((resolve) => {
        deleteResolverRef.current = resolve;
      });
    },
    [edges],
  );

  const handleConfirmDelete = useCallback(() => {
    deleteResolverRef.current?.(true);
    deleteResolverRef.current = null;
    setPendingDelete(null);
  }, []);

  const handleCancelDelete = useCallback(() => {
    deleteResolverRef.current?.(false);
    deleteResolverRef.current = null;
    setPendingDelete(null);
  }, []);

  // Find the selected workflow node for the inspector
  const selectedNode: WorkflowNode | null = useMemo(() => {
    if (!selectedNodeId) return null;
    const flowNode = nodes.find((n) => n.id === selectedNodeId);
    if (!flowNode) return null;
    return fromFlowNode(flowNode);
  }, [selectedNodeId, nodes]);

  // Add node from palette at center of viewport
  const handleAddNode = useCallback(
    (node: WorkflowNode) => {
      const position = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
      addNode({ ...node, position });
    },
    [addNode, screenToFlowPosition],
  );

  // Node click → select
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: { id: string }) => {
      selectNode(node.id);
    },
    [selectNode],
  );

  // Click on pane → deselect
  const handlePaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  // Port compatibility check — passed to ReactFlow as isValidConnection.
  // When false, ReactFlow refuses the drag and shows a red indicator.
  const handleIsValidConnection = useCallback(
    (connection: Connection | Edge) => isConnectionValid(nodes, connection),
    [nodes],
  );

  // Load a template graph into the store.
  // If the canvas has unsaved changes, hold the selection in pendingTemplate
  // and wait for the user to confirm before replacing the graph.
  const applyTemplate = useCallback(
    (graph: WorkflowGraph, name: string) => {
      const meta = useWorkflowStore.getState().meta;
      if (meta) {
        loadWorkflow(meta, graph);
      } else {
        loadWorkflow({ id: crypto.randomUUID(), name, description: "" }, graph);
      }
    },
    [loadWorkflow],
  );

  const handleTemplateSelect = useCallback(
    (graph: WorkflowGraph, name: string) => {
      if (nodes.length > 0) {
        setPendingTemplate({ graph, name });
      } else {
        applyTemplate(graph, name);
      }
    },
    [nodes.length, applyTemplate],
  );

  const handleConfirmReplace = useCallback(() => {
    if (pendingTemplate) {
      applyTemplate(pendingTemplate.graph, pendingTemplate.name);
      setPendingTemplate(null);
    }
  }, [pendingTemplate, applyTemplate]);

  const handleCancelReplace = useCallback(() => {
    setPendingTemplate(null);
  }, []);

  // Push history on drag start so node moves are undoable
  const handleNodeDragStart = useCallback(() => {
    pushHistory();
  }, [pushHistory]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveGraph();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (e.ctrlKey && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    },
    [saveGraph, undo, redo],
  );

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div className="flex h-full w-full" onKeyDown={handleKeyDown}>
      {/* Left: Node Palette */}
      <NodePalette
        onAddNode={handleAddNode}
        onApplyTemplate={handleTemplateSelect}
        templateRefreshKey={templateRefreshKey}
        open={paletteOpen}
        onToggle={togglePalette}
      />

      {/* Center: React Flow Canvas */}
      <div className="relative flex-1">
        {/* Empty-state hint — visible only when the canvas has no nodes */}
        {nodes.length === 0 && (
          <div
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
            aria-hidden="true"
          >
            <div className="flex flex-col items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/80 px-8 py-6 text-center backdrop-blur-sm">
              <p className="text-sm font-semibold text-neutral-300">No nodes yet</p>
              <p className="text-xs leading-relaxed text-neutral-500">
                Add nodes from the palette on the left,
                <br />
                or start from a{" "}
                <button
                  type="button"
                  onClick={toggleTemplatePicker}
                  className="pointer-events-auto font-medium text-neutral-300 underline underline-offset-2 hover:text-white"
                >
                  Template
                </button>
                .
              </p>
            </div>
          </div>
        )}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          isValidConnection={handleIsValidConnection}
          onBeforeDelete={handleBeforeDelete}
          onNodeClick={handleNodeClick}
          onNodeDragStart={handleNodeDragStart}
          onPaneClick={handlePaneClick}
          fitView
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ type: "default", animated: true }}
          className="bg-neutral-950"
        >
          <Background color="#333" gap={20} />
          <Controls
            className="!bg-neutral-800 !border-neutral-700 !rounded-lg [&>button]:!bg-neutral-800 [&>button]:!border-neutral-700 [&>button]:!text-neutral-300 [&>button:hover]:!bg-neutral-700"
          />
          <MiniMap
            className="!bg-neutral-900 !border-neutral-700 !rounded-lg"
            nodeColor="#525252"
            maskColor="rgba(0,0,0,0.6)"
          />
        </ReactFlow>

        {/* Top bar: workflow controls */}
        <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
          <Link
            href="/workflows"
            className="text-xs text-neutral-500 transition-colors hover:text-neutral-300"
            title="Back to workflows"
          >
            ← Workflows
          </Link>
          {meta && (
            <Link
              href={`/workflows/${meta.id}/history`}
              className="mr-1 text-xs text-neutral-500 transition-colors hover:text-neutral-300"
              title="View run history"
            >
              Run History
            </Link>
          )}
          {editingName ? (
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={handleCommitRename}
              onKeyDown={handleNameKeyDown}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              className="mr-1 w-[180px] rounded border border-neutral-600 bg-neutral-800 px-1.5 py-0.5 text-xs font-medium text-neutral-200 outline-none focus:border-neutral-500"
            />
          ) : (
            <button
              type="button"
              onClick={handleStartRename}
              title="Click to rename"
              className="mr-1 max-w-[200px] cursor-text truncate rounded px-1.5 py-0.5 text-xs font-medium text-neutral-400 hover:bg-neutral-800 hover:text-neutral-300"
            >
              {meta?.name ?? "Untitled workflow"}
            </button>
          )}
          <button
            type="button"
            onClick={toggleTemplatePicker}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              templatePickerOpen
                ? "border-purple-500 bg-purple-500/10 text-purple-400"
                : "border-neutral-700 bg-neutral-900 text-neutral-400 hover:bg-neutral-800"
            }`}
          >
            Templates
          </button>
          <button
            type="button"
            onClick={toggleDebugger}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              debuggerOpen
                ? "border-blue-500 bg-blue-500/10 text-blue-400"
                : "border-neutral-700 bg-neutral-900 text-neutral-400 hover:bg-neutral-800"
            }`}
          >
            Debugger
          </button>
          <button
            type="button"
            onClick={saveGraph}
            disabled={!dirty || saving}
            title={
              saving ? "Saving…" :
              !dirty ? "No unsaved changes" :
              undefined
            }
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              dirty && !saving
                ? "border-blue-500 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                : "border-neutral-700 bg-neutral-900 text-neutral-600 cursor-default"
            }`}
          >
            {saving ? "Saving..." : dirty ? (<>Save <span className="opacity-50">⌘S</span></>) : "Saved"}
          </button>
          <button
            type="button"
            onClick={toggleSaveAsTemplate}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-300"
          >
            Save as Template
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={!meta || exporting}
            title={!meta ? "No workflow loaded" : undefined}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-300 disabled:cursor-default disabled:text-neutral-600"
          >
            {exporting ? "Exporting…" : "Export"}
          </button>
          <span className="h-4 w-px bg-neutral-700 mx-1" aria-hidden="true" />
          <button
            type="button"
            onClick={runWorkflow}
            disabled={isRunning || !meta || nodes.length === 0}
            title={
              isRunning        ? "Run is starting…"              :
              !meta            ? "No workflow loaded"             :
              nodes.length === 0 ? "Add nodes to the canvas first" :
              undefined
            }
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              isRunning || !meta || nodes.length === 0
                ? "border-neutral-700 bg-neutral-900 text-neutral-600 cursor-default"
                : "border-emerald-600 bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20"
            }`}
          >
            {/* Live pulse dot — visible only while the run is actively executing */}
            {!isRunning && debugSnapshot?.status === "running" && (
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full animate-pulse"
                style={{ backgroundColor: "#60a5fa" }}
                aria-label="Run in progress"
              />
            )}
            {isRunning ? "Starting..." : "Run Workflow"}
          </button>
          {runBadge && (
            <span
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${runBadge.colorClass}`}
            >
              {runBadge.label}
            </span>
          )}
          <span className="ml-1 text-xs text-neutral-600 select-none">
            {nodes.length} {nodes.length === 1 ? "node" : "nodes"} · {edges.length} {edges.length === 1 ? "edge" : "edges"}
          </span>
        </div>
      </div>

      {/* Right: Inspector Panel */}
      {inspectorOpen && selectedNode && (
        <InspectorPanel
          selectedNode={selectedNode}
          onParamChange={updateNodeParam}
          onClose={() => selectNode(null)}
        />
      )}

      {/* Bottom: Debugger Panel (slides up) */}
      {debuggerOpen && (
        <div className="absolute bottom-0 left-0 right-0 z-20 flex max-h-[40vh] flex-col border-t border-neutral-800 bg-neutral-950">
          {/* Tab bar */}
          <div className="flex shrink-0 items-center gap-0.5 border-b border-neutral-800 px-3 pt-1.5 pb-0">
            <DebugTabButton
              label="Nodes"
              active={activeDebugTab === "nodes"}
              onClick={() => setActiveDebugTab("nodes")}
            />
            <DebugTabButton
              label="Outputs"
              active={activeDebugTab === "outputs"}
              onClick={() => setActiveDebugTab("outputs")}
            />
          </div>
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {activeDebugTab === "nodes" ? (
              debugSnapshot ? (
                <RunDebuggerPanel
                  snapshot={debugSnapshot}
                  onNodeClick={(nodeId) => selectNode(nodeId)}
                />
              ) : (
                <div className="px-4 py-4 text-xs text-neutral-500">
                  {currentRunId
                    ? "Connecting to run\u2026"
                    : "No run yet \u2014 click \u201cRun Workflow\u201d to start."}
                </div>
              )
            ) : (
              <RunOutputsPanel
                workflowId={meta?.id ?? ""}
                runId={currentRunId}
                snapshot={debugSnapshot}
              />
            )}
          </div>
        </div>
      )}

      {/* Template Picker Modal */}
      <TemplatePicker
        open={templatePickerOpen}
        onClose={toggleTemplatePicker}
        onSelect={handleTemplateSelect}
      />

      {/* Save as Template Dialog */}
      <SaveAsTemplateDialog
        open={saveAsTemplateOpen}
        onClose={toggleSaveAsTemplate}
        getGraph={getWorkflowGraph}
        defaultName={useWorkflowStore.getState().meta?.name}
        onSaved={() => setTemplateRefreshKey((k) => k + 1)}
      />

      {/* Confirm delete dialog — shown when deleting a node with connected edges */}
      <ConfirmDeleteDialog
        open={pendingDelete !== null}
        nodeLabel={pendingDelete?.nodeLabel}
        edgeCount={pendingDelete?.edgeCount ?? 0}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />

      {/* Confirm replace dialog — shown when non-empty canvas + template selected */}
      <ConfirmReplaceDialog
        open={pendingTemplate !== null}
        templateName={pendingTemplate?.name}
        graph={pendingTemplate?.graph}
        onCancel={handleCancelReplace}
        onConfirm={handleConfirmReplace}
      />
    </div>
  );
}

// ── Debug tab button ──

function DebugTabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-t px-3 py-1.5 text-[11px] font-medium transition-colors ${
        active
          ? "border-b-2 border-blue-500 text-neutral-100"
          : "text-neutral-500 hover:text-neutral-300"
      }`}
    >
      {label}
    </button>
  );
}

// ── Exported wrapper with provider ──

export function WorkflowCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
