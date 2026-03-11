"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Port } from "@aistudio/shared";
import { useWorkflowStore } from "@/stores/workflowStore";

// ── Port color palette (matches InspectorPanel PortDot) ──

const PORT_COLORS: Record<string, string> = {
  image: "#a855f7",   // purple-500
  video: "#f97316",   // orange-500
  text: "#22c55e",    // green-500
  number: "#3b82f6",  // blue-500
  json: "#eab308",    // yellow-500
};

const RUNTIME_BADGE: Record<string, { label: string; className: string }> = {
  provider: { label: "AI", className: "bg-blue-500/20 text-blue-400" },
  local: { label: "Local", className: "bg-green-500/20 text-green-400" },
  virtual: { label: "Virtual", className: "bg-neutral-500/20 text-neutral-400" },
  capability: { label: "Cap", className: "bg-amber-500/20 text-amber-400" },
};

// ── Run status dot ──

const STATUS_DOT: Record<string, { color: string; pulse: boolean; label: string }> = {
  pending:   { color: "#a3a3a3", pulse: false, label: "Pending" },
  queued:    { color: "#facc15", pulse: false, label: "Queued" },
  running:   { color: "#60a5fa", pulse: true,  label: "Running" },
  completed: { color: "#4ade80", pulse: false, label: "Completed" },
  failed:    { color: "#f87171", pulse: false, label: "Failed" },
  cancelled: { color: "#737373", pulse: false, label: "Cancelled" },
};

// ── Component ──

function CustomNodeComponent({ id, data, selected }: NodeProps) {
  const inputs = (data.inputs as Port[]) ?? [];
  const outputs = (data.outputs as Port[]) ?? [];
  const label = (data.label as string) ?? "Node";
  const runtimeKind = (data.runtimeKind as string) ?? "";
  const badge = RUNTIME_BADGE[runtimeKind];

  // Per-node run status — only re-renders when this node's status changes
  const runStatus = useWorkflowStore((state) => {
    if (!state.debugSnapshot) return null;
    return state.debugSnapshot.nodes.find((n) => n.nodeId === id)?.status ?? null;
  });

  const dot = runStatus ? STATUS_DOT[runStatus] ?? null : null;

  return (
    <div
      className={`relative min-w-[160px] rounded-lg border bg-neutral-900 shadow-lg transition-colors ${
        selected
          ? "border-blue-500 ring-1 ring-blue-500/30"
          : "border-neutral-700 hover:border-neutral-600"
      }`}
    >
      {/* Input handles */}
      {inputs.map((port, i) => (
        <Handle
          key={port.id}
          id={port.id}
          type="target"
          position={Position.Left}
          style={{
            top: `${((i + 1) / (inputs.length + 1)) * 100}%`,
            background: PORT_COLORS[port.type] ?? "#737373",
            width: 10,
            height: 10,
            border: "2px solid #171717",
          }}
          title={`${port.name} (${port.type})`}
        />
      ))}

      {/* Node body */}
      <div className="px-3 py-2">
        {/* Header row */}
        <div className="flex items-center gap-1.5">
          {/* Run status dot — only visible when a run snapshot is active */}
          {dot && (
            <span
              className={`inline-block h-2 w-2 shrink-0 rounded-full ${dot.pulse ? "animate-pulse" : ""}`}
              style={{ backgroundColor: dot.color }}
              title={dot.label}
            />
          )}
          <span className="flex-1 truncate text-sm font-medium text-neutral-100">
            {label}
          </span>
          {badge && (
            <span
              className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold ${badge.className}`}
            >
              {badge.label}
            </span>
          )}
        </div>

        {/* Port summary */}
        {(inputs.length > 0 || outputs.length > 0) && (
          <div className="mt-1 flex items-center gap-2 text-[10px] text-neutral-500">
            {inputs.length > 0 && <span>{inputs.length} in</span>}
            {outputs.length > 0 && <span>{outputs.length} out</span>}
          </div>
        )}
      </div>

      {/* Output handles */}
      {outputs.map((port, i) => (
        <Handle
          key={port.id}
          id={port.id}
          type="source"
          position={Position.Right}
          style={{
            top: `${((i + 1) / (outputs.length + 1)) * 100}%`,
            background: PORT_COLORS[port.type] ?? "#737373",
            width: 10,
            height: 10,
            border: "2px solid #171717",
          }}
          title={`${port.name} (${port.type})`}
        />
      ))}
    </div>
  );
}

export const CustomNode = memo(CustomNodeComponent);
