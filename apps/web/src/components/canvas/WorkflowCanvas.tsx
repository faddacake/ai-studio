"use client";

import { useCallback, useMemo } from "react";
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

import type { WorkflowNode, WorkflowGraph } from "@aistudio/shared";
import { useWorkflowStore, fromFlowNode } from "@/stores/workflowStore";
import { NodePalette } from "./NodePalette";
import { TemplatePicker } from "./TemplatePicker";
import { CustomNode } from "./CustomNode";
import { InspectorPanel } from "@/components/inspector";
import { RunDebuggerPanel } from "@/components/debugger";

// ── Node types map (stable reference) ──

const nodeTypes: NodeTypes = { custom: CustomNode };

// ── Inner canvas (needs ReactFlowProvider ancestor) ──

function CanvasInner() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectedNodeId,
    paletteOpen,
    inspectorOpen,
    debuggerOpen,
    templatePickerOpen,
    debugSnapshot,
    dirty,
    saving,
    addNode,
    selectNode,
    updateNodeParam,
    loadWorkflow,
    togglePalette,
    toggleDebugger,
    toggleTemplatePicker,
    saveGraph,
  } = useWorkflowStore();

  const { screenToFlowPosition } = useReactFlow();

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

  // Load a template graph into the store
  const handleTemplateSelect = useCallback(
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

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveGraph();
      }
    },
    [saveGraph],
  );

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div className="flex h-full w-full" onKeyDown={handleKeyDown}>
      {/* Left: Node Palette */}
      <NodePalette
        onAddNode={handleAddNode}
        open={paletteOpen}
        onToggle={togglePalette}
      />

      {/* Center: React Flow Canvas */}
      <div className="relative flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
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
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              dirty && !saving
                ? "border-blue-500 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                : "border-neutral-700 bg-neutral-900 text-neutral-600 cursor-default"
            }`}
          >
            {saving ? "Saving..." : dirty ? "Save" : "Saved"}
          </button>
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
      {debuggerOpen && debugSnapshot && (
        <div className="absolute bottom-0 left-0 right-0 z-20 max-h-[40vh] overflow-y-auto border-t border-neutral-800 bg-neutral-950">
          <RunDebuggerPanel
            snapshot={debugSnapshot}
            onNodeClick={(nodeId) => selectNode(nodeId)}
          />
        </div>
      )}

      {/* Template Picker Modal */}
      <TemplatePicker
        open={templatePickerOpen}
        onClose={toggleTemplatePicker}
        onSelect={handleTemplateSelect}
      />
    </div>
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
