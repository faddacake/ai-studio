"use client";

import { useState } from "react";
import type { WorkflowNode } from "@aistudio/shared";
import { NodeConfig } from "./NodeConfig";

type InspectorTab = "config" | "ports" | "run";

interface InspectorPanelProps {
  /** The currently selected node, or null if nothing is selected */
  selectedNode: WorkflowNode | null;
  /** Called when a parameter value changes */
  onParamChange: (nodeId: string, key: string, value: unknown) => void;
  /** Called when the panel is closed */
  onClose?: () => void;
}

/**
 * Right-side sliding inspector panel.
 * Opens when a node is selected. Delegates configuration rendering
 * to NodeConfig, which is entirely schema-driven.
 */
export function InspectorPanel({ selectedNode, onParamChange, onClose }: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<InspectorTab>("config");

  if (!selectedNode) {
    return null;
  }

  return (
    <div className="flex h-full w-80 flex-col border-l border-neutral-800 bg-neutral-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2">
        <h3 className="text-sm font-medium text-neutral-200 truncate">
          {selectedNode.data.label}
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
            aria-label="Close inspector"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-neutral-800">
        {(["config", "ports", "run"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-xs font-medium capitalize transition-colors ${
              activeTab === tab
                ? "border-b-2 border-blue-500 text-blue-400"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "config" && (
          <NodeConfig node={selectedNode} onParamChange={onParamChange} />
        )}
        {activeTab === "ports" && (
          <PortsTab node={selectedNode} />
        )}
        {activeTab === "run" && (
          <RunTab node={selectedNode} />
        )}
      </div>
    </div>
  );
}

// ── Ports tab ──

function PortsTab({ node }: { node: WorkflowNode }) {
  return (
    <div className="flex flex-col gap-4 p-3">
      {node.inputs.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-neutral-400 mb-2">Inputs</h4>
          <div className="flex flex-col gap-1">
            {node.inputs.map((port) => (
              <div key={port.id} className="flex items-center gap-2 text-xs">
                <PortDot type={port.type} />
                <span className="text-neutral-300">{port.name}</span>
                <span className="text-neutral-600">({port.type})</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {node.outputs.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-neutral-400 mb-2">Outputs</h4>
          <div className="flex flex-col gap-1">
            {node.outputs.map((port) => (
              <div key={port.id} className="flex items-center gap-2 text-xs">
                <PortDot type={port.type} />
                <span className="text-neutral-300">{port.name}</span>
                <span className="text-neutral-600">({port.type})</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {node.inputs.length === 0 && node.outputs.length === 0 && (
        <p className="text-xs text-neutral-500 italic">This node has no ports.</p>
      )}
    </div>
  );
}

// ── Run tab (placeholder for future SSE integration) ──

function RunTab({ node }: { node: WorkflowNode }) {
  return (
    <div className="flex flex-col gap-3 p-3">
      <p className="text-xs text-neutral-500 italic">
        Run details will appear here during and after workflow execution.
      </p>
      <div className="rounded bg-neutral-800/50 p-2 text-[11px] text-neutral-500">
        <div>Node ID: <span className="text-neutral-400 font-mono">{node.id}</span></div>
        <div>Type: <span className="text-neutral-400">{node.type}</span></div>
        <div>Retry count: <span className="text-neutral-400">{node.data.retryCount}</span></div>
        <div>Timeout: <span className="text-neutral-400">{(node.data.timeoutMs / 1000).toFixed(0)}s</span></div>
      </div>
    </div>
  );
}

// ── Port color dot ──

const PORT_COLORS: Record<string, string> = {
  image: "bg-purple-500",
  video: "bg-orange-500",
  text: "bg-green-500",
  number: "bg-blue-500",
  json: "bg-yellow-500",
};

function PortDot({ type }: { type: string }) {
  return (
    <span className={`inline-block h-2 w-2 rounded-full ${PORT_COLORS[type] ?? "bg-neutral-500"}`} />
  );
}
