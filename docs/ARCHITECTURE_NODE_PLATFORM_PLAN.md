# Architecture: Node Platform Plan

Date: 2026-03-05

---

## 1. What Was Changed

### New files created in `packages/shared/src/`

| File | Purpose |
|------|---------|
| `nodeDefinition.ts` | Core types: `NodeDefinition`, `PortDefinition`, `NodeParameterField`, `NodeParameterSchema`, `UISchema`, `NodeRuntimeKind`, `NodeCategory`, `CostEstimate`, `NodeExecutionContext`, `NodeExecutionResult`, `SerializableNodeDefinition`. Zod schemas for wire-safe serialization. |
| `nodeRegistry.ts` | `NodeRegistry` class with `register()`, `get()`, `getByCategory()`, `getAvailable()`, `getAllSerializable()`. Global singleton `nodeRegistry`. |
| `nodeDefHelpers.ts` | Utilities: `getDefaultParams()`, `toWorkflowPorts()`, `validateParams()`, `arePortsCompatible()`, `getNodeSummary()`. |
| `modelBridge.ts` | `modelToNodeDefinition()` and `modelsToNodeDefinitions()` — converts existing `ModelOption` catalog entries into registry-compatible `NodeDefinition` objects. |
| `nodeDefinitions/index.ts` | Aggregator that registers all built-in definitions via `registerBuiltInNodes()`. |
| `nodeDefinitions/io.ts` | `imageInputNode`, `outputNode` definitions. |
| `nodeDefinitions/utility.ts` | `resizeNode`, `cropNode`, `formatConvertNode`, `compositingNode`, `promptTemplateNode`, `commentNode` definitions. |
| `nodeDefinitions/provider.ts` | `imageGenerationNode`, `videoGenerationNode` templates. `createProviderNodeDefinition()` factory for model-specific nodes. |
| `nodeDefinitions/capabilities.ts` | `clipScoringNode`, `socialFormatNode`, `exportBundleNode`, `rankingNode` definitions. |

### Modified files

| File | Change |
|------|--------|
| `packages/shared/src/nodeTypes.ts` | Added `ClipScoring`, `SocialFormat`, `ExportBundle`, `Ranking` to the `NodeType` enum. |
| `packages/shared/src/index.ts` | Added exports for all new types, registry, definitions, helpers, and bridge. |

### New file in `apps/web/src/lib/`

| File | Purpose |
|------|---------|
| `nodeRegistryInit.ts` | `initializeNodeRegistry()` — one-call setup that registers built-in nodes + model catalog entries. |

---

## 2. What Architectural Problem This Solves

### Before

- `NodeType` was a bare enum — consumers had to hardcode what each type meant (its ports, parameters, runtime behavior).
- Model definitions lived only in `apps/web/src/config/models.ts` — frontend-only, invisible to the engine.
- There was no way for the inspector to render a form from schema — every model would need hand-built UI.
- Export, scoring, and social formatting were standalone services with no node contract — they couldn't participate in workflow pipelines.
- Adding a new model required changes in multiple places with no single registration point.

### After

- Every node type (utility, provider, capability) is described by a `NodeDefinition` with ports, parameters, runtime kind, and optional UI hints.
- The `NodeRegistry` is a single query point for the inspector, palette, engine, and validator.
- New models can be registered at startup via `createProviderNodeDefinition()` or `modelToNodeDefinition()` without touching UI code.
- Scoring, formatting, and export are defined as capability nodes and can be composed in workflows.
- The engine can dispatch execution by `runtimeKind` instead of hardcoding model-specific logic.

---

## 3. What Was Added in Session 2 — Inspector + Execution Engine

### Schema-driven Inspector Components (`apps/web/src/components/inspector/`)

| File | Purpose |
|------|---------|
| `SchemaField.tsx` | Atomic field renderer for all parameter types. Infers widget from `NodeParameterField.type` (text, textarea, slider, toggle, dropdown, upload, json, color). Zero knowledge of specific models. |
| `SchemaForm.tsx` | Renders complete parameter forms from `parameterSchema` + `uiSchema`. Supports collapsible grouped sections, hidden fields, widget overrides. Falls back to flat rendering if no groups. |
| `NodeConfig.tsx` | Schema-driven config panel. Queries `nodeRegistry.get(node.type)`, renders SchemaForm from definition, validates with `validateParams()`, shows cost badge, falls back to raw JSON editor for unknown types. |
| `InspectorPanel.tsx` | Right-side panel with 3 tabs: Config (NodeConfig), Ports (color-coded port list), Run (placeholder for SSE). |
| `index.ts` | Barrel export for all inspector components. |

### Execution Engine (`packages/engine/src/`)

| File | Purpose |
|------|---------|
| `executionGraph.ts` | `buildExecutionGraph()` — DAG builder from WorkflowGraph. Kahn's topological sort with cycle detection. `computeTiers()` for parallel scheduling. `getReadyNodes()` returns pending nodes whose deps are complete. `resolveNodeInputs()` maps upstream outputs to downstream input ports via edges. |
| `runCoordinator.ts` | `RunCoordinator` — manages run lifecycle. Node state machine: pending→queued→running→completed/failed/cancelled. Run state machine: pending→running→completed/failed/partial_failure/cancelled/budget_exceeded. Event system (`RunEvent` types). Budget cap enforcement. Downstream cancellation on failure. `DispatchJob` callback for queue integration. |
| `executor.ts` | `NodeExecutor` — dispatch by `NodeRuntimeKind`: provider→`ProviderExecutor`, local→`LocalExecutor` map, capability→`CapabilityExecutor` map, virtual→passthrough. Resolves node type via `__nodeType` param or `providerId/modelId` fallback. Runs `definition.validate()` before execution. |
| `index.ts` | Updated from stub to full exports of all engine modules. |

### Worker Integration (`packages/worker/src/`)

| File | Purpose |
|------|---------|
| `nodeJobProcessor.ts` | `processNodeJob()` — bridges BullMQ jobs and the engine executor. Builds `NodeExecutionContext` from `NodeJobData`, delegates to `nodeExecutor.execute()`, returns `NodeJobResult`. |
| `index.ts` | Updated to use `nodeJobProcessor` in prediction job handler. |
| `package.json` | Added `@aistudio/engine` and `@aistudio/shared` workspace dependencies. |

---

## 4. What Was Added in Session 3 — Registry-Aware Node Palette

### Canvas Components (`apps/web/src/components/canvas/`)

| File | Purpose |
|------|---------|
| `NodePalette.tsx` | Registry-driven palette sidebar. Calls `nodeRegistry.getAvailable()` for all node listings — no hardcoded lists. Groups by `NodeCategory` (with Input/Output merged). Text filter searches label, description, type, and tags. Shows label, description, runtime badge, port counts, and provider ID. Collapsible category sections. |
| `createWorkflowNode.ts` | `createWorkflowNode(definition, position)` — converts a `NodeDefinition` into a `WorkflowNode` with correct type, default params via `getDefaultParams()`, ports via `toWorkflowPorts()`, provider info, and sensible retry/timeout defaults by runtime kind. |
| `index.ts` | Barrel export for all canvas components. |

### How it works

1. On mount, `NodePalette` calls `initializeNodeRegistry()` (idempotent) which registers built-in nodes + model catalog entries via the model bridge.
2. All node listings come from `nodeRegistry.getAvailable()` — a single source of truth.
3. Nodes are grouped by `NodeCategory` using a display-order map. Input and Output share a group.
4. The search filter matches against `label`, `description`, `type`, and `tags` (case-insensitive substring).
5. When a user clicks a node, `createWorkflowNode()` builds a complete `WorkflowNode` from the definition with correct defaults, ports, and provider metadata.
6. Model catalog entries (IMAGE_MODELS, VIDEO_MODELS) flow through the model bridge → registry → palette. No parallel data source.

---

## 4b. What Was Added in Session 4 — Workflow Debugger

### Engine Debug Helper (`packages/engine/src/debugSnapshot.ts`)

| Export | Purpose |
|--------|---------|
| `buildDebugSnapshot(run)` | Projects `RunState` + `ExecutionGraph` into a flat, serializable `RunDebugSnapshot` for the debugger UI. Computes tier assignments, topological order indices, blocked reasons, output key summaries, and per-status counts. |
| `buildGraphPreview(graph)` | Preview-only variant for showing execution order / tiers before a run starts (no run state needed). |
| `NodeDebugInfo` | Per-node structure with label, type, runtimeKind, status, tier, topoIndex, dependencies, dependents, attempt, timing, cost, error, blockedReason, outputKeys, inputKeys, providerId, modelId. |
| `BlockedReason` | Discriminated union: `waiting_on_dependency`, `failed_upstream`, `cancelled_upstream`, `budget_exceeded`, `validation_error`, `run_cancelled`. |
| `RunDebugSnapshot` | Run-level snapshot with summary counts, tiers, execution order, all NodeDebugInfo, cost/budget/timing. |

### Debugger UI (`apps/web/src/components/debugger/`)

| File | Purpose |
|------|---------|
| `RunDebuggerPanel.tsx` | Debugger panel showing: run status badge, interactive summary pills (filter by status), cost/budget/timing, tier view vs flat topological view, collapsible per-node rows with status dot + runtime badge + duration, expanded detail showing type/ID/tier/topo-order/attempts/provider/model/timing/dependencies/dependents/data-flow/blocked-reason/error. |
| `index.ts` | Barrel export. |

### How it works

1. The engine's `buildDebugSnapshot(runState)` shapes a `RunState` into a flat `RunDebugSnapshot` — one function call, fully serializable.
2. `RunDebuggerPanel` takes this snapshot as a prop and renders everything from it. No engine imports in the UI beyond types.
3. Blocked reasons are computed from the graph topology + node states: why a node is waiting, which upstream failed, whether budget stopped it, etc.
4. Two view modes: **Tier view** groups nodes by execution tier (parallel scheduling level), **Flat view** shows topological order.
5. Summary pills act as status filters — click to filter the node list to just failed, running, etc.
6. The `onNodeClick` callback enables future canvas highlighting integration.
7. `buildGraphPreview(graph)` enables showing execution order before a run starts.

## 4c. What Was Added in Session 5 — React Flow Canvas Integration

### Zustand Workflow Store (`apps/web/src/stores/workflowStore.ts`)

| Export | Purpose |
|--------|---------|
| `useWorkflowStore` | Zustand store managing workflow nodes, edges, selection, palette/inspector/debugger UI state, save/load, and all React Flow callbacks (onNodesChange, onEdgesChange, onConnect). |
| `toFlowNode()` / `toFlowEdge()` | Adapters converting `WorkflowNode`/`WorkflowEdge` to React Flow `Node`/`Edge`. |
| `fromFlowNode()` | Reverse adapter for extracting `WorkflowNode` from React Flow state. |

### Canvas Components (`apps/web/src/components/canvas/`)

| File | Purpose |
|------|---------|
| `CustomNode.tsx` | Memoized React Flow custom node with color-coded port handles (left=inputs, right=outputs), label, runtime kind badge, and selection ring. Handle positions auto-distribute based on port count. |
| `WorkflowCanvas.tsx` | Main canvas composition: ReactFlowProvider wrapper, ReactFlow with Background/Controls/MiniMap, NodePalette (left), InspectorPanel (right, on selection), RunDebuggerPanel (bottom, toggleable). Save button with dirty state tracking. Keyboard shortcut Cmd+S to save. |

### Workflow Editor Page (`apps/web/src/app/(app)/workflows/[id]/page.tsx`)

Replaced placeholder with full client component that fetches workflow from API, parses the graph JSON, loads it into the Zustand store, and renders `WorkflowCanvas`.

### How it works

1. The Zustand store (`useWorkflowStore`) is the single source of truth for all canvas state — nodes, edges, selection, UI panel visibility, and dirty tracking.
2. `WorkflowCanvas` wraps `ReactFlow` in a `ReactFlowProvider` and composes all sidebar panels: `NodePalette` (left), `InspectorPanel` (right on selection), `RunDebuggerPanel` (bottom on toggle).
3. `CustomNode` renders each node with color-coded port handles matching the port type (image=purple, video=orange, text=green, number=blue, json=yellow) and a runtime kind badge (AI/Local/Virtual/Cap).
4. The palette's `onAddNode` callback creates nodes centered in the viewport via `screenToFlowPosition`.
5. Clicking a node opens the inspector; clicking the pane deselects. `InspectorPanel` receives a `WorkflowNode` reconstructed from React Flow state via `fromFlowNode()`.
6. The save button persists the graph via `PATCH /api/workflows/:id` with `getWorkflowGraph()` reconstructing the `WorkflowGraph` from React Flow state.
7. `@xyflow/react` and `zustand` added as dependencies.

---

## 5. What Still Remains to Be Migrated

### Capability executors
The existing services (`qualityScoring.ts`, `socialFormatter.ts`, `exportService.ts`) need thin wrapper executors that implement the `NodeExecutionContext → NodeExecutionResult` contract.

### Provider adapter unification
The thin `ProviderAdapter` interface in `apps/web/src/lib/providers/types.ts` (`generate(input)`) should be deprecated in favor of the richer `ProviderAdapter` interface in `packages/adapters/src/types.ts`. The model catalog in `config/models.ts` should eventually be replaced by dynamic adapter discovery.

### Local executors
Utility nodes (resize, crop, format-convert) need local executor implementations using sharp. Register them via `nodeExecutor.registerLocal()` at worker startup.

### SSE integration for run progress
The InspectorPanel's "Run" tab is a placeholder. Wire it to `RunCoordinator` events via SSE to show real-time per-node progress during workflow execution.

---

## 5. Recommended Next Implementation Steps

~~Step 1: Schema-driven inspector rendering~~ — **DONE** (SchemaField, SchemaForm, NodeConfig, InspectorPanel)

~~Step 2: Engine runtime dispatch~~ — **DONE** (NodeExecutor with runtimeKind dispatch, RunCoordinator, ExecutionGraph)

~~Step 3: Worker integration~~ — **DONE** (nodeJobProcessor.ts wired into BullMQ worker)

~~Step 4: Registry-aware node palette~~ — **DONE** (NodePalette.tsx, createWorkflowNode.ts)

~~Step 4b: Workflow debugger~~ — **DONE** (debugSnapshot.ts, RunDebuggerPanel.tsx)

~~Step 5: React Flow canvas integration~~ — **DONE** (WorkflowCanvas.tsx, CustomNode.tsx, workflowStore.ts, editor page wired up)

### Step 6: Local executors for utility nodes
Implement sharp-based local executors for resize, crop, and format-convert nodes. Register them via `nodeExecutor.registerLocal()` at worker startup. This enables utility nodes to actually execute in workflows.

### Step 7: Capability executors for scoring and formatting
Create executor wrappers for `clipScoringNode` and `socialFormatNode` that call the existing services but conform to the `NodeExecutionContext → NodeExecutionResult` contract.

### Step 8: Deprecate dual adapter interfaces
Consolidate the thin `ProviderAdapter` in `apps/web/src/lib/providers/types.ts` with the richer one in `packages/adapters/src/types.ts`.

### Step 9: SSE run progress
Wire `RunCoordinator` events to the frontend via Server-Sent Events so the InspectorPanel's Run tab shows real-time per-node progress.

---

## 6. Which Current Features Should Be Converted Into Nodes Next

| Feature | Current Location | Priority | Rationale |
|---------|-----------------|----------|-----------|
| **Resize/Crop** | Defined in registry, no executor yet | High | Most commonly needed utility nodes; sharp-based, zero external deps |
| **CLIP Scoring** | `services/qualityScoring.ts` | High | Already a discrete function; wrapping as executor is trivial |
| **Social Formatting** | `services/socialFormatter.ts` | Medium | Discrete function, but less likely to appear mid-pipeline |
| **Prompt Template** | Defined in registry, no executor | Medium | Enables prompt composition workflows |
| **Export Bundle** | `services/exportService.ts` | Medium | Large service; start with executor wrapper, refine later |
| **Compositing** | Defined in registry, no executor | Low | Less common; implement after resize/crop proven |
| **Ranking** | `lib/ranking/score.ts` | Low | Currently only used in prompt studio comparison view |

---

## 7. Which Current Page-Level Features Are Acceptable to Leave Alone

| Feature | Location | Why It's Fine |
|---------|----------|---------------|
| **Prompt Studio** (`/(app)/prompt`) | Page + `usePromptRunner` hook | It's a high-level UI flow, not a node execution. The hook orchestrates multi-model comparison which maps to a DAG of generation nodes — this composition is valid at the page level. |
| **Canvas Editor** (`/(app)/canvas`) | Page + `useCanvasStore` hook | Social variant editing is a UI concern. The underlying formatting already delegates to `socialFormatter` which is now a capability node. |
| **Settings / Provider Keys** | Pages + API routes | Configuration UI is inherently page-level. Provider key management doesn't belong in the node system. |
| **Login / Setup / Auth** | Pages + middleware | Infrastructure, not pipeline logic. |
| **Marketing pages** | Static content | No pipeline logic involved. |
| **License tier checks** | `lib/license-tiers.ts` | Feature gating is orthogonal to node architecture. Can optionally be connected to node `isAvailable` flags later. |
| **Presets** | `config/presets.ts` | Pre-configured model sets are a UI convenience. They can reference node definitions by type but don't need to be nodes themselves. |
