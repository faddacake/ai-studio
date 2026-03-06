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

## 3. What Still Remains to Be Migrated

### Inspector panel
The `NodeConfig.tsx` inspector currently does not consume `parameterSchema` from the registry. It needs to be updated to:
1. Query `nodeRegistry.get(selectedNode.type)` for the definition.
2. Render form fields from `parameterSchema` and `uiSchema`.
3. Fall back to raw JSON editor for unrecognized fields.

### Node palette
`NodePalette.tsx` currently fetches models from API routes. It should also query `nodeRegistry.getAvailable()` to show utility and capability nodes alongside provider models.

### Engine executor
`packages/engine/src/executor.ts` needs to use `nodeRegistry.get(node.type).runtimeKind` to dispatch:
- `provider` → adapter call
- `local` → local executor (sharp, template resolution)
- `capability` → service call (scoring, formatting)
- `virtual` → passthrough

### Capability executors
The existing services (`qualityScoring.ts`, `socialFormatter.ts`, `exportService.ts`) need thin wrapper executors that implement the `NodeExecutionContext → NodeExecutionResult` contract.

### Provider adapter unification
The thin `ProviderAdapter` interface in `apps/web/src/lib/providers/types.ts` (`generate(input)`) should be deprecated in favor of the richer `ProviderAdapter` interface in `packages/adapters/src/types.ts`. The model catalog in `config/models.ts` should eventually be replaced by dynamic adapter discovery.

### Worker dispatch
`packages/worker/src/predictionRunner.ts` should query the registry to determine runtime kind before dispatching.

---

## 4. Recommended Next 5 Implementation Steps

### Step 1: Schema-driven inspector rendering
Update `InspectorPanel.tsx` / `NodeConfig.tsx` to read `parameterSchema` and `uiSchema` from the registry and render forms dynamically. This is the highest-leverage change — it eliminates per-model UI code and proves the registry is useful.

### Step 2: Registry-aware node palette
Update `NodePalette.tsx` to include utility nodes (resize, crop, etc.) and capability nodes (scoring, formatting, export) from the registry. Group by `NodeCategory`.

### Step 3: Engine runtime dispatch
Update `executor.ts` to use `nodeRegistry.getOrThrow(node.type).runtimeKind` for dispatch routing. Add local executors for utility nodes (resize/crop/format-convert using sharp). This enables utility nodes to actually execute in workflows.

### Step 4: Capability executors for scoring and formatting
Create executor wrappers for `clipScoringNode` and `socialFormatNode` that call the existing services but conform to the `NodeExecutionContext → NodeExecutionResult` contract. This makes them usable as workflow nodes.

### Step 5: Deprecate dual adapter interfaces
Consolidate the thin `ProviderAdapter` in `apps/web/src/lib/providers/types.ts` with the richer one in `packages/adapters/src/types.ts`. Update the web app's provider registry to use the canonical interface.

---

## 5. Which Current Features Should Be Converted Into Nodes Next

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

## 6. Which Current Page-Level Features Are Acceptable to Leave Alone

| Feature | Location | Why It's Fine |
|---------|----------|---------------|
| **Prompt Studio** (`/(app)/prompt`) | Page + `usePromptRunner` hook | It's a high-level UI flow, not a node execution. The hook orchestrates multi-model comparison which maps to a DAG of generation nodes — this composition is valid at the page level. |
| **Canvas Editor** (`/(app)/canvas`) | Page + `useCanvasStore` hook | Social variant editing is a UI concern. The underlying formatting already delegates to `socialFormatter` which is now a capability node. |
| **Settings / Provider Keys** | Pages + API routes | Configuration UI is inherently page-level. Provider key management doesn't belong in the node system. |
| **Login / Setup / Auth** | Pages + middleware | Infrastructure, not pipeline logic. |
| **Marketing pages** | Static content | No pipeline logic involved. |
| **License tier checks** | `lib/license-tiers.ts` | Feature gating is orthogonal to node architecture. Can optionally be connected to node `isAvailable` flags later. |
| **Presets** | `config/presets.ts` | Pre-configured model sets are a UI convenience. They can reference node definitions by type but don't need to be nodes themselves. |
