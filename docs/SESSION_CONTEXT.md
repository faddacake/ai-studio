# SESSION CONTEXT — AI Studio

Date: 2026-03-18
Session: Video Editor UI Shell (Persistent Project Surface) ✅ SHIPPED

---

## Session Summary — Video Editor UI Shell (Persistent Project Surface) (2026-03-18)

Built the first usable Video Editor UI shell at `/editor/[id]` on top of the persistence layer added in the previous session. The editor is a full-screen surface outside the `(app)` route group (no sidebar), with three clear regions: a top toolbar, a left scene list, and a central preview area. `EditorShell` owns all mutable editor state (`scenes[]`, `projectName`, `selectedId`, `isDirty`, `saveState`) and exposes clean callbacks to its children. `EditorToolbar` shows a breadcrumb back to Workflows, an inline-editable project name with an unsaved-changes dot, a read-only aspect ratio badge, and a Save button that PATCHes to the existing `/api/editor-projects/[id]` endpoint. `SceneList` renders each scene as a card with a thumbnail (`<video preload="metadata">` for video, `<img>` for image), a type badge, an inline-editable duration field, and up/down/remove controls; the "Add Scene" button is rendered as a disabled placeholder pending an artifact picker. `PreviewPlayer` uses a padding-bottom aspect-ratio container that locks the preview to the project's `aspectRatio`; video scenes render as `<video controls playsInline>` and image scenes as `<img>`, with an empty state for projects with no scenes. Web typecheck clean throughout.

**Next recommended task:** Build the artifact picker that allows users to add scenes from existing run artifacts — a modal or side panel that lists artifacts from recent runs (calling `/api/workflows/[id]/runs/[runId]/outputs`), lets the user pick one, and appends it as a new `Scene` in the editor. This is the missing "Add Scene" flow that currently renders as a disabled placeholder.

**Suggested title:** `Video Editor artifact picker — add scenes from run outputs`

---

Date: 2026-03-18
Session: Editor Project Persistence (V1 Foundation) ✅ SHIPPED

---

## Session Summary — Editor Project Persistence (V1 Foundation) (2026-03-18)

Introduced the minimal persistence layer for the Video Editor V1. Added an `editor_projects` table to the SQLite schema (migration `0007_editor_projects`) with columns for `id`, `name`, `aspect_ratio`, `scenes` (JSON), `audio_track` (JSON, nullable), `created_at`, and `updated_at`. Defined TypeScript types in `apps/web/src/lib/editorProjectTypes.ts` covering `EditorProject`, `Scene`, `TextOverlay`, `AudioTrack`, and `AspectRatio`. Created a server-side data access module at `apps/web/src/server/api/editorProjects.ts` with `listEditorProjects`, `getEditorProject`, `createEditorProject`, `updateEditorProject`, and `deleteEditorProject` — including a shared `parseRow` helper that converts raw DB rows to typed `EditorProject` objects. Exposed the CRUD operations over HTTP via thin Next.js route handlers at `GET/POST /api/editor-projects` and `GET/PATCH/DELETE /api/editor-projects/[id]`, following the exact same pattern as `node-presets` and `fragments`. Scenes reference artifacts by path only, keeping the existing artifact system as the sole source of truth for media files. Updated `docs/AI_STUDIO_SYSTEM_CONTEXT.md` with a "Video Editor (V1)" section. Web typecheck and db package build both clean.

**Next recommended task:** Build the Video Editor UI shell — a new page at `/editor` (or `/editor/[id]`) that loads an `EditorProject`, renders a scene list on the left, a preview area in the centre, and a basic toolbar (add scene from artifact picker, reorder, set duration). This is the UI layer that consumes the persistence model added this session.

**Suggested title:** `Video Editor UI shell — scene list + preview area`

---

Date: 2026-03-18
Session: Video Run Lifecycle Clarity Pass ✅ SHIPPED

---

## Session Summary — Video Run Lifecycle Clarity Pass (2026-03-18)

Audited the full video run lifecycle across all surfaces (canvas node, inspector, run outputs panel, history list, history detail) for UX truthfulness and clarity. Found three concrete gaps where the interface became ambiguous or misleading for video artifacts:

**Fix 1 — `ArtifactVideo` error fallback (`history/[runId]/page.tsx`):** `ArtifactImage` had an `onError` state that shows `"{filename} — file no longer available"` when the file can't be loaded. `ArtifactVideo` had no equivalent — a missing video file would show a blank broken player with no explanation. Added `failed` state with `onError` handler matching `ArtifactImage`'s fallback pattern.

**Fix 2 — Video thumbnail `preload="metadata"` (`history/[runId]/page.tsx`):** The artifact thumbnail strip renders 56×56 `<video muted playsInline>` elements for video artifacts. Without `preload="metadata"`, the browser would buffer the entire MP4 file for each thumbnail, which degrades page load for large Kling outputs. Added `preload="metadata"` to limit loading to just the first frame.

**Fix 3 — History list run compare ignores video artifacts (`history/page.tsx`):** The `fetchFirstArtifact` helper in the A/B compare feature only called `extractImageRefs`. When comparing two Kling video runs, both comparison slots showed "No artifacts" — the runs existed and had output, but the comparison panel was completely empty. Added `extractVideoRefs` as a fallback when no image refs are found, passing `mimeType` through `ArtifactPreviewable` so `ArtifactPreviewPanel` renders a `<video>` instead of a broken `<img>`. Also added `extractVideoRefs` to the import. Web typecheck clean throughout.

**Next recommended task:** Smoke-test the full Kling end-to-end path: configure a fal.ai API key, build a Prompt Template → Kling 1.6 workflow from the canvas palette, run it, and verify the video plays in the inspector, the run outputs panel, the history detail page, and the history list compare feature. This would confirm all the accumulated video hardening work functions as an integrated system.

**Suggested title:** `Smoke test Kling end-to-end video path`

---

Date: 2026-03-18
Session: Register Kling as First-Class Canvas Video Node ✅ VERIFIED (no changes needed)

---

## Session Summary — Register Kling as First-Class Canvas Video Node (2026-03-18)

Full pipeline audit confirming Kling 1.6 is already registered as a first-class video node in the canvas palette. No code changes were required.

**Audit findings (all clean):**

1. **`apps/web/src/lib/nodeRegistryInit.ts`** — `initializeNodeRegistry()` already calls `modelsToNodeDefinitions([...IMAGE_MODELS, ...VIDEO_MODELS])` and registers all resulting definitions via `nodeRegistry.registerAll()`. Kling 1.6 is in `VIDEO_MODELS`.

2. **`packages/shared/src/modelBridge.ts`** — `modelToNodeDefinition()` passes `category: model.category` to `createProviderNodeDefinition`; voice-category models are filtered (return `null`); image and video categories are both handled. No gap.

3. **`packages/shared/src/nodeDefinitions/provider.ts`** — `createProviderNodeDefinition` selects `videoGenerationNode` base when `opts.category === "video"`. `videoGenerationNode` has: `outputs: [{ id: "video_out", type: PortType.Video }]`, `baseVideoGenParams` (prompt, duration, resolution, seed), `tags: ["generation", "video"]`, `category: NodeCategory.Generation`. Contract is fully modality-correct.

4. **`packages/shared/src/nodeRegistry.ts`** — `getAvailable()` filters only on `isAvailable !== false`. No modality filtering. Kling 1.6 has `supported: true` → `isAvailable: true`. It will appear in every palette `getAvailable()` call.

5. **`apps/web/src/components/canvas/NodePalette.tsx`** — Uses `nodeRegistry.getAvailable()`, groups by `NodeCategory`, no modality-specific filtering. Kling 1.6 appears in the "Generation" group alongside FLUX and SDXL nodes.

6. **`apps/web/src/components/canvas/createWorkflowNode.ts`** — Fully definition-driven: reads ports from `definition.inputs/outputs` via `toWorkflowPorts`, reads params from `getDefaultParams(definition)`, reads `provider.providerId`/`provider.modelId` from the definition. No hardcoded image assumptions.

7. **`apps/web/src/lib/presets.ts`** — "Prompt → Video" preset already added in previous session, using `NodeType.VideoGeneration` and correct `prompt_in` / `text_out` handles.

The full Kling path — palette → drag to canvas → inspector → run → video output — is wired end-to-end. Web typecheck clean throughout.

**Next recommended task:** Run a real end-to-end Kling test: place a Prompt Template + Kling 1.6 node on canvas, wire them, run, and confirm the video plays in the inspector and history page. Alternatively, begin the next V2 capability (e.g., image-to-video input node, Best-of-N for video, or voice model execution path).

---

Date: 2026-03-18
Session: Cross-Modal Config Truthfulness Pass + Persistent Context File ✅ SHIPPED

---

## Session Summary — Cross-Modal Config Truthfulness Pass + Persistent Context File (2026-03-18)

Completed the remaining cross-modal truthfulness gaps — focused on surfaces that were still image-only after the previous hardening pass. The run history detail page (`history/[runId]/page.tsx`) was the largest gap: `previewArtifacts` only extracted image refs so video artifacts from Kling runs were completely invisible on the history page — no thumbnail, no preview panel, no export selection. Fixed by extracting both image and video refs, passing `mimeType` through the `ArtifactPreviewable` contract, rendering video thumbnails as `<video muted>` elements in the thumbnail strip, adding a direct `ArtifactVideo` sub-component for the Outputs section, and suppressing the "Use in Canvas" affordance for video artifacts (no canvas Video Input node exists). Added a `"Prompt → Video"` entry to `lib/presets.ts` so the slash-command palette surfaces a video quick-chain alongside image presets — without this, the product appeared image-only to new users from the first interaction. Fixed the hardcoded `title="Insert as Image Input node on canvas"` in `ArtifactPreviewPanel` to the modality-agnostic `"Insert as input node on canvas"`. Created `docs/AI_STUDIO_SYSTEM_CONTEXT.md` as the permanent project reference file covering architecture, current capabilities, UX principles, V1 model strategy, dev workflow, what to avoid, and V1 completion definition. Web typecheck clean throughout.

**Next recommended task:** Verify the workflow canvas node palette exposes `kling-1.6` as a draggable video-generation node — check that `modelToNodeDefinition()` in `packages/shared/src/modelBridge.ts` correctly maps video-category `ModelOption` entries into `NodeDefinition` objects with a `video_out` port, and that `initializeNodeRegistry()` registers them at startup so the "Kling 1.6" node appears in the canvas palette alongside the FLUX and SDXL image nodes. This would complete the end-to-end story: user can find a Kling node in the palette, place it on the canvas, wire a Prompt Template to it, run, and see a video in the inspector and history page.

**Suggested title:** `Verify Video Node Registry & Canvas Palette Integration`

---

Date: 2026-03-18
Session: Cross-Modal Consistency Pass (Image vs Video) ✅ SHIPPED

---

## Session Summary — Cross-Modal Consistency Pass (Image vs Video) (2026-03-18)

Completed a systematic audit of image vs video handling across every UI surface and closed the remaining inconsistencies. The root gap was `apps/web/src/lib/runOutputs.ts`: `NodeOutputType` had no `"video"` variant and `extractNodeOutput()` only extracted image refs, causing video outputs to fall through to the `"json"` case and display as a raw summary string in the inspector Config tab's "Latest Output" section. This was fixed by adding `"video"` to `NodeOutputType`, adding `videoUrl`/`videoFilename` fields to `NodeLatestOutput`, inserting a video-ref extraction step (using the new `extractVideoRefs`) between the existing image and text checks, and adding a `<video>` preview branch in `LatestOutputSection` inside `InspectorPanel.tsx`. Two history components (`ArtifactLineage.tsx`, `ActivityTimeline.tsx`) built `ArtifactPreviewable` objects from artifact path strings without a `mimeType` field, meaning video files would have rendered as broken `<img>` elements; both now derive `mimeType: "video/mp4"` from the `.mp4` extension. Finally, the `RunOutputsPanel` file comment was updated to document video support alongside image support. Web typecheck clean throughout.

**Next recommended task:** Verify the workflow canvas node palette exposes `kling-1.6` as a draggable video-generation node — check that `modelToNodeDefinition()` in `packages/shared/src/modelBridge.ts` correctly maps video-category `ModelOption` entries into `NodeDefinition` objects with a `video_out` port, and that `initializeNodeRegistry()` registers them at startup so the video node appears in the canvas palette alongside image nodes.

**Suggested title:** `Verify Video Node Registry & Canvas Palette Integration`

---

Date: 2026-03-18
Session: Video Output Hardening & UX Truthfulness Pass ✅ SHIPPED

---

## Session Summary — Video Output Hardening & UX Truthfulness Pass (2026-03-18)

Audited the full video output path and fixed five image-only assumptions that would have silently broken Kling video artifacts in the UI.

**Fix 1 — `apps/web/src/app/api/artifacts/route.ts`:** Added `".mp4": "video/mp4"` to `MIME_BY_EXT`. Without this, the artifact server returned `application/octet-stream` for MP4 files, preventing the browser `<video>` element from playing them inline.

**Fix 2 — `apps/web/src/lib/artifactRefs.ts`:** Added `extractVideoRefs()` parallel to `extractImageRefs()`, filtering for `mimeType.startsWith("video/")`. Same recursive structure: handles direct refs, arrays, and CandidateCollection `.items` shapes.

**Fix 3 — `apps/web/src/components/debugger/RunOutputsPanel.tsx`:** Added a `video/` branch in `OutputEntry` (direct ArtifactRef check) and a collection branch using `extractVideoRefs`. Added `ArtifactVideo` sub-component rendering a `<video controls playsInline>` element. Video now renders inline in the Outputs debugger panel instead of falling through to raw JSON.

**Fix 4 — `apps/web/src/components/prompt/ArtifactPreviewPanel.tsx`:** Added `mimeType?: string` field to the `ArtifactPreviewable` interface. The image/video preview element now branches on `result.mimeType?.startsWith("video/")` — renders `<video controls playsInline>` for video, `<img>` for everything else (default).

**Fix 5 — `apps/web/src/components/inspector/InspectorPanel.tsx`:** Updated `extractImageRefs` import to also import `extractVideoRefs`. In the RunTab artifact fetch effect, now tries image refs first then falls back to video refs; passes `mimeType: ref.mimeType` into `ArtifactPreviewable`. Added `isVideoArtifact` flag that suppresses `onUseInCanvas` for video outputs (no canvas Video Input node exists yet). Web typecheck clean throughout.

**Next recommended task:** Verify the workflow canvas node palette exposes `kling-1.6` as a draggable video-generation node — check that `modelToNodeDefinition()` in `packages/shared/src/modelBridge.ts` correctly maps video-category `ModelOption` entries into `NodeDefinition` objects with `category: "video"` and a `video_out` port, and that `initializeNodeRegistry()` registers them at startup so the video node appears in the palette alongside the image nodes.

**Suggested title:** `Verify Video Node Registry & Palette Integration`

---

Date: 2026-03-17
Session: Kling 1.6 Video Generation via fal.ai ✅ SHIPPED

---

## Session Summary — Kling 1.6 Video Generation via fal.ai (2026-03-17)

Implemented end-to-end video generation support through the existing fal.ai provider path. A new `VideoGeneratorAdapter` interface and `FalVideoGeneratorAdapter` class were added to `packages/engine/src/capabilities/generator.ts`, kept deliberately separate from `GeneratorAdapter` so the image-focused Best-of-N/CLIP pipeline requires zero changes. The Kling API response shape (returning a `{ video: { url } }` object rather than an `{ images: [...] }` array) is handled by `FalVideoGeneratorAdapter.generateVideo()`, which downloads the video to a buffer and returns a `GeneratedVideo` result with `durationSecs`. The provider executor in `runs/route.ts` routes to the video path via an `isFalVideoModelId()` helper (checks `fal-ai/kling-video` prefix), reads `context.params.duration`, writes the MP4 buffer through `writeArtifact` (which gained an `"mp4"` MIME entry), and returns `{ video_out: artifactRef }` rather than `image_out`. A `createVideoGenerator()` factory was added that throws clearly on missing API key (no mock fallback — video has no meaningful placeholder). In `models.ts`, `kling-1.6` was added as the first `VIDEO_MODELS` entry with `supported: true`, `provider: "fal"`, and `adapterModelId: "fal-ai/kling-video/v1.6/standard/text-to-video"`; the `short-form-reel` preset was updated to `["kling-1.6"]`. All 10 new tests pass; web and engine typechecks clean.

**Next recommended task:** Verify the workflow canvas node palette exposes `kling-1.6` as a draggable video-generation node — check that `modelToNodeDefinition()` in `packages/shared/src/modelBridge.ts` correctly maps video-category `ModelOption` entries into `NodeDefinition` objects with `category: "video"` and a `video_out` port, and that `initializeNodeRegistry()` registers them at startup so the video node appears in the palette alongside the image nodes.

**Suggested title:** `Verify Video Node Registry & Palette Integration`

---

Date: 2026-03-17
Session: FLUX Schnell Catalog Integration ✅ SHIPPED

---

## Session Summary — FLUX Schnell Catalog Integration (2026-03-17)

Added FLUX Schnell (`fal-ai/flux/schnell`) as an explicit catalog entry in `models.ts`, closing the gap between the engine default and the UI-visible model set. The entry is placed directly after FLUX 1.1 Pro (both fal.ai models together), marked `supported: true`, `qualityTier: "draft"`, `costTier: "low"` (~$0.003/image), and tagged `["recommended", "fast"]` — making it auto-selected alongside FLUX 1.1 Pro in `getDefaultModels("image")`. This gives new users an immediate draft-vs-production side-by-side comparison on first load, which is the product's core A/B comparison value proposition. The `"fast"` tag was also removed from FLUX 1.1 Pro's tag list to eliminate the false badge overlap — Pro now carries `["recommended", "high-quality"]` and Schnell carries `["recommended", "fast"]`, giving each a distinct identity in the `ModelSelector` UI. Presets remain `["flux-1.1-pro"]` only (conservative). Typecheck clean; no execution path changes.

**Next recommended task:** Add FLUX Schnell and FLUX 1.1 Pro to the workflow canvas node palette — currently the node definitions in `packages/shared/src/nodeDefinitions/provider.ts` and the model bridge in `modelBridge.ts` are used to create node types; verify that `flux-schnell` and `flux-1.1-pro` catalog entries produce correct `NodeDefinition` objects via `modelToNodeDefinition()` and are registered in the node registry at startup via `initializeNodeRegistry()`, so both models appear as draggable nodes on the canvas.

**Suggested title:** `Verify Node Registry Reflects V1 Model Catalog`

---

Date: 2026-03-17
Session: Replicate SDXL Adapter Implementation ✅ SHIPPED

---

## Session Summary — Replicate SDXL Adapter Implementation (2026-03-17)

Implemented `ReplicateGeneratorAdapter` in `packages/engine/src/capabilities/generator.ts` using Replicate's synchronous predictions API (`Prefer: wait`) with an abortable polling fallback for predictions that exceed the wait window. The adapter rounds dimensions to the nearest 64 pixels (SDXL best practice), forwards `prompt`, `width`, `height`, `num_inference_steps: 30`, and optional `seed`, then downloads the returned CDN image to a Buffer matching the existing `GeneratedImage` contract. The `createGenerator()` factory was updated to add a `provider === "replicate"` branch that reads `REPLICATE_API_TOKEN` from the environment (never `FAL_API_KEY`), keeping provider env vars cleanly separated. The provider executor in `runs/route.ts` was updated with the same provider-aware env fallback so a Replicate node in a workflow correctly picks up `REPLICATE_API_TOKEN` rather than `FAL_API_KEY`. SDXL was restored to `supported: true` in `models.ts` (without the `"recommended"` tag, so it remains selectable but not auto-selected). All 7 new/updated factory and adapter tests pass; web typecheck is clean.

**Next recommended task:** Add FLUX Schnell (`fal-ai/flux/schnell`) as an explicit entry in `apps/web/src/config/models.ts` with `supported: true` and `tags: ["recommended", "fast"]` so it appears in the node palette and is auto-selected as a draft model alongside FLUX 1.1 Pro — currently the engine uses it as the default but it has no catalog representation, so users cannot see or select it through the UI.

**Suggested title:** `Add FLUX Schnell to Model Catalog`

---

Date: 2026-03-17
Session: SDXL Support Truth Alignment ✅ SHIPPED

---

## Session Summary — SDXL Support Truth Alignment (2026-03-17)

Fixed the SDXL `supported: true` inconsistency identified in the V1 Model Stack audit. In `models.ts`, flipped SDXL to `supported: false` and removed the `"recommended"` tag so it is no longer returned by `getDefaultModels()` and is no longer auto-selected on the prompt page. In `presets.ts`, removed `"sdxl"` from the `defaultModels` array of all four image presets (`instagram-post`, `youtube-thumbnail`, `blog-hero`, `product-mockup`) so applying a preset no longer silently selects a broken model. The `ModelSelector` component already gates disabled models via its `isDisabled` logic, so the UI will now correctly show SDXL as unavailable. No adapter or backend changes were made. Typecheck clean.

**Next recommended task:** Implement `ReplicateGeneratorAdapter` in `packages/engine/src/capabilities/generator.ts` — add the Replicate predictions API call (POST `/v1/predictions`, poll until `succeeded`), register it in the `createGenerator()` factory under `provider === "replicate"`, update `resolveProviderKey.ts` to handle the `"replicate"` provider ID, and flip SDXL back to `supported: true` once the adapter passes an integration test. This is the next concrete step in the V1 model stack sequence.

**Suggested title:** `Replicate Adapter Implementation (SDXL)`

---

Date: 2026-03-17
Session: V1 Model Stack Definition ✅ SHIPPED

---

## Session Summary — V1 Model Stack Definition (2026-03-17)

Audited the full model/provider integration state and produced `docs/V1_MODEL_STACK.md` — a complete inventory, launch-stack definition, and implementation plan for the V1 model layer. Key finding: the only functional execution path today is fal.ai (`FalGeneratorAdapter` in the engine), which already supports FLUX Schnell and FLUX 1.1 Pro end-to-end; the Replicate and Google adapters are both stubs. The most critical pre-launch inconsistency is that SDXL is marked `supported: true` in the model catalog but its Replicate execution path is unimplemented, creating silent breakage. The V1 stack targets three must-have milestones: FLUX Schnell + 1.1 Pro (already functional), SDXL via Replicate (new adapter needed), and Kling 1.6 video via fal.ai (new video output type in generator + provider executor). Video generation is the only item requiring a new capability path; all image additions are either catalog-only or a single new adapter. "V1 Complete" is defined with seven concrete, testable criteria, and all voice, LLM, and closed-API models (DALL·E 3, Midjourney, Firefly, Sora) are explicitly deferred.

**Next recommended task:** Fix the SDXL `supported: true` inconsistency — either implement `ReplicateGeneratorAdapter` in `packages/engine/src/capabilities/generator.ts` (wiring into `createGenerator()` and updating `resolveProviderKey.ts`) or flip the catalog flag to `false` until the adapter is ready. This is the only model-layer blocker before launch and unblocks the multi-provider A/B use case.

**Suggested title:** `Replicate Adapter & SDXL Integration`

---

Date: 2026-03-17
Session: Final Delight & Microcopy Polish Pass ✅ SHIPPED

---

## Session Summary — Final Delight & Microcopy Polish Pass (2026-03-17)

Audited all user-facing microcopy across the five target files and made eight targeted fixes. In `WorkflowCanvas.tsx`: fixed the ASCII ellipsis inconsistency ("Saving..." → "Saving…" to match all other in-progress states), added a `title` tooltip to the "Debugger" button so new users know it shows live node execution status, added a `title` to the health strip "failed" chip explaining how to investigate (consistent with the "stale" chip tooltip added last session), and tightened the empty-canvas headline from "No nodes yet" to "Canvas is empty" with cleaner body copy ("Add a node from the panel on the left, or start with a Template." — removes the awkward mid-sentence line break and "start from" idiom). In `CustomNode.tsx` and `InspectorPanel.tsx`: corrected "reruns" → "re-runs" in the Retry button `title` attributes. In `history/[runId]/page.tsx`: moved "Open in Editor" (the blue primary action) to the first position in the run action bar so visual priority matches interaction priority; renamed the secondary run trigger from "Re-run" → "Run Again" to be honest that it runs the current graph, not this historical snapshot; renamed the error state of Export Bundle from "Failed — Retry" to "Export failed — Retry" to remove ambiguity. Typecheck clean.

**Next recommended task:** Add 2–3 suggested workflow types (e.g. "Text to Image", "Image Pipeline", "Prompt Chain") directly in the empty-canvas state card — each as a one-click template insertion using the existing `handleTemplateSelect` path — to close the cold-start gap for first-time users who don't know which template to pick. This is the highest remaining first-impression friction point.

**Suggested title:** `Empty Canvas Cold-Start Suggestions`

---

Date: 2026-03-17
Session: End-to-End First-Time User Walkthrough Pass ✅ SHIPPED

---

## Session Summary — End-to-End First-Time User Walkthrough Pass (2026-03-17)

Audited the full primary user journey (edit → run → inspect → compare → restore → retry) for first-time-user friction and found four targeted issues to fix. First, the run detail page had two buttons — "Restore to Canvas" and "Edit & Replay" — that both navigated to identical URLs (`?replay=<runId>`), making the distinction meaningless and creating false choice for new users; consolidated into a single "Open in Editor" button with a blue accent to make the primary action clear, matching what the amber banner on the canvas already says ("edit or run as new"). Second, each run row in the history list had no direct restore path — users had to click "View" to reach the detail page and then click "Restore to Canvas", adding an unnecessary step; added a compact "Restore" link (accent color, visible only for `completed` and `partial_failure` runs) directly to each row's action cluster. Third, the Inspector's Run tab showed "No run data yet." when no live run was active — a dead end that gave first-time users no indication that historical execution data exists on the Config tab; improved the message to "No active run — select a node during a live run to see execution details. Last run summary is in the Config tab." Fourth, the health strip's "N stale" chip had no tooltip, leaving first-time users unsure what "stale" means or what to do about it; added a descriptive `title` attribute explaining that stale nodes have changed params or structure since the last run and need a re-run. Typecheck clean.

**Next recommended task:** Audit the empty-canvas first-run experience — a brand-new user who opens a workflow with no nodes sees "No nodes yet" but gets no contextual guidance on what kind of workflow to build or which template to start from. Add 2–3 suggested workflow types (text, image, pipeline) directly in the empty state, with one-click template insertion, to close the cold-start gap.

**Suggested title:** `Empty Canvas Cold-Start Onboarding`

---

Date: 2026-03-17
Session: Flow Smoothness & Micro-Friction Elimination Pass ✅ SHIPPED

---

## Session Summary — Flow Smoothness & Micro-Friction Elimination Pass (2026-03-17)

Audited `WorkflowCanvas.tsx` and `InspectorPanel.tsx` for micro-friction and found five targeted issues. First, `TERMINAL_BADGE` was defined as a `const` inside the `CanvasInner` component body, causing it to be recreated on every render; moved it to module scope before `CanvasInner`. Second, the Run button was enabled and styled green during an active SSE run (`debugSnapshot?.status === "running"` with `isRunning === false`) — clicking it would dispatch a duplicate run; added `|| debugSnapshot?.status === "running"` to the `disabled` condition, title chain, and className check, and updated the button label to "Running…" with a pulse dot whenever the button is in either starting or active-run state, giving the button a single coherent disabled-with-feedback appearance for the full run lifecycle. Third, the "Pending" auto-run health chip was being shown during a live run (when `health.isLiveRunning` is true), adding noise when the canvas is already showing run-in-progress signals on each node; added `&& !health.isLiveRunning` to the render condition so the chip only appears between runs. Fourth, `PresetBar` in `InspectorPanel.tsx` was using `useLayoutEffect` for an async `fetch()` call — `useLayoutEffect` runs synchronously before paint and is intended for DOM measurements, not async side effects; changed to `useEffect`. Fifth, the Inspector's auto-switch-to-Run-tab effect fired on `"running"` and `"failed"` but not `"cancelled"` — a cancelled node would leave the user on whatever tab they were viewing; added `|| runStatus === "cancelled"` to the condition so the Run tab is shown whenever execution state is relevant. Typecheck clean; all 11 store tests pass.

**Next recommended task:** Add a "Restore" action directly to each run row in the run history list page (`/workflows/[id]/history`) so users don't need to enter the run detail page to restore — a compact "Restore" button per row navigating to `?replay=<runId>` would complete the versioning workflow, and is the natural follow-on to the restore, hardening, and clarity passes.

**Suggested title:** `Quick Restore from Run History List`

---

Session: Interaction Feedback & Cause–Effect Clarity Pass ✅ SHIPPED

---

## Session Summary — Interaction Feedback & Cause–Effect Clarity Pass (2026-03-17)

Audited the full edit→run→result→compare interaction loop for cause–effect clarity and found three precise bugs. First, in `CustomNode.tsx` the amber stale dot was suppressed only when a node's own live status was `"running"` — nodes with `"queued"` or `"pending"` live status still showed both a live execution dot and the stale amber dot simultaneously, creating two competing signals during an active run; changed the guard from `runStatus !== "running"` to `runStatus === null` so the stale dot is completely suppressed whenever any live per-node status is present, giving live execution state sole visual ownership during a run. Second, in `workflowStore.ts` the `runWorkflow()` action set `debugSnapshot: null` at dispatch time but did not clear `nodeRunStatesById`, causing previous-run badges (green/red dots) to briefly re-flash on all canvas nodes during the gap between dispatch and the first SSE event; added `nodeRunStatesById: {}` to the same `set()` call so old badges vanish the moment a new run is confirmed. Third, in `history/[runId]/page.tsx` the "Compare ↑ Prev" button silently did nothing when the current run is the first (no previous run exists) — `handleCompare` returned early with no user feedback, making the button appear broken; added a `compareNoPrev` boolean state that shows "No prev run" in the button label for 2 seconds on click, replacing the silent return with clear feedback. Typecheck is clean; all 11 store tests pass.

**Next recommended task:** Add a "Restore" action directly to each run row in the run history list page (`/workflows/[id]/history`) so users don't need to enter the run detail page to restore — a compact "Restore" button per row navigating to `?replay=<runId>` would complete the versioning workflow, and is the natural follow-on to the restore, hardening, and clarity passes.

**Suggested title:** `Quick Restore from Run History List`

---

## Session Summary — Editor State Clarity & UX Consistency Pass (2026-03-17)

---

## Session Summary — Editor State Clarity & UX Consistency Pass (2026-03-17)

Audited all node state signals, inspector output trust, auto-run predictability, retry affordances, execution highlighting, and banner/health-strip interactions and found four targeted issues to fix. First, `CustomNode` was showing a green "success" dot AND an amber stale dot simultaneously after params changed post-run — the green dot is misleading when the node needs a re-run; fixed by suppressing the persisted success dot when `isStale` is true (failed nodes always retain their red dot since error context is still actionable). Second, the `LatestOutputSection` in `InspectorPanel` had no indication that its preview was from an old run when the node was stale; fixed by adding a small inline amber "(outdated)" label next to the "Latest Output" heading when `isStale` is true, giving users an immediate cue to re-run before trusting the preview. Third, `clearStaleNodes()` in `WorkflowCanvas` was only called on `completed` run status, leaving false stale indicators on all nodes after a `partial_failure` run that did execute; expanded the condition to include `partial_failure` so the Inspector and health strip reflect reality after every workflow execution. Fourth, the health strip chip had a dead-code ternary `{failedCount === 1 ? "failed" : "failed"}` (both branches identical); simplified to a plain string. Typecheck is clean; all 11 store tests pass.

**Next recommended task:** Add a "Restore" action directly to each run row in the run history list page (`/workflows/[id]/history`) so users don't need to enter the run detail page to restore — a compact "Restore" button per row navigating to `?replay=<runId>` would complete the versioning workflow and is the natural follow-on after both the snapshot-restore and hardening passes.

**Suggested title:** `Quick Restore from Run History List`

---

## Session Summary — Replay/Restore State-Coherence Hardening Pass (2026-03-17)

---

## Session Summary — Replay/Restore State-Coherence Hardening Pass (2026-03-17)

Audited the full replay/restore load path and confirmed that `loadWorkflow` already resets all session state that could produce misleading carryover UI after a graph is loaded from history: `staleNodeIds`, `nodeRunStatesById`, `latestExecutionByNodeId`, `latestOutputsByNode`, and all auto-run queue flags are zeroed. The auto-run `paramEditSeq` mechanism was verified to be safe — it is deliberately not reset on load, so no auto-run fires just because a new graph was mounted. One real bug was found and fixed: on the first load of a `?replay=<runId>` page, the on-load outputs effect in `WorkflowCanvas.tsx` was keyed on `meta?.id` alone, causing it to populate `latestOutputsByNode` with the **most recently completed run's outputs** rather than the outputs from the run being replayed. This makes the Inspector's "Latest Output" section show data from a different, potentially unrelated run. The fix adds `replayRunId` to the effect's deps and branches: when replay is active, the effect fetches that run's outputs directly; otherwise the existing "find latest completed run" path is used. When the banner is dismissed or a new run fires (both clear `replayRunId`), the effect naturally re-triggers and refetches the latest run. Three targeted store tests were added to `workflowStore.test.ts` to lock in the reset guarantees for `latestOutputsByNode`, `staleNodeIds`, `nodeRunStatesById`, and `latestExecutionByNodeId`. All 11 store tests pass; typecheck is clean.

**Next recommended task:** Add a "Restore" action directly to each run row in the run history list page (`/workflows/[id]/history`) so users don't need to enter the run detail page to restore — a compact "Restore" button per row navigating to `?replay=<runId>` would complete the versioning workflow and is the natural follow-on after both the snapshot-restore and hardening passes.

**Suggested title:** `Quick Restore from Run History List`

---

## Session Summary — Run Snapshot Restore (Lightweight Versioning v1) (2026-03-17)

Added "Restore to Canvas" as a distinct action on the run history detail page, enabling users to load any prior run's graph snapshot back into the editor with a single click. The implementation fully reuses the existing `?replay=<runId>` URL mechanism and `loadWorkflow(meta, graph, replayRunId)` store action — no new backend endpoints, no new store state, and no changes to the graph loading path. "Restore to Canvas" (secondary/neutral style) was placed before "Edit & Replay" (primary blue) in the action bar to communicate different user intents: restore-then-decide vs. restore-then-edit-then-run. The replay banner text was updated from "Editing from run..." to "Graph loaded from run... — edit or run as new" to be accurate for both entry paths. Clean state replacement on restore is already guaranteed by `loadWorkflow`, which resets `staleNodeIds`, `latestOutputsByNode`, `nodeRunStatesById`, `latestExecutionByNodeId`, and all auto-run queue flags. No store changes were required.

**Next recommended task:** Add a "Restore" action directly to each run row in the run history list page (`/workflows/[id]/history`) so users don't need to enter the run detail page to restore — a compact "Restore" button per row navigating to `?replay=<runId>` would complete the versioning workflow.

**Suggested title:** `Quick Restore from Run History List`

---

## Session Summary — One-Click Retry from Failed Node (2026-03-17)

---

## Session Summary — One-Click Retry from Failed Node (2026-03-17)

Added a compact retry affordance in two places — the failed node's inline error strip on the canvas and the Inspector's "Last Run" section — so users can recover from failures without hunting for the main Run button. A new `retryRun.ts` helper defines `RetryMode` (`"workflow_retry" | "unavailable"`), `RetryContext`, and `canRetry()` / `getRetryMode()` with honest inline comments documenting that the backend only supports full-workflow runs (no partial/subgraph retry exists). In `CustomNode`, a `canShowRetry` store selector (`!isRunning && !!meta`) gates a small "Retry" button right-aligned inside the red error strip, using `useWorkflowStore.getState().runWorkflow()` — the same path as the manual Run button. In `InspectorPanel`'s `LastRunSection`, `canRetry()` is evaluated against `isRunning` and `summary.status === "failed"`, and a red "Retry" text button appears in the footer row alongside the existing "Open Run" link, with a separator dot when both are visible. All guardrails reuse existing run-in-progress state; no store changes were needed.

**Next recommended task:** Add a live retry attempt counter to the failed-node error strip — show "Retry N" (incrementing on each rerun from the same failure context) so users can tell at a glance how many times a node has been attempted, drawing from the existing `attempt` field already present in `NodeDebugInfo`.

**Suggested title:** `Retry Attempt Counter on Failed Nodes`

---

## Session Summary — Execution Path Highlighting on Canvas (2026-03-17)

---

## Session Summary — Execution Path Highlighting on Canvas (2026-03-17)

Added real-time execution path highlighting so users can visually trace a live run through the graph without any backend changes or new data sources. A new pure helper `executionPath.ts` derives `ExecutionPathSummary` from the existing `debugSnapshot.nodes` and the React Flow edge list, classifying edges as `activeFeedEdgeIds` (completed→running) or `completedPathEdgeIds` (completed→completed). In `WorkflowCanvas`, a `styledEdges` memo maps the edge list to per-edge style overrides only while `debugSnapshot.status === "running"`: active-feed edges become blue (`#60a5fa`), strokeWidth 2.5, animated; completed-path edges become dim green (`#4ade80`), 1.5px, static; unreached edges dim to near-black (`#3a3a3a`), 1px, static — returning the original edge list unchanged outside a live run. In `CustomNode`, currently-running nodes gain a `border-blue-400/70 ring-1 ring-blue-400/20` treatment (slotted between the failed/blocked and selected cases) so the active node border coordinates with the active feed edges. No store state was added; all highlighting is derived in-component from existing live data.

**Next recommended task:** Add a "pan/zoom to running node" behavior — when a new node transitions to `running` status during a live execution, optionally auto-pan the viewport to keep the active node in view, with a user toggle to enable/disable this behavior (useful for long sequential pipelines).

**Suggested title:** `Auto-Pan to Active Node During Execution`

---

## Session Summary — Workflow Health Strip in Canvas Top Bar (2026-03-17)

---

## Session Summary — Workflow Health Strip in Canvas Top Bar (2026-03-17)

Added a compact, glanceable health strip as a second row in the canvas top bar that surfaces the most important workflow-state signals without cluttering primary actions. A new pure helper `workflowHealth.ts` derives a `WorkflowHealthSummary` (failedCount, staleCount, isLiveRunning, autoRunPending, autoRunQueued) from existing store state — no new data sources or polling. The `WorkflowHealthStrip` component renders these as small colored chips: a pulsing `● Running` (blue) when a live SSE run is active, pulsing `Queued` (amber) or `Pending` (neutral) for auto-run queue state, `N failed` (red) from `nodeRunStatesById`, and `N stale` (yellow) from `staleNodeIds`; it renders nothing when all signals are absent. The standalone `Pending…/Queued…` text indicator was removed from the action row since the health strip now owns those signals. The top bar was wrapped in a `flex-col` container so the two rows stack cleanly, and `staleNodeIds` / `nodeRunStatesById` were added to the `CanvasInner` store destructure. Typecheck passes clean.

**Next recommended task:** Add click-to-filter behavior to the health strip chips — clicking `N stale` should highlight stale nodes on the canvas (pan/zoom to them or add a visual outline), and clicking `N failed` should open the Debugger panel filtered to failed nodes, turning the health strip into an interactive navigation surface.

**Suggested title:** `Health Strip Chip Navigation (Click-to-Focus)`

---

## Session Summary — Auto-Run Queue + Rerun Collapse (2026-03-17)

Added a lightweight client-side run queue that collapses rapid parameter edits into a single execution and ensures edits made during a run produce exactly one follow-up. A new `runQueue.ts` module provides `requestAutoRun()` (starts a run or marks one queued if in-flight) and `onAutoRunComplete()` (fires the queued run if one is waiting). The store gained three session-only boolean flags — `autoRunPending`, `autoRunQueued`, `autoRunInFlight` — with matching setters, all cleared on `loadWorkflow`. In `WorkflowCanvas`, the debounce no longer bails out when a run is in-flight (removing the old `isRunningRef` guard), and a new `isRunning` transition effect calls `onAutoRunComplete()` on run completion. The toolbar indicator now shows "Pending…" during debounce and "Queued…" when a follow-up is waiting. Typecheck passes clean with no new dependencies or backend changes.

**Next recommended task:** Add per-node "re-run" affordance in the Inspector — a small "Re-run from here" button that triggers a partial run starting at the selected node (or resets auto-run state for downstream-only execution), giving users finer control than a full workflow re-run.

**Suggested title:** `Partial Re-Run from Selected Node`

---

## Session Summary — Mini Execution Trace in Inspector (2026-03-17)

Added a compact "Last Run" section to the Inspector's Config tab, giving users inline per-node execution observability without leaving the canvas. A new `nodeExecutionSummary.ts` lib normalizes `NodeDebugInfo` into a `NodeExecutionSummary` shape (status, duration, model/provider, cost, truncated error). The store gained a `latestExecutionByNodeId` map (session-only, cleared on workflow load and new-run start), populated from `debugSnapshot.nodes` whenever a run reaches any terminal status in `WorkflowCanvas`. The `LastRunSection` component renders status, duration, model, provider, cost, a clipped error block on failure, and a conditional "Open Run" link that is suppressed when `LatestOutputSection` already shows one for the same run. Typecheck passes clean with no new dependencies.

**Next recommended task:** Extend `LastRunSection` to also surface live in-progress execution state (status `running`/`queued`) from `debugSnapshot` in real time, so the Config tab reflects the current run without requiring the user to switch to the Run tab.

**Suggested title:** `Live Node Execution Status in Inspector Config Tab`

---

## Session Summary — Inline Node Run-State Badges on Canvas (2026-03-17)

### `apps/web/src/lib/nodeRunState.ts` (new)

---

## Session Summary — Inline Node Run-State Badges on Canvas (2026-03-17)

### `apps/web/src/lib/nodeRunState.ts` (new)
Small typed helpers for normalizing per-node run status into a stable UI state. Exports: `NormalizedNodeRunState` (`idle | running | success | failed`), `TERMINAL_RUN_STATUSES` set (covers both workflow-level and node-level terminal statuses), `NODE_STATE_DOT` (visual config for non-idle states — color, pulse, label), `normalizeNodeStatus(status)` maps raw node status strings, and `buildNodeRunStatesMap(nodes)` returns a `Record<string, NormalizedNodeRunState>` containing only non-idle entries.

### `apps/web/src/stores/workflowStore.ts`
- Added `nodeRunStatesById: Record<string, NormalizedNodeRunState>` (session-only, cleared in `loadWorkflow`)
- Added `setNodeRunStates(map)` and `clearNodeRunStates()` actions
- Imports `NormalizedNodeRunState` from `@/lib/nodeRunState`

### `apps/web/src/components/canvas/WorkflowCanvas.tsx`
- Imports `buildNodeRunStatesMap` and `TERMINAL_RUN_STATUSES` from `@/lib/nodeRunState`
- Destructures `setNodeRunStates` and `clearNodeRunStates` from the store
- Two new effects:
  1. **Terminal capture**: fires when `debugSnapshot.status` enters any terminal status → calls `buildNodeRunStatesMap(debugSnapshot.nodes)` and persists via `setNodeRunStates`
  2. **New-run clear**: fires when `debugSnapshot.status === "running"` → calls `clearNodeRunStates()` so stale badges don't linger on nodes not yet reached

### `apps/web/src/components/canvas/CustomNode.tsx`
- Imports `NODE_STATE_DOT` from `@/lib/nodeRunState`
- Added `persistedRunState` selector: reads `nodeRunStatesById[id]` only when `debugSnapshot` is null (returns null during live runs so live status always takes priority)
- `dot` computation: live `STATUS_DOT[runStatus]` → fallback `NODE_STATE_DOT[persistedRunState]` → null
- `isFailed` extended to cover `persistedRunState === "failed"` when no live status is present

### Key files modified / created

| File | Changes |
|------|---------|
| `apps/web/src/lib/nodeRunState.ts` | New — normalized run state helpers |
| `apps/web/src/stores/workflowStore.ts` | `nodeRunStatesById` + `setNodeRunStates` + `clearNodeRunStates` |
| `apps/web/src/components/canvas/WorkflowCanvas.tsx` | Terminal-capture + new-run-clear effects |
| `apps/web/src/components/canvas/CustomNode.tsx` | Persisted dot fallback via `persistedRunState` |

---

**Next recommended task:** Add a "What's Connected" section to the Inspector's Ports tab listing the actual connected node names for each port, so users can trace data flow without looking at the canvas.

---

## Session Summary — Parameter Diff in Run Compare View (2026-03-17)

### `apps/web/src/lib/runDiff.ts` (new)
Pure client-side diff utility. `computeRunDiff(currGraph, prevGraph, currExecutions, prevExecutions)` returns up to 10 `DiffEntry` objects. When graph snapshots are available it: (1) surfaces added/removed nodes as `node_added`/`node_removed` entries, (2) diffs all `data.params` + `modelId` + `providerId` per shared node, deduplicates trivially-equal values via JSON comparison, and sorts by a priority list (prompt → model → size/quality params → other). A `KEY_DISPLAY` map converts raw param keys to readable labels (`num_inference_steps` → "Steps", `guidance_scale` → "Guidance", etc.). Falls back to execution-level `modelId` comparison when graph snapshots are absent.

### `apps/web/src/app/(app)/workflows/[id]/history/[runId]/page.tsx`
`handleCompare` now fires three parallel requests (`prev run detail` + `/graph` for current run + `/graph` for prev run) via `Promise.all`. The `compareRun` state type gains a `graph: WorkflowGraph | null` field; `currentRunGraph` is a new top-level state. `RunComparePanel` receives `currentGraph`/`prevGraph` and calls `computeRunDiff` inside a `useMemo`. The result renders as a "What Changed" subsection above the existing node-status table: `+` green rows for added nodes, `−` red rows for removed nodes, and `·` rows for param changes showing `nodeLabel — Key: old → new` with prompts in italics.

### Key files modified / created

| File | Changes |
|------|---------|
| `apps/web/src/lib/runDiff.ts` | New — typed diff utility |
| `apps/web/src/app/(app)/workflows/[id]/history/[runId]/page.tsx` | Graph fetches in `handleCompare`; `RunComparePanel` extended with "What Changed" section |

---

**Next recommended task:** Add a "What's Connected" section to the Inspector's Ports tab listing the actual connected node names for each port, so users can trace data flow without looking at the canvas.

---

## Session Summary — Quick Chain Presets in Slash Palette (2026-03-17)

---

## Session Summary — Quick Chain Presets in Slash Palette (2026-03-17)

### `apps/web/src/lib/presets.ts` (new)
Defines `Preset` + `PresetEdgeSpec` types, a `PRESETS` catalog of 4 presets (`Prompt → Image`, `Image → Resize → Output`, `Image → CLIP → Ranking`, `Full Pipeline`), and a `filterPresets(query)` helper. Each preset carries `keywords[]` for broader search matching beyond label/description. No runtime dependencies — pure data.

### `apps/web/src/stores/workflowStore.ts`
Added `insertNodes(nodes: WorkflowNode[], edges: WorkflowEdge[])` action. Calls `pushHistory()` once, then batches all nodes (`toFlowNode`) + edges into a single `setState` call — the entire preset insertion is one undo step. Selects the first inserted node and opens the inspector.

### `apps/web/src/components/canvas/WorkflowCanvas.tsx`
- Replaced `slashNodes: NodeDefinition[]` with `slashItems: SlashItem[]` — a union of `{ kind: "node"; def }` and `{ kind: "preset"; preset }`. Presets come first in results.
- Added `selectSlashPreset` callback (after `screenToFlowPosition`): computes a horizontally-centered anchor, creates all nodes with 240px spacing, builds typed `WorkflowEdge[]` from `PresetEdgeSpec` indices, then calls `insertNodes` — single undo step.
- Rendering: presets get a violet `Preset` badge + node count; a thin divider separates the preset section from the node section when both are present. Keyboard nav (`↑↓`, `Enter`, `Esc`) works identically across the flat unified list.

### Key files modified / created

| File | Changes |
|------|---------|
| `apps/web/src/lib/presets.ts` | New — preset catalog + `filterPresets` helper |
| `apps/web/src/stores/workflowStore.ts` | `insertNodes` action added |
| `apps/web/src/components/canvas/WorkflowCanvas.tsx` | Slash palette upgraded to `SlashItem` union; preset insertion wired |

---

**Next recommended task:** Add a "What's Connected" section to the Inspector's Ports tab that lists the actual connected node names for each port, giving users a data-flow overview without looking at the canvas.

---

## Session Summary — Smart Suggestions (Heuristic Co-Pilot v1) (2026-03-17)

---

## Session Summary — Smart Suggestions (Heuristic Co-Pilot v1) (2026-03-17)

### `apps/web/src/lib/suggestions.ts` (new)
Created a pure client-side suggestions engine. Exports `getSuggestions(node, graph): Suggestion[]` with a `Suggestion` type (`id`, `label`, `description`, `action`). Seven heuristic rules fire in order until `MAX_SUGGESTIONS = 4` is reached:
- `image-generation` / `image-input` with unconnected `image_out` → Add Resize
- `image-generation` / `image-input` with no CLIP Scoring node in graph → Add CLIP Scoring
- `image-generation` / `image-input` with no Format Convert in graph → Add Format Convert
- `prompt-template` with no image-generation in graph → Add Image Generator (connects `text_out` → `prompt_in`)
- `clip-scoring` with no ranking node → Add Ranking
- `best-of-n` with no clip-scoring → Add CLIP Scoring
- Any node with outputs and no Output node in graph → Connect to Output

Each action calls `pushHistory()` once, then batches the new node + auto-connecting edge + selection into a single `setState` call (one undo step).

### `apps/web/src/components/inspector/InspectorPanel.tsx`
Added `SuggestionsSection` component rendered at the bottom of the Config tab (after `NodeConfig`). Reads `getWorkflowGraph()` from the store and calls `getSuggestions`. Hidden when the list is empty. Each suggestion renders as a subtle bordered button with a blue hint icon, label, and description.

### Key files modified / created

| File | Changes |
|------|---------|
| `apps/web/src/lib/suggestions.ts` | New — heuristic suggestion engine |
| `apps/web/src/components/inspector/InspectorPanel.tsx` | `SuggestionsSection` added to Config tab |

---

**Next recommended task:** Add a "What's Connected" section to the Inspector's Ports tab that lists the actual connected nodes for each port (not just port types), so users can trace the data flow without looking at the canvas.

---

## Session Summary — Slash Command, Duplicate Node, Insert Artifact, Compare Run (2026-03-17)

---

## Session Summary — Slash Command, Duplicate Node, Insert Artifact, Compare Run (2026-03-17)

### `stores/workflowStore.ts`
Added `duplicateNode(nodeId)` action: snapshots history, clones the ReactFlow node with a new UUID, offsets position by +40px in both axes, adds to the node list, and selects the clone with the inspector open.

### `components/canvas/WorkflowCanvas.tsx`
- **Slash command menu** (`/` key): pressing `/` on the canvas (not inside an input) opens a centered overlay with a search input auto-focused, a filtered scrollable node list from `nodeRegistry.getAvailable()`, arrow-key navigation, Enter to insert at viewport center, Escape to close. A "↑↓ navigate · Enter insert · Esc close" hint row is shown at the bottom.
- **Duplicate node** (`⌘D / Ctrl+D`): added to `handleKeyDown`; calls `duplicateNode(selectedNodeId)` when a node is selected.

### `components/canvas/CustomNode.tsx`
Added a duplicate icon button in the header row of each node, visible on hover or when the node is selected. Calls `useWorkflowStore.getState().duplicateNode(id)` directly.

### `app/(app)/workflows/[id]/history/[runId]/page.tsx`
- **Compare ↑ Prev button**: added to the run actions section (after Edit & Replay). Lazily fetches the run list, finds the previous run by `createdAt` sort order, fetches its details, and renders a `RunComparePanel` component.
- **`RunComparePanel`**: shows cost delta (green/red), duration delta, status transition, and a per-node table with prev status → current status columns. Rows with no status change are dimmed. Toggle button hides/shows the panel without re-fetching.

### Key files modified

| File | Changes |
|------|---------|
| `stores/workflowStore.ts` | `duplicateNode` action added to interface + implementation |
| `components/canvas/WorkflowCanvas.tsx` | Slash command overlay + `⌘D` shortcut |
| `components/canvas/CustomNode.tsx` | Duplicate icon button on hover/selected |
| `app/(app)/workflows/[id]/history/[runId]/page.tsx` | Compare ↑ Prev button + `RunComparePanel` component |

---

**Next recommended task:** Add a "⌘D" entry to the canvas shortcut help surface (if one exists), and audit the run history detail page's keyboard shortcut reference to include the new `R` (re-run) shortcut that was added in an earlier session.

---

## Session Summary — Cmd/Ctrl+F Added to Workflow List Shortcut Help Panel (2026-03-17)

---

## Session Summary — Cmd/Ctrl+F Added to Workflow List Shortcut Help Panel (2026-03-17)

### `app/(app)/workflows/page.tsx`
Added `["⌘F / Ctrl F", "Focus search"]` immediately before the `⌘A / Ctrl A` entry — grouped with other modifier-key page-level shortcuts at the bottom of the panel. One tuple insertion, no other changes.

### Key files modified

| File | Changes |
|------|---------|
| `apps/web/src/app/(app)/workflows/page.tsx` | One entry added to shortcut help panel tuple array |

---

**Next recommended task:** Apply the same shortcut help panel audit to the workflow history page — verify whether `C`, `Enter`, and `R` shortcuts added there are documented in any visible help surface, and add a compact shortcut reference if one does not already exist.

---

## Session Summary — Workflow List Shortcut Help Panel Updated for Enter and C (2026-03-17)

### `app/(app)/workflows/page.tsx`
Added `["Enter", "Open focused workflow"]` and `["C", "Copy focused workflow ID"]` as the first two entries in the shortcut help panel array. The panel renders from a `[string, string][]` tuple array mapped to `<kbd>` + description rows — no structural changes needed. All ten existing shortcuts were preserved. One edit.

### Key files modified

| File | Changes |
|------|---------|
| `apps/web/src/app/(app)/workflows/page.tsx` | Two entries prepended to the shortcut help panel tuple array |

---

**Next recommended task:** Add a "⌘F / Ctrl F" entry to the shortcut help panel for the existing search-focus shortcut, which is already implemented on the page but not listed in the help panel.

---

## Session Summary — Workflow Card Accessibility Labels Updated for Keyboard Shortcuts (2026-03-17)

### `app/(app)/workflows/page.tsx`
Updated `title` and `aria-label` on the workflow card `<Link>` element to include the two shortcuts added in the previous session. `title` now reads `Enter — Open  C — Copy ID  X — Run` on the first shortcut line, followed by the existing lines. `aria-label` now prepends `Enter Open, C Copy ID` before the existing shortcut list. All existing shortcut references (`R Rename`, `E Export`, `D Duplicate`, `P Pin`, `Del Delete`) were preserved unchanged. One edit, no layout or logic changes.

### Key files modified

| File | Changes |
|------|---------|
| `apps/web/src/app/(app)/workflows/page.tsx` | `title` and `aria-label` on card `<Link>` updated to include `Enter Open` and `C Copy ID` |

---

**Next recommended task:** Check whether the existing shortcut help panel (`showShortcutHelp`) on the workflow list page lists all current shortcuts accurately, and add `Enter — Open` and `C — Copy ID` to it if they are missing.

---

## Session Summary — Hover Keyboard Shortcuts on Workflow List Page (2026-03-17)

### `app/(app)/workflows/page.tsx`
`R` was already taken for rename and `X` already triggered runs on this page, so the shortcuts added are `Enter` (open) and `C` (copy ID), with `X Run` used in the hint cluster instead of `R Run`. Added `copiedWorkflowId: string | null` state for per-card copy feedback. Extended the existing large `onKeyDown` `useEffect` with `Enter` → `router.push(\`/workflows/${activeWorkflowId}\`)` and `C` → `navigator.clipboard.writeText` with a functional-updater timeout (same pattern as history page). The hint cluster (`C Copy/Copied!`, `↵ Open`, `X Run`) renders below the action row inside the `<Link>` card, visible only when `activeWorkflowId === w.id`. Green color feedback on `C` when `copiedWorkflowId === w.id`. Typecheck clean.

### Key files modified

| File | Changes |
|------|---------|
| `apps/web/src/app/(app)/workflows/page.tsx` | `copiedWorkflowId` state + `Enter`/`C` in existing `onKeyDown` + hint cluster inside workflow card |

---

**Next recommended task:** Update the existing `title` and `aria-label` on the workflow cards to include the new `Enter` (open) and `C` (copy) shortcuts alongside the existing ones, so screen reader users and tooltip readers see the complete shortcut reference.

---

## Session Summary — "R" Keyboard Shortcut to Re-run Hovered History Row (2026-03-17)

### `app/(app)/workflows/[id]/history/page.tsx`
Added a `R` key `useEffect` (deps: `[rerunning]` so the in-flight guard stays current) that checks modifier keys, text-input targets, `focusedRunIdRef.current`, and `rerunning` before calling the existing `handleRerun()` directly — no new logic. Extended the hint cluster tuple from `[["C","Copy"],["↵","Open"]]` to `[["C","Copy"],["↵","Open"],["R","Re-run"]]`, adding one entry and zero new styling. The keyboard trio (`C`, `Enter`, `R`) is now complete with matching hover hints for all three actions.

### Key files modified

| File | Changes |
|------|---------|
| `apps/web/src/app/(app)/workflows/[id]/history/page.tsx` | `R` key `useEffect` + `"R","Re-run"` added to hint cluster tuple |

---

**Next recommended task:** Add the same `C` / `Enter` / `R` keyboard affordance pattern to the workflow list page (`/workflows`) so users can copy workflow IDs, open workflows, and trigger runs directly from the list without navigating to the history page first.

---

## Session Summary — Shortcut Hints on Hovered History Rows (2026-03-17)

### `app/(app)/workflows/[id]/history/page.tsx`
Added `hoveredRunId: string | null` state alongside the existing `focusedRunIdRef`. The `onMouseEnter`/`onMouseLeave` handlers on each run row now update both (ref for zero-render keyboard path, state for the hint render). When `hoveredRunId === run.id`, a compact hint cluster appended after the Re-run button renders two `<kbd>`-styled key+label pairs: `C Copy` and `↵ Open`. Hints use `fontSize: 9`/`10`, `var(--color-border)` outline, and `var(--color-bg-primary)` fill — visually subordinate to primary actions. No layout restructuring, no animations, no new abstractions.

### Key files modified

| File | Changes |
|------|---------|
| `apps/web/src/app/(app)/workflows/[id]/history/page.tsx` | `hoveredRunId` state + updated mouse handlers + hint cluster in row right-side actions |

---

**Next recommended task:** Add an `R` keyboard shortcut on the history page to re-run the currently hovered workflow, completing the keyboard trio (`C` copy, `Enter` open, `R` re-run) and adding an `R` hint to the hover cluster.

---

## Session Summary — Enter Shortcut to Open Hovered Run Detail from History List (2026-03-17)

### `app/(app)/workflows/[id]/history/page.tsx`
Added a new `useEffect` (document-level, `[id]` deps) for the `Enter` key, placed immediately before the existing `C` shortcut handler. Guards: all modifier keys (`metaKey`, `ctrlKey`, `altKey`, `shiftKey`), INPUT/TEXTAREA/contenteditable targets, and null `focusedRunIdRef.current`. On pass: calls `router.push(`/workflows/${id}/history/${rid}`)` — the same route already used by the row's `View` link. No new state, no route-building helper needed, no visual changes.

### Key files modified

| File | Changes |
|------|---------|
| `apps/web/src/app/(app)/workflows/[id]/history/page.tsx` | Enter key `useEffect` before the C shortcut handler |

---

**Next recommended task:** Add an `R` keyboard shortcut on the history page to re-run the currently hovered workflow from the history list, complementing `C` (copy ID) and `Enter` (open detail) to make the list fully operable without a mouse.

---

## Session Summary — "C" Keyboard Shortcut to Copy Run ID from History List (2026-03-17)

### `app/(app)/workflows/[id]/history/page.tsx`
Added `focusedRunIdRef` (a `useRef<string | null>`) to track the hovered run without triggering re-renders. Each run row div gains `onMouseEnter`/`onMouseLeave` handlers that mutate the ref directly. A new `useEffect` (empty deps, same structure as the Cmd+F handler) listens for `"c"` / `"C"` keydown events, guards against modifier keys and input/textarea/contenteditable targets, reads `focusedRunIdRef.current`, and if non-null calls `navigator.clipboard.writeText` — then drives the existing `copiedRunId` state with the same functional-updater timeout pattern already used by the click button, so the row's visual "copied" feedback fires identically whether triggered by mouse or keyboard.

### Key files modified

| File | Changes |
|------|---------|
| `apps/web/src/app/(app)/workflows/[id]/history/page.tsx` | `focusedRunIdRef` + `C` key `useEffect` + `onMouseEnter`/`onMouseLeave` on run row divs |

---

**Next recommended task:** Add an `Enter` keyboard shortcut on the history page to navigate into the run detail page for the currently hovered run, complementing the `C` copy shortcut and making the list fully keyboard-navigable for power users.

---

## Session Summary — Copy Run ID Action on History List Rows (2026-03-17)

### `app/(app)/workflows/[id]/history/page.tsx`
Added `copiedRunId: string | null` state (single variable for the entire list — tracks which row is in the "copied" state). A `copy` button inserted after the `<code>{run.id.slice(0,8)}</code>` in each row calls `navigator.clipboard.writeText(run.id)` (full ID), sets `copiedRunId` to that row's ID on success, and resets after 1500 ms using a functional updater that guards against resetting a newer row's state. `e.stopPropagation()` prevents any click-through to row navigation. Visual feedback: text swaps to `"copied"` and color shifts to `#4ade80`, matching the run detail page pattern exactly. Silent failure. No new state objects, no shared helper, no backend changes.

### Key files modified

| File | Changes |
|------|---------|
| `apps/web/src/app/(app)/workflows/[id]/history/page.tsx` | `copiedRunId` state + copy button in each run row |

---

**Next recommended task:** Add a keyboard shortcut (`C`) to copy the run ID of the currently focused/hovered run row on the history page, complementing the existing `X` shortcut for running the focused workflow card from the workflow list.

---

## Session Summary — Copy Run ID Action on Run Detail Header (2026-03-17)

### `app/(app)/workflows/[id]/history/[runId]/page.tsx`
Added a `copiedRunId` boolean state and a small `copy` button inline after the `<code>{run.id}</code>` element in the run header. Clicking calls `navigator.clipboard.writeText(run.id)`, on success sets `copiedRunId = true` and schedules a `setTimeout` reset after 1500ms; clipboard failures are silently swallowed. While copied, button text changes to `"copied"` and color shifts to `#4ade80` (green) for transient feedback. No new shared component, no dependency, no backend changes.

### Key files modified

| File | Changes |
|------|---------|
| `apps/web/src/app/(app)/workflows/[id]/history/[runId]/page.tsx` | `copiedRunId` state + copy button after `run.id` `<code>` element |

---

**Next recommended task:** Carry the same copy-ID affordance to the run list rows on the history page — a small inline `copy` action next to the truncated `<code>{run.id.slice(0,8)}</code>` in each row so users can grab full IDs from the list view without navigating into the detail page.

---

## Session Summary — Timeline Summary Footer Added to NodeTimeline (2026-03-17)

### `app/(app)/workflows/[id]/history/[runId]/page.tsx`
Extended `NodeTimeline` with a footer row separated by a subtle top border. Shows two muted key-value stats: **Wall-clock span** (`msToLabel(spanEnd − spanStart)`) and **Peak concurrent nodes** (computed via a sweep-line over `[start, +1]` / `[end, -1]` events sorted by time, ties broken by processing end events before start events so exact-boundary simultaneity is not counted as overlap). Both values use the same secondary text color already used for run metadata. Footer is part of the existing component — it only renders when `rows.length > 0`, inheriting the section's self-hide behavior. No new state, no new components, no new data fetching.

### Key files modified

| File | Changes |
|------|---------|
| `apps/web/src/app/(app)/workflows/[id]/history/[runId]/page.tsx` | `peakConcurrency` sweep-line computation + footer `<div>` inside `NodeTimeline` |

---

**Next recommended task:** Add a "copy run ID" micro-action to the run detail breadcrumb/header — a small button next to the `<code>{runId}</code>` element that copies the full run ID to the clipboard, useful for debugging and referencing runs in external tools.

---

## Session Summary — Node Execution Timeline on Run Detail Page (2026-03-17)

### `app/(app)/workflows/[id]/history/[runId]/page.tsx`
Added `NodeTimeline` component placed between `NodeCostBreakdown` and the Nodes section. Builds `TimedRow[]` from `nodeExecutions` by parsing `startedAt`/`completedAt` to ms, filtering out zero-duration rows, and sorting by start time ascending so the visual reflects actual execution order. Timeline span is computed as `min(startedAt)` → `max(completedAt)` across all included nodes; bars are positioned with CSS percentage `left`/`width` on a relative track. A `MIN_BAR_PCT = 0.5` floor prevents sub-millisecond nodes from vanishing. Bar color is `#a78bfa` (purple) to match the existing duration convention. Duration label reuses the `msToLabel` helper added in the previous session. Section hides entirely when no valid timing data exists. Typecheck clean.

### Key files modified

| File | Changes |
|------|---------|
| `apps/web/src/app/(app)/workflows/[id]/history/[runId]/page.tsx` | `NodeTimeline` component + `TimedRow` local type + JSX insertion before Nodes section |

---

**Next recommended task:** Add a total-span summary line at the bottom of the timeline showing wall-clock elapsed time from first node start to last node end, with a note on how many nodes ran in parallel (overlap count), so users can see parallelism at a glance without reading individual bars.

---

## Session Summary — Duration Mode Added to NodeCostBreakdown (2026-03-17)

### `app/(app)/workflows/[id]/history/[runId]/page.tsx`
Extended `NodeCostBreakdown` with a `BreakdownViewMode` toggle (`"cost"` | `"duration"`) and renamed `CostSortMode` → `BreakdownSortMode` (`"desc"` | `"asc"` | `"alpha"`). Added a `msToLabel` module-level helper (consistent with existing `durationLabel` style: ms / s / m+s). Duration rows are derived from `startedAt`/`completedAt` timestamps on `nodeExecutions`, filtered to positive values. The section hides only when both cost and duration rows are empty; if duration mode is selected with no timing data, an inline empty-state message is shown. Bar color switches to `#a78bfa` (purple) in duration mode to match the history page sparkline convention. Sort controls are shared across both modes. Typecheck clean.

### Key files modified

| File | Changes |
|------|---------|
| `apps/web/src/app/(app)/workflows/[id]/history/[runId]/page.tsx` | `BreakdownViewMode`, `BreakdownSortMode`, `msToLabel`, full `NodeCostBreakdown` rewrite with dual-mode rendering |

---

**Next recommended task:** Add a "fastest path" annotation to the duration breakdown — highlight which sequence of nodes formed the critical path (longest chain of sequential durations) so users can identify where parallelism could help.

---

## Session Summary — Re-run Button on Run Detail Page (2026-03-17)

### `app/(app)/workflows/[id]/history/[runId]/page.tsx`
Added `rerunning` and `rerunError` state alongside a `handleRerun` async function that mirrors the identical pattern from the history list page: POST to `/api/workflows/:id/runs`, navigate to `/workflows/:id/history` on success, set error text on failure. The "Re-run" button is inserted as the first action in the existing run header actions row (visible for `completed` and `partial_failure` runs), uses the same `fontSize 12 / fontWeight 600 / padding 6px 14px / borderRadius 6` style as the Export Bundle button, and is disabled while in-flight with text changing to "Re-running…". Error text renders inline using the same `var(--color-error)` pattern as the bundle error. No new endpoints, no new components, no schema changes.

### Key files modified

| File | Changes |
|------|---------|
| `apps/web/src/app/(app)/workflows/[id]/history/[runId]/page.tsx` | `rerunning`/`rerunError` state, `handleRerun` function, Re-run button + error span in run header actions |

---

**Next recommended task:** Surface node-level duration data in the Cost Breakdown panel — add a second toggle mode (or a secondary column) to switch between cost view and duration view, reusing the already-loaded `startedAt`/`completedAt` timestamps from `nodeExecutions`.

---

## Session Summary — Per-Node Cost Breakdown on Run Detail Page (2026-03-17)

### `app/(app)/workflows/[id]/history/[runId]/page.tsx`
Added a `NodeCostBreakdown` component rendered right before the Nodes section on the run detail page. It filters `nodeExecutions` to rows with a positive `cost`, resolves labels via `nodeLabels`, and computes each node's percentage share of `totalCost` (falling back to the sum of node costs if `totalCost` is null/zero). Renders a compact grid: label (truncated with title), a proportional blue bar relative to the max node cost, cost formatted to 4 decimal places, and rounded percentage. Three inline sort buttons (High→Low default, Low→High, A–Z) toggle a `CostSortMode` state. The section is omitted entirely when no nodes have cost data. Typecheck clean.

### Key files modified

| File | Changes |
|------|---------|
| `apps/web/src/app/(app)/workflows/[id]/history/[runId]/page.tsx` | `NodeCostBreakdown` component + `CostSortMode` type + JSX insertion before Nodes section |

---

**Next recommended task:** Add a run re-trigger shortcut directly from the run detail page — a "Re-run" button in the run header actions area that posts to `/api/workflows/:id/runs` and navigates back to the editor or history page on success.

---

## Session Summary — Workflow Insights Panel on History Page (2026-03-17)

### `app/(app)/workflows/[id]/history/page.tsx`
Added a `WorkflowInsights` component that renders a compact key-value row of performance signals directly below the stats summary row. Metrics computed entirely client-side from already-loaded data: total runs, success rate (rounds to whole %, counts `completed`/`success`), average cost (skips nulls/zeros), average duration in ms or seconds (1 decimal), most recent run status, checkpoint count, and (conditionally) fragment count. Each stat is a two-line label/value column in a `flexWrap` row with `gap: "8px 28px"`. Component bails early when `runs.length === 0`. Typecheck clean.

### Key files modified

| File | Changes |
|------|---------|
| `apps/web/src/app/(app)/workflows/[id]/history/page.tsx` | `WorkflowInsights` component + insertion in JSX between stats row and filter input |

---

**Next recommended task:** Add a per-node cost breakdown panel on the run detail page — show each node's contribution to `totalCost` as a sortable list so users can identify expensive nodes within a single run.

---

## Session Summary — Run Duration Sparkline on History Page (2026-03-17)

### `app/(app)/workflows/[id]/history/page.tsx`
Added `DurationSparkline({ runs })` as a second module-level sparkline component alongside `CostSparkline`. It reverses `runs` to oldest-first, derives durations as `completedAt - startedAt` (ms), filters out zeros, and bails if fewer than 2 points. Same 120×32 SVG normalisation as `CostSparkline` but uses `stroke="#a78bfa"` (purple) to visually distinguish from cost (blue `#60a5fa`). Updated the stats row right-side div to contain both sparklines side-by-side: `Duration trend` + `<DurationSparkline>` then `Cost trend` + `<CostSparkline>`, separated by `gap: 16` in the outer wrapper.

### Key files modified

| File | Changes |
|------|---------|
| `apps/web/src/app/(app)/workflows/[id]/history/page.tsx` | `DurationSparkline` component, stats row wired with both sparklines |

---

**Next recommended task:** Workflow run comparison — when two runs are selected for compare, show a side-by-side diff of their node outputs (cost, duration, artifact thumbnails) in a drawer or inline panel.

---

Previous session (Fragment Browser Keyboard Navigation):

### `components/fragments/FragmentBrowser.tsx`
`focusedIdx`, `rowRefs`, `handleKeyDown`, focused-row highlight, hint bar — see prior entry for full detail.

---

Previous session:
Date: 2026-03-17
Session: Node Preset Rename + Delete Management ✅ SHIPPED

---

## Session Summary — Node Preset Rename + Delete Management (2026-03-17)

### 1. `app/api/node-presets/[id]/route.ts` (new)
Mirrors the fragment id route: `PATCH` accepts `{ name }`, validates, trims, updates via drizzle `eq`, returns `{ id, name }` or 404. `DELETE` hard-deletes and returns 204 or 404.

### 2. `InspectorPanel` `PresetBar` — rename + confirm-delete
Added `renamingId / renameValue / renameSavingId / confirmingDeleteId / deletingId` state and a `renameInputRef`. The preset chips now render a four-mode state machine per preset: normal (name click-to-rename + `×` confirm-delete), renaming (inline input + ✓/✕, autofocused), confirming-delete (`name? Yes No`), deleting (`…`). `handleRenameCommit` calls `PATCH /api/node-presets/[id]`; `handleDeleteConfirm` calls `DELETE /api/node-presets/[id]`. The `<select>` apply mechanism is untouched.

### 3. Library page — Presets section
New `PresetRow` interface. Added `presets` state + fetch to the existing parallel `useEffect`. Preset mutation state follows the same naming convention as fragment state (`presetRenamingId`, etc.) and same `useCallback` + `useRef` autofocus pattern. Presets section renders before Templates, showing nodeType as an inline `<code>` badge.

### Key files modified/created

| File | Changes |
|------|---------|
| `apps/web/src/app/api/node-presets/[id]/route.ts` | **New** — PATCH rename + DELETE hard-delete |
| `apps/web/src/components/inspector/InspectorPanel.tsx` | PresetBar: rename + confirm-delete state machine |
| `apps/web/src/app/(app)/workflows/[id]/library/page.tsx` | Presets section with inline rename + delete |

---

**Next recommended task:** Add keyboard navigation to the Fragment Browser — `↑/↓` to move focus between rows, `Enter` to insert the focused fragment, `r` to start rename, `Delete`/`Backspace` to trigger confirm-delete, and `Escape` to cancel any active mutation or close the browser. This makes the browser keyboard-complete without changing its visual design.

---

Previous session:
Date: 2026-03-17
Session: Fragment Rename + Delete Management ✅ SHIPPED

---

## Session Summary — Fragment Rename + Delete Management (2026-03-17)

### 1. `app/api/fragments/[id]/route.ts` (new)
`PATCH` handler accepts `{ name }`, validates and trims, updates via drizzle `eq` where-clause, returns `{ id, name }` or 404. `DELETE` handler hard-deletes and returns 204 or 404.

### 3. Library page fragment rows — inline rename + delete
Same four-mode pattern as FragmentBrowser, with page-level state (`fragRenamingId`, etc.) and `useCallback` handlers. `fragRenameInputRef` auto-focuses via `useEffect`. Insert Link is untouched; Rename and Delete appear only in normal mode.

### Key files modified/created

| File | Changes |
|------|---------|
| `apps/web/src/app/api/fragments/[id]/route.ts` | **New** — PATCH rename + DELETE hard-delete |
| `apps/web/src/components/fragments/FragmentBrowser.tsx` | Inline rename + delete with 4-mode state machine |
| `apps/web/src/app/(app)/workflows/[id]/library/page.tsx` | Fragment rows: inline rename + delete, same pattern |

---

Previous session:
Date: 2026-03-15
Session: Workflow Library + Fragment Browser ✅ SHIPPED

---

## Session Summary — Workflow Library + Fragment Browser (2026-03-15)

### 1. FragmentBrowser component (`components/fragments/FragmentBrowser.tsx`)
Modal dialog that fetches `/api/fragments`, renders a scrollable list of fragment rows (name, node count, relative time), and calls the `onInsert(graph)` prop + closes when the user clicks Insert on any row.

### 2. WorkflowCanvas — Insert Fragment → FragmentBrowser
Removed the old V1 "insert most-recent" behavior. "Insert Fragment" button now opens the new `FragmentBrowser` dialog. Added `handleInsertFragmentGraph` callback that calls `insertFragment(graph, 120, 120)`.

### 3. WorkflowCanvas — `?insertFragment=<id>` URL param
`CanvasInner` accepts `initialFragmentId` prop. A `useEffect` fires once on mount: fetches `/api/fragments`, finds the matching fragment by id, inserts it, then cleans the URL with `router.replace(pathname)`. This enables the Library page to deep-link Insert actions into the editor.

### 4. WorkflowCanvas — Library nav link
Added "Library" link alongside "Run History" in the top toolbar: `/workflows/{id}/library`.

### 5. Library page (`app/(app)/workflows/[id]/library/page.tsx`)
New `/workflows/[id]/library` route with four stacked sections:
- **Fragments**: lists all saved fragments; Insert navigates to `?insertFragment=<id>`
- **Revision Checkpoints**: lists revisions with node/edge counts; Restore POSTs to `/revisions/{id}/restore` then navigates to editor
- **Artifacts**: lists completed runs (status dot, cost, age); "View Artifacts" links to run detail page
- **Templates**: lists user-saved templates; "Open" links to the template workflow

All data fetched in parallel on mount. Consistent row/card layout matching the history page visual language.

### Key files modified/created

| File | Changes |
|------|---------|
| `apps/web/src/components/fragments/FragmentBrowser.tsx` | **New** — fragment picker modal |
| `apps/web/src/app/(app)/workflows/[id]/library/page.tsx` | **New** — Library page with 4 sections |
| `apps/web/src/components/canvas/WorkflowCanvas.tsx` | FragmentBrowser integration, Library nav link, `?insertFragment` param |

---

Previous session:
Date: 2026-03-15
Session: Revision + Run Comparison, List Filters/Sort, Editor Checkpoint Count — 6 incremental features shipped ✅ SHIPPED

---

## Session Summary — 6 Features Shipped (2026-03-15)

### 1. revisionCount in single-workflow API
`GET /api/workflows/[id]` now includes `revisionCount` via a single `COUNT(*)` query on `workflowRevisions`. No N+1.

### 2. Checkpoint count in editor toolbar
`WorkflowMeta` gained `revisionCount: number`. The editor page threads it from the fetch response; `WorkflowCanvas` renders `"N checkpoint(s)"` as muted toolbar text when `revisionCount > 0`. The inline template-load fallback in `applyTemplate` was updated to include `revisionCount: 0`. Test fixture updated accordingly.

### 3. Workflow list filters — Has Checkpoints, Artifact-Derived
Two new boolean filter states (`hasCheckpointsFilter`, `hasProvenanceFilter`) on the `/workflows` page. Each gets a toggle button in the existing filter bar and a "Show All" clear chip. Filter predicates compose additively with search, tag, and pinned filters.

### 4. Sort by Most Checkpoints
`sortBy` type extended to `"updated" | "lastRun" | "name" | "checkpoints"`. Sort logic: `(b.revisionCount ?? 0) - (a.revisionCount ?? 0)`. Option added to the existing sort `<select>`.

### 5. Revision comparison summary
`parseGraphStats` in `/api/workflows/[id]/revisions/route.ts` now includes `nodeIds: string[]`. `RevisionGraphStats` + `RevisionDiff` types + `diffRevisions()` helper added to the history page. UI: "Compare…" header button, "A / B / Compare" per-row toggle, compact diff panel showing node/edge delta badges and added/removed node counts.

### 6. Run comparison with side-by-side artifact preview
History page gains `compareRunA/B` state. When both are selected, fetches `/runs/[runId]/outputs` for each, extracts first image artifact via `extractImageRefs`, renders with `ArtifactPreviewPanel` (`highlighted={false}`, labelled "Run A" / "Run B"). Metadata side-by-side (status, time, cost, provenance count) shown above previews. Runs lacking artifacts show a "No artifacts" placeholder. Each run row gets a "Compare / A / B" toggle button.

### Key files modified

| File | Changes |
|------|---------|
| `apps/web/src/app/api/workflows/[id]/route.ts` | Add `revisionCount` via `COUNT(*)` |
| `apps/web/src/app/api/workflows/[id]/revisions/route.ts` | Extend `parseGraphStats` with `nodeIds` |
| `apps/web/src/stores/workflowStore.ts` | Add `revisionCount` to `WorkflowMeta` |
| `apps/web/src/stores/workflowStore.test.ts` | Update test fixture |
| `apps/web/src/app/(app)/workflows/[id]/page.tsx` | Thread `revisionCount` into meta |
| `apps/web/src/components/canvas/WorkflowCanvas.tsx` | Render checkpoint count in toolbar |
| `apps/web/src/app/(app)/workflows/page.tsx` | New filters + sort option |
| `apps/web/src/app/(app)/workflows/[id]/history/page.tsx` | Revision diff UI + run compare panel |

---

Session: Revision Count on Workflow Cards — checkpoint count surfaced on list page via grouped SQL query ✅ SHIPPED

---

## Revision Count on Workflow Cards — Shipped (2026-03-15)

`GET /api/workflows` now includes `revisionCount: number` for each workflow. A single grouped `COUNT(*)` query on `workflow_revisions` is executed after the main workflow fetch and merged via a `Map<workflowId, count>` — no N+1. Workflows with no revisions get `revisionCount: 0`.

The workflow card renders `"N checkpoint(s)"` in muted `11px` text below the artifact-derived badge when `revisionCount > 0`, using the same `var(--color-text-muted)` style as other card metadata. The `Workflow` interface gained `revisionCount: number`.

| File | Change |
|------|--------|
| `apps/web/src/app/api/workflows/route.ts` | Grouped `COUNT(*)` query on `workflowRevisions`, merged into response as `revisionCount` |
| `apps/web/src/app/(app)/workflows/page.tsx` | Add `revisionCount: number` to `Workflow` interface; render count badge in card |

---

Session: Revision Count Badge in History Navigation — checkpoint count in run summary line ✅ SHIPPED

---

## Revision Count Badge in History Navigation — Shipped (2026-03-15)

Extended the run summary metadata line on `history/page.tsx` to append `· N checkpoint(s)` when revisions exist. Uses the already-fetched `revisions` state so no new API call is needed. The count stays hidden while revisions are still loading and disappears when there are zero checkpoints. Deletions update it automatically via the existing optimistic `setRevisions` filter.

| File | Change |
|------|--------|
| `apps/web/src/app/(app)/workflows/[id]/history/page.tsx` | Append `· N checkpoint(s)` to run summary line when `revisions.length > 0` |

---

Session: Revision Checkpoint Deletion — hard-delete with inline confirmation on history page ✅ SHIPPED

---

## Revision Checkpoint Deletion (V1) — Shipped (2026-03-15)

Completes the checkpoint lifecycle (create → list → restore → delete).

### API

`DELETE /api/workflows/[id]/revisions/[revisionId]` (`apps/web/src/app/api/workflows/[id]/revisions/[revisionId]/route.ts`)
- Verifies revision exists and belongs to the route's `workflowId` via `AND` where clause
- Hard deletes the row with `db.delete(schema.workflowRevisions).where(...)`
- Returns `{ success: true }` on success, `404` if not found

### History page UI

Each revision row now has a **Delete** button alongside Restore. Click flow:
1. "Delete" → row enters confirm state (`confirmingDeleteId === rev.id`): shows `"Delete? · Yes · Cancel"` inline
2. "Yes" → fires `DELETE` request, then **optimistically removes the row** from local `revisions` state (no refetch needed)
3. "Cancel" → clears `confirmingDeleteId`, row returns to normal
4. Both Restore and Delete buttons disable while the other action is in-flight (`restoringId` / `deletingId` guards)

### Key files created/modified

| File | Change |
|------|--------|
| `apps/web/src/app/api/workflows/[id]/revisions/[revisionId]/route.ts` | New `DELETE` handler |
| `apps/web/src/app/(app)/workflows/[id]/history/page.tsx` | `confirmingDeleteId`, `deletingId` state; `handleDeleteConfirm` callback; inline confirm UI in revision rows |

---

Session: Save Revision Checkpoints — named graph snapshots from toolbar, restorable from history page ✅ SHIPPED

---

## Save Revision Checkpoints (V1) — Shipped (2026-03-15)

Lightweight named graph checkpoints distinct from run history. Users save checkpoints from the canvas toolbar and restore them from the history page.

### Schema

New `workflow_revisions` table (`packages/db/src/schema.ts` + migration `0004_workflow_revisions.sql`):
- `id`, `workflowId` (FK → `workflows.id`), `label` (nullable), `graphSnapshot` (JSON text), `createdAt`
- Index on `workflow_id` for fast listing per workflow

### API

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/workflows/[id]/revisions` | GET | List revisions newest-first; returns `graphStats` (node/edge counts) derived server-side |
| `/api/workflows/[id]/revisions` | POST | Create checkpoint; accepts `{ label?, graph }`. Auto-generates label (`"Checkpoint Mar 15, 2026, 3:15 AM"`) when label is blank. Caller sends live graph snapshot so unsaved edits are captured. |
| `/api/workflows/[id]/revisions/[revisionId]/restore` | POST | Replaces `workflows.graph` with `revision.graphSnapshot`; redirected to editor by UI |

### Canvas toolbar

`WorkflowCanvas.tsx` — new **"Save Revision"** button between "Save as Template" and "Export". Opens `SaveRevisionDialog` (local state, no store changes). Dialog accepts optional label; submits current `getWorkflowGraph()` snapshot + label to POST revisions.

### History page

`history/page.tsx` gains a **"Revision Checkpoints"** section above the runs list. Fetches `GET /api/workflows/[id]/revisions`; shows label, short ID, node/edge badge, created timestamp, and a **Restore** action. On restore success, redirects to the editor.

### Key files created/modified

| File | Change |
|------|--------|
| `packages/db/src/schema.ts` | Add `workflowRevisions` table |
| `packages/db/src/migrations/0004_workflow_revisions.sql` | New migration |
| `packages/db/src/migrations/meta/_journal.json` | Add journal entry |
| `apps/web/src/app/api/workflows/[id]/revisions/route.ts` | GET + POST handlers |
| `apps/web/src/app/api/workflows/[id]/revisions/[revisionId]/restore/route.ts` | POST restore handler |
| `apps/web/src/components/canvas/SaveRevisionDialog.tsx` | New dialog component |
| `apps/web/src/components/canvas/WorkflowCanvas.tsx` | Import dialog, add state + button |
| `apps/web/src/components/canvas/index.ts` | Export `SaveRevisionDialog` |
| `apps/web/src/app/(app)/workflows/[id]/history/page.tsx` | Add `RevisionRecord` type, fetch + render revisions panel |

---

Session: Phase 1 productization — workflow version history, template UX, artifact pipeline expansion ✅ SHIPPED

---

## Phase 1 Productization — Shipped (2026-03-15)

Three cohesive V1 slices shipped together: workflow run-based version history, template metadata UX, and artifact-origin traceability across all surfaces.

### A. Workflow Version History (V1)

`GET /api/workflows/[id]/runs` now returns a `graphStats` field for each run, computed server-side from the stored `graphSnapshot` without sending the full graph payload:
```typescript
graphStats: { nodeCount, edgeCount, provenanceNodeCount, nodeTypes }
```

The run history list page (`history/page.tsx`) renders:
- **Snapshot badge**: `"N nodes · M edges"` per run card — shows the graph state at time of that run
- **Graph evolution diff**: compares `graphStats.nodeCount` between adjacent runs; shows `"+N nodes"` (green) or `"-N nodes"` (red) when the graph changed between runs
- **Artifact-derived badge**: purple `"artifact-derived"` pill when `provenanceNodeCount > 0`, surfacing which runs were triggered from artifact-inserted pipelines

### B. Template Metadata UX

`GET /api/templates` now returns `tags: string[]` and `updatedAt: string` alongside existing fields. `POST /api/templates` accepts and persists a `tags: string[]` field.

`SaveAsTemplateDialog` gains a **Tags** input field (comma-separated, lowercased before save). This completes the template save form: name + description + tags.

`TemplatePicker` extended:
- `DbTemplateRow` interface now includes `tags` and `updatedAt`
- `dbMetaRef` (stable `useRef<Map<string, DbTemplateMeta>>`) stores per-template metadata alongside the synthetic pack, populated before `setImportCount` triggers re-render
- `EnrichedTemplate` gains optional `dbMeta?: { tags, updatedAt }`
- `TemplateCard` prefers `dbMeta.tags` over pack-level tags for user templates; shows `"Updated N ago"` relative timestamp when `dbMeta.updatedAt` is present

### C. Artifact Pipeline Expansion

`GET /api/workflows` scans each workflow's `graph` JSON for nodes with `data.params.__provenance != null` and returns `hasProvenanceNodes: boolean` as a derived field (graph JSON not included in response).

Workflow list page (`workflows/page.tsx`) shows a purple **`artifact-derived`** badge with a link-chain SVG icon on any workflow card where `hasProvenanceNodes === true`. Badge appears between the tags row and the LastRunIndicator.

### Key files modified

| File | Change |
|------|--------|
| `apps/web/src/app/api/workflows/[id]/runs/route.ts` | Add `parseGraphStats()`, include `graphStats` in GET response |
| `apps/web/src/app/api/templates/route.ts` | Add `tags`/`updatedAt` to GET; accept `tags` in POST |
| `apps/web/src/app/api/workflows/route.ts` | Add `graphHasProvenanceNodes()`, `hasProvenanceNodes` in GET |
| `apps/web/src/components/canvas/SaveAsTemplateDialog.tsx` | Add tags input field |
| `apps/web/src/components/canvas/TemplatePicker.tsx` | `dbMetaRef`, `EnrichedTemplate.dbMeta`, updatedAt + tags in card |
| `apps/web/src/app/(app)/workflows/[id]/history/page.tsx` | `GraphStats` type, snapshot badge, diff indicator, provenance badge |
| `apps/web/src/app/(app)/workflows/page.tsx` | `hasProvenanceNodes` field, artifact-derived badge in card |

---

## Artifact Provenance Badge (Inspector) — Shipped (2026-03-15)

`InspectorPanel` config tab now renders a `ProvenanceBadge` for Image Input nodes inserted via the Artifact → Canvas pipeline. Reads `node.data.params.__provenance.runId` and links to `/workflows/<workflowId>/history/<runId>`.

---

## Artifact → Canvas Pipeline — Shipped (2026-03-15)

---

## Branch Protection — Confirmed Active (2026-03-15)

`ci`, `a11y`, and `e2e` jobs are now required status checks on `master` with "Require branches to be up to date before merging" enabled. Documented in `docs/LOCAL_DEV.md`.

---

## Artifact → Canvas Pipeline — Shipped (2026-03-15)

Each artifact thumbnail in the run-history grouped export grid now shows a **"Use in Canvas"** button below the image. Clicking it navigates to `/workflows/[workflowId]?insertArtifact=<encodedPath>`, opening the workflow editor for the same workflow that produced the run.

`WorkflowCanvas` reads `?insertArtifact` from `useSearchParams`, passes it as `initialArtifactPath` to `CanvasInner`. `CanvasInner` runs a one-shot `useEffect` (guarded by `insertedRef` to prevent React StrictMode double-fire) that:
1. Calls `initializeNodeRegistry()` (idempotent)
2. Fetches the `"image-input"` definition from `nodeRegistry`
3. Calls `createWorkflowNode(def, screenToFlowPosition(viewportCenter))` — same path as the node palette
4. Sets `node.data.params.source` to the `/api/artifacts?path=…` proxy URL
5. Calls `addNode(node)` — standard store action, marks the workflow dirty
6. Calls `router.replace(pathname)` to strip `?insertArtifact` from the URL

The node behaves identically to a manually placed Image Input node: it can be connected, saved, replayed, and run. Bundle export API, `selectedPaths`, and `ArtifactPreviewPanel` are untouched.

### Key files

| File | Change |
|------|--------|
| `apps/web/src/app/(app)/workflows/[id]/history/[runId]/page.tsx` | "Use in Canvas" button on each thumbnail |
| `apps/web/src/components/canvas/WorkflowCanvas.tsx` | `initialArtifactPath` prop threading + insertion `useEffect` in `CanvasInner`; imports for `useRouter`, `usePathname`, `useSearchParams`, `nodeRegistry`, `initializeNodeRegistry`, `createWorkflowNode` |

---

## Document Required Branch Protection Checks ✅ SHIPPED

---

## Branch Protection Documentation — Shipped (2026-03-15)

**File:** `docs/LOCAL_DEV.md`

Added a "CI & Branch Protection" section at the end of the contributor setup doc. Lists the three CI jobs (`ci`, `a11y`, `e2e`) with their purpose and trigger, then gives a numbered checklist for configuring required status checks on `master` in GitHub repository settings. Notes that "Allow bypassing required pull request checks" must not be enabled. Branch protection cannot be automated from the repo itself, so the doc is the correct place to record it. No application code was changed.

---

## Wire Accessibility Test Suite into CI ✅ SHIPPED

---

## Accessibility Tests Wired into CI — Shipped (2026-03-15)

**File:** `.github/workflows/ci.yml`

Added an `a11y` CI job (lines 53–105) that mirrors the existing `e2e` job structure exactly: `needs: ci`, Node 22, pnpm + store cache, Playwright browser cache keyed on `pnpm-lock.yaml`, conditional `install --with-deps` vs `install-deps` for cache hits, and a failure artifact upload to `a11y-results/` with 7-day retention. The test command is `pnpm --filter @aistudio/web test:a11y:browser` which runs all 14 fixture-based Playwright tests including the axe-core WCAG scan. The `a11y` and `e2e` jobs run in parallel after `ci` passes, sharing the same Playwright browser cache key. Any WCAG violation or fixture regression will now fail the PR check.

---

## Fix Loading-State Contrast on Import Label ✅ SHIPPED

---

## Fix Loading-State Contrast on Import Label — Shipped (2026-03-15)

**File:** `apps/web/src/app/(app)/workflows/page.tsx` (~line 807)

Removed `opacity: importing ? 0.6 : 1` from the Import `<label>` element. The element wraps a hidden `<input type="file" disabled={importing}>` — the `disabled` attribute on the input already blocks interaction during the loading state. `--color-text-secondary` (`#a0a0a0`) at full opacity achieves ~8:1 contrast, well above WCAG AA; the opacity was the only offender. The loading state remains clearly communicated by the text change to "Importing…" and `cursor: "default"`. All 14 a11y tests continue to pass with zero violations.

---

## Opacity Contrast Audit — Run History and Workflow UI ✅ SHIPPED

---

## Opacity Contrast Audit — Shipped (2026-03-15)

Audited all `opacity` usages in the run history page and nearby workflow UI.

| Location | Element | Verdict |
|---|---|---|
| `[runId]/page.tsx:511,528` | Disabled group All/Clear buttons at `opacity:0.35` | ✅ Safe — WCAG 1.4.3 exempts inactive UI components |
| `[runId]/page.tsx:556` | Active thumbnail button container at `opacity:0.4` | ❌ Fixed — opacity moved to `<img>` only |
| `workflows/page.tsx:721` | `📄` emoji at `opacity:0.7` | ✅ Safe — decorative graphic, not text |
| `workflows/page.tsx:807` | "Importing…" button at `opacity:0.6` | ✅ Out of scope — brief user-triggered loading state |
| `workflows/page.tsx:1643` | Starter template `desc` at `opacity:0.75` | ✅ Safe — inherited `#a0a0a0` × 0.75 ≈ 4.6:1, passes |
| `workflows/page.tsx:1717` | Template action buttons (✎ ×) container at `opacity:0.6` | ❌ Fixed — opacity removed |

**Fixes applied:**
- `[runId]/page.tsx`: Moved `opacity: isPathSelected ? 1 : 0.4` from the thumbnail button container to the `<img>` element — visual deselected signal preserved on the image, text label now at full contrast.
- `workflows/page.tsx`: Removed `opacity: 0.6` from the template rename/delete button container — buttons use `--color-text-muted` (#828282) which already meets contrast at full opacity.

All 14 a11y tests continue to pass with zero violations.

---

## Fix PortLabel Note Span Contrast Violation ✅ SHIPPED

---

## PortLabel Note Span Contrast Fix — Shipped (2026-03-15)

**File:** `apps/web/src/app/(app)/workflows/[id]/history/[runId]/page.tsx:836`

Removed `opacity: 0.6` from the `PortLabel` note `<span>`. The effective color with opacity was `#525252` (~2.6:1 contrast on dark backgrounds), below the WCAG AA minimum of 4.5:1. The base `--color-text-muted` (#828282) at full opacity achieves ~5.5:1. This was the last known `opacity`-based contrast violation in the run history page. All 14 a11y tests continue to pass with zero violations.

---

## Accessibility Regression Check — Shipped (2026-03-15)

---

## Accessibility Regression Check — Shipped (2026-03-15)

**All 14 tests pass. Both fixtures clean at 0 axe violations.**

**Violations found and fixed:**

1. **Contrast — group count span** (`page.tsx:495`): `opacity: 0.6` on `#828282` yields effective `#525252` (2.6:1) — below the 4.5:1 WCAG AA minimum. Fix: removed `opacity: 0.6`; the base `--color-text-muted` (#828282) at full opacity achieves 5.5:1 on the dark background.

2. **Fixture color drift** (`artifact-group-selection.html`): CSS variables used `#737373` (contrast 4.17:1) and `#141414` instead of the actual production values `#828282` and `#1a1a1a`. Fix: aligned to `globals.css` values and removed `opacity: 0.6` from `.group-count`.

3. **Fixture structure** (`artifact-group-selection.html`): Missing `<main>` landmark, `<h1>`, and content-in-landmark structure (axe rules `landmark-one-main`, `page-has-heading-one`, `region`). Fix: wrapped body content in `<main>` and added a visible `<h1>`.

4. **Decorative text** (`artifact-group-selection.html`): Thumbnail placeholder labels (`A1`, `A2` etc.) were being scanned for contrast. Fix: added `aria-hidden="true"` since accessibility is carried by the adjacent checkbox `aria-label`.

5. **Exact match guard** (`artifact-group-selection.pw.ts`): Playwright `getByRole` substring match resolved "Select all artifacts" to two buttons. Fix: `exact: true` on global-control lookups.

The `PortLabel` note span at `page.tsx:836` also carries `opacity: 0.6` on muted text, which has the same contrast issue — noted as a pre-existing violation outside the current feature scope.

---

## Keyboard-Accessible Group Bulk Selection Controls — Shipped (2026-03-15)

**Files:**
- `apps/web/src/app/(app)/workflows/[id]/history/[runId]/page.tsx`
- `apps/web/a11y/fixtures/artifact-group-selection.html`
- `apps/web/a11y/artifact-group-selection.pw.ts`

**Changes to `page.tsx`:**
- Global `All` button: `aria-label="Select all artifacts"` — distinguishes it from per-group controls
- Global `None` button: `aria-label="Deselect all artifacts"`
- Global count `<span>`: `aria-live="polite" aria-atomic="true"` — screen readers announce selection changes
- Per-group `All` button: `aria-label={\`Select all from ${group.nodeLabel}\`}`
- Per-group `Clear` button: `aria-label={\`Clear ${group.nodeLabel} selection\`}`

Native `<button>` semantics already provided Tab reachability, Enter/Space activation, and disabled-state enforcement; the only code change needed was adding `aria-label` and `aria-live`.

**Static fixture** (`a11y/fixtures/artifact-group-selection.html`): Self-contained HTML + vanilla JS reproducing the two-group state machine (null = all selected, Set = explicit selection) with checkboxes, group counts, and all five buttons — mirrors the React component precisely.

**Playwright tests** (`a11y/artifact-group-selection.pw.ts`): 8 tests, all passing, covering aria-label correctness, disabled boundary states, Enter activation of Clear, Enter activation of All, Space activation, global All recovery after group changes, and programmatic focusability.

---

## Per-Node Bulk Selection Controls — Shipped (2026-03-15)

**File:** `apps/web/src/app/(app)/workflows/[id]/history/[runId]/page.tsx`

Each node group header in the multi-artifact export grid now includes:
- A compact `{n}/{total}` count (e.g. `2/4`) showing how many of that group's artifacts are currently selected
- An **All** button that adds all group paths to `selectedPaths`; disabled + dimmed when group is fully selected
- A **Clear** button that removes all group paths from `selectedPaths`; disabled + dimmed when group has nothing selected

Three small helper functions were added inside the component body, after `artifactGroups` is computed:
- `groupSelectedCount(group)` — returns the number of selected paths within a group
- `selectGroupAll(group)` — sets all group artifact paths as selected; no-ops (returns `null`) if globally all-selected
- `clearGroup(group)` — materialises `selectedPaths` from all paths when currently `null`, then removes group paths

These controls are only rendered inside the `showGroupHeaders` guard (i.e. when `artifactGroups.length > 1`), so single-node runs see no change. Global **All** / **None** controls continue to operate on `selectedPaths` directly and are unaffected. Checkbox overlays and file-level selection are preserved exactly.

---

## Edit & Replay — Fully Shipped (2026-03-15)

**Status: complete. Do not reopen as an active task.**

This feature was delivered across four sessions. All layers — implementation, unit tests, E2E tests, and CI — are in place.

### What was built

**Replay cleanup (store fix)**
- `workflowStore.ts:runWorkflow` — `replayRunId` is now cleared atomically with `currentRunId` assignment inside the single `set()` call that fires only after a successful 202 dispatch
- Failure path (`!res.ok`) throws before that `set()`, so `replayRunId` is preserved and the banner stays visible for retry
- `data-testid="replay-banner"` added to `WorkflowCanvas.tsx` for stable selector targeting

**Store unit tests** (`apps/web/src/stores/workflowStore.test.ts`)
- 8 tests using Node native test runner (`node --import tsx --test`)
- Covers: `loadWorkflow` sets/clears `replayRunId`; successful dispatch clears it; failed dispatch preserves it; `setReplayRunId(null)` manual dismiss; `isRunning` always restored
- Zustand singleton state isolation fixed in `beforeEach` via `useWorkflowStore.setState`

**Playwright static fixture tests** (`apps/web/a11y/replay-banner.pw.ts`)
- 4 tests against a static HTML fixture (`a11y/fixtures/replay-banner.html`)
- Covers: banner visible on load; hidden after success; visible after failure; hidden after manual dismiss

**True E2E tests** (`apps/web/e2e/replay-banner.e2e.ts`)
- `playwright.e2e.config.ts`: Next.js on port 3001, isolated `DATA_DIR=/tmp/aistudio-e2e`, no `MASTER_KEY` (activates dev auth bypass)
- `e2e/global-setup.ts`: creates real workflow via live API; inserts historical run directly into SQLite (no engine/Redis side effects); writes seed fixture to `/tmp/aistudio-e2e/e2e-seed.json`
- 3 tests: banner visible on `?replay=` load; disappears after mocked 202; persists after mocked 500
- Run: `pnpm --filter @aistudio/web test:e2e`

**GitHub Actions CI** (`.github/workflows/ci.yml`)
- New `e2e` job with `needs: ci` — runs only after lint/typecheck/unit/build pass
- Reuses Node 22 / pnpm / corepack setup; Playwright browser cache keyed on `pnpm-lock.yaml`
- Installs Chromium only; uploads `apps/web/test-results/` on failure (7-day retention)
- `retries: 1` in CI + `trace: "on-first-retry"` so navigable traces are captured for failures

### Key files

| File | Role |
|------|------|
| `apps/web/src/stores/workflowStore.ts:357` | Core fix — `replayRunId: null` in successful dispatch `set()` |
| `apps/web/src/components/canvas/WorkflowCanvas.tsx` | `data-testid="replay-banner"` on banner wrapper |
| `apps/web/src/stores/workflowStore.test.ts` | Store unit tests (8 cases) |
| `apps/web/a11y/replay-banner.pw.ts` | Static fixture Playwright tests (4 cases) |
| `apps/web/a11y/fixtures/replay-banner.html` | Static HTML fixture for banner lifecycle |
| `apps/web/e2e/replay-banner.e2e.ts` | True E2E tests (3 cases) |
| `apps/web/e2e/global-setup.ts` | Seeds workflow + historical run for E2E |
| `apps/web/e2e/constants.ts` | Shared `E2E_DATA_DIR` / `SEED_FILE` constants |
| `apps/web/playwright.e2e.config.ts` | E2E Playwright config with isolated webServer |
| `.github/workflows/ci.yml` | `e2e` CI job with browser cache + trace artifacts |

---

## ArtifactPreviewPanel — Stable Component API (2026-03-14)

**File:** `apps/web/src/components/prompt/ArtifactPreviewPanel.tsx`

**Purpose:** Focused preview of a single artifact output with metadata and one-click download. Used as a review surface before export (live results) or for inspection of historical outputs (run history). Intentionally context-neutral — the same component serves both surfaces via props.

**`ArtifactPreviewable` interface** (exported — use this, not `ModelRunResult`, as the prop contract):
- `modelId: string` — stable key; drives download-state reset via `useEffect`
- `modelName: string` — display name and fallback filename base
- `outputUrl?: string` — panel renders null when absent
- `filename?: string` — explicit download filename; overrides URL-derived name (use when `ArtifactRef.filename` is available)
- `sizeBytes?: number` — optional; rendered as human-readable file size when present
- `cost?: number`, `durationMs?: number`, `score?: number`, `rank?: number` — optional metadata

**Props:**
- `result: ArtifactPreviewable` — required
- `label?: string` — eyebrow text above model name; default `"Selected for export"` (live results); pass `"Artifact output"` for run history
- `highlighted?: boolean` — accent (`var(--color-accent)`) vs neutral (`var(--color-border)`) panel border; default `true` (live results); pass `false` for history/neutral contexts

**Download behavior:** fetch → blob → object URL → programmatic `<a download>` click. Handles cross-origin CDN URLs and same-origin `/api/artifacts` proxy URLs identically. Three-state model: `idle | downloading | error`. Retry is the same handler.

**Keyboard:** `D` triggers download when panel is visible and `outputUrl` is present. Guard: skips `INPUT / TEXTAREA / contentEditable`. `aria-keyshortcuts="d"`, `aria-label` reflects current download state.

**Extension guidance:** New surfaces (canvas, artifact library, etc.) should pass a compatible `ArtifactPreviewable` and set `label` / `highlighted` appropriately rather than forking or creating variant panels.

---

Date: 2026-03-13
Session: Workflow Card Overflow Menu — Use Template, Grouping, Hover, Keyboard Navigation

---

## 1. Current Focus

Primary Task:
The workflow card overflow menu has been fully refined with new capabilities, interaction polish,
and keyboard accessibility. The workflows list page is the current stable baseline.

Completed (Session 72 — Update SESSION_CONTEXT.md baseline after overflow menu series):
- [x] Appended new section documenting finalized overflow-menu structure and capabilities
- [x] Recorded grouped action layout, visual separators, hover highlight, and keyboard navigation
- [x] Updated header date and session title to reflect 2026-03-13 work

Completed (Session 71 — Keyboard Navigation for Workflow Card Overflow Menu):
- [x] Added `useRef` to React import; declared `menuRef = useRef<HTMLDivElement | null>(null)`
- [x] Added `useEffect` that auto-focuses first enabled menu button when `openMenuId` changes (zero-timeout for post-render)
- [x] Attached `ref={menuRef}` to the menu container `<div>`
- [x] Added `onKeyDown` handler to menu container: ArrowDown/ArrowUp cycle focus through `button:not(:disabled)` with wraparound; Enter clicks the focused button
- [x] Escape already handled by existing document-level listener — no duplication
- [x] Separator `<div>` elements are naturally skipped (querySelectorAll targets buttons only)
- [x] TypeCheck clean

Completed (Session 70 — Hover Highlight for Overflow Menu Buttons):
- [x] Added `onMouseEnter`/`onMouseLeave` to each menu button
- [x] Hover applies `var(--color-surface-hover)` background; guarded by `!disabled` so disabled items receive no highlight
- [x] `onMouseLeave` clears inline background to empty string, restoring `background: "none"` from style prop
- [x] All group separators, click handlers, and danger styling unchanged
- [x] TypeCheck clean

Completed (Session 69 — Group Separators for Overflow Menu):
- [x] Restructured menu from flat array to array-of-groups (four groups)
- [x] Group 1 — Primary edit: Rename, Description, Tags
- [x] Group 2 — Workflow actions: Duplicate, Export
- [x] Group 3 — Template actions: Save as Template, Use Template
- [x] Group 4 — Destructive: Delete
- [x] 1px `var(--color-border)` separator `<div>` with `margin: "4px 0"` rendered between groups via `gi > 0` guard
- [x] Removed per-button `borderBottom` line (replaced by group separators)
- [x] TypeCheck clean

Completed (Session 68 — Add "Use Template" to Workflow Card Overflow Menu):
- [x] Added "Use Template" menu item between "Save as Template" and "Export"
- [x] Action: closes menu, sets `starterKey = "template"`, preselects `templates[0]?.id`, opens create-workflow modal
- [x] Item is disabled when `templates.length === 0` — no confusing dead action
- [x] Reuses all existing template-selection logic in the modal (no new creation flow)
- [x] All previous overflow actions preserved: Rename, Description, Tags, Duplicate, Save as Template, Export, Delete
- [x] TypeCheck clean

---

### Workflows Page — Current Stable Baseline (2026-03-13)

**Overflow menu structure** (`apps/web/src/app/(app)/workflows/page.tsx`):
- Four logical action groups with 1px `var(--color-border)` separators between groups
- Group 1: Rename · Description · Tags
- Group 2: Duplicate · Export
- Group 3: Save as Template · Use Template (disabled when no templates exist)
- Group 4: Delete (danger styling)

**Interaction feedback**:
- Hover applies `var(--color-surface-hover)` background on enabled buttons only
- Disabled items (e.g. Use Template with no templates) receive no hover state

**Accessibility / keyboard**:
- Menu opens → first enabled button auto-focused (zero-timeout useEffect)
- ArrowDown / ArrowUp: cycle focus through enabled buttons with wraparound
- Enter: activates focused item via `.click()`
- Escape: closes menu (document-level keydown listener)
- Separator `<div>` elements are non-focusable and skipped during navigation

---

Completed (Session 67 — committed as `f3fdcce`):
- [x] Identified all /tmp/aistudio-runs usages: runs/route.ts (outputDir) and artifacts/route.ts (ALLOWED_PREFIX)
- [x] Created lib/artifactStorage.ts — exports ARTIFACTS_DIR = path.join(process.cwd(), "data", "artifacts")
  apps/web/data/ is already git-ignored; directory is created on first write by writeArtifact
- [x] Updated runs/route.ts — outputDir and provider executor fallback now use ARTIFACTS_DIR
- [x] Updated artifacts/route.ts — ALLOWED_PREFIXES accepts both ARTIFACTS_DIR (new, durable) and /tmp/aistudio-runs/ (legacy, transient)
- [x] Old /tmp refs still served while the process runs; do not survive restart (same as before, now explicitly documented)
- [x] Limitation: single-machine local storage only; no retention/cleanup policy; no cloud/S3 path

Completed (Session 66 — committed as `35c8c0e`):
- [x] Built GET /api/workflows/:id/runs/:runId — returns run record, nodeExecution rows sorted by startedAt, and nodeId→label map from graphSnapshot
- [x] Built /workflows/:id/history/:runId page — full historical run detail: run header (status, timestamps, duration, cost), node execution cards (status, duration, cost, provider/model, error), and node outputs section
- [x] Outputs rendered using existing /api/outputs DB-fallback endpoint — images inline, image grids for candidate collections, text blocks, primitives, formatted JSON
- [x] ArtifactImage component has onError fallback — shows filename + dimensions when /tmp file is no longer available
- [x] Updated /history list page — added "View" link on each run card
- [x] No coordinator memory dependency — entire page works from DB-persisted data
- [x] Limitation: cancelled nodes have no nodeExecution record; image files at /tmp are transient

Completed (Session 65 — committed as `8bdd8e6`):
- [x] Identified nodeExecutions table existed in schema but was never written to
- [x] Identified FK dependency: runs record must exist before nodeExecutions can be inserted
- [x] Fixed: runs record now inserted at run START (status "running") instead of only at completion
- [x] runs record is updated to final terminal status in existing .then() continuation
- [x] makeDispatch: inserts nodeExecutions row on node completed (with outputs JSON) and on node failed (with error); both wrapped in non-fatal try/catch
- [x] outputs/route.ts: keeps in-memory coordinator as primary read path; adds DB fallback via nodeExecutions.outputs when coordinator no longer holds the run
- [x] Stored format: JSON.stringify(result.outputs) — ArtifactRef, candidate collections, strings, primitives are all JSON-safe
- [x] Limitation: cancelled nodes have no nodeExecutions record (never dispatched); image files at /tmp still needed for rendering after refresh

Completed (Session 64 — committed as `9adfaac`):
- [x] Audited run output data path: debugSnapshot has outputKeys only (no values); /api/outputs returns full values; /api/artifacts?path= serves local image files
- [x] Built RunOutputsPanel component — fetches from outputs endpoint when completedCount increases; renders: ArtifactRef images inline, candidate collections as image grids, strings as text blocks, primitives inline, complex objects as formatted JSON
- [x] Added Nodes/Outputs tab bar to WorkflowCanvas debugger bottom panel
- [x] Outputs ordered by topological execution order from snapshot.executionOrder
- [x] No backend changes needed — /api/outputs and /api/artifacts already existed
- [x] Limitation: outputs are in-memory only (coordinator state); not available after page refresh or after coordinator recycles the run
- [x] Provider failure errors show in Nodes tab via expanded node error block; Outputs tab shows nothing for failed nodes (correct — no output to show)

Completed (Session 63 — committed as `853cc05`):
- [x] Audited the full SSE streaming stack — backend endpoint, hooks, RunDebuggerPanel, WorkflowCanvas integration all fully implemented
- [x] SSE endpoint: GET /api/workflows/:id/runs/:runId/events — sends "snapshot" (RunDebugSnapshot) + "heartbeat" every 15s; closes on terminal status
- [x] useRunEvents hook — subscribes to SSE, writes to workflowStore.debugSnapshot; WorkflowCanvas calls it for live updates
- [x] CustomNode — shows animated status dots (pending/queued/running/completed/failed/cancelled) from debugSnapshot
- [x] RunDebuggerPanel — tier/flat views, expandable node details, error display, blocked-reason badges; auto-opens on run start
- [x] Fixed: stale snapshot flashing on new run start — clear debugSnapshot: null in runWorkflow when setting currentRunId
- [x] Fixed: empty debugger panel when debuggerOpen=true but no snapshot — now shows "Connecting to run…" or "No run yet" placeholder
- [x] Provider failure errors ("Provider X is not configured...") surface via snapshot.nodes[].error in expanded node view — no extra wiring needed

Completed (Session 62 — committed as `96d9f38`):
- [x] Audited provider executor and BestOfN generator resolution for silent mock fallback
- [x] Provider executor (runs/route.ts): throws `Provider "{id}" is not configured. Add your API key in Settings → Providers.` when no DB key and no FAL_API_KEY env var
- [x] BestOfN resolveGenerator: same enforcement when user selects a real provider (provider !== "mock"); mock provider still works without any key
- [x] `resolveProviderKey.ts` (previously untracked) now committed to repo
- [x] Enforcement rule: DB key → FAL_API_KEY env → throw (no silent mock in real-provider paths); BestOfN mock path preserved intentionally
- [x] Web typecheck clean; pre-existing engine integration test TS errors are unchanged (known issue)

Completed (Session 61 — committed as `00e68da`):
- [x] Built POST /api/providers/:id — upserts provider key, encrypts with AES-256-GCM
  salt stored as "${salt}:${ciphertext}" in api_key_encrypted; no migration needed
  validatedAt reset on key change; known provider guard (fal, replicate, google)
- [x] Built DELETE /api/providers/:id — removes provider_configs row
- [x] Built settings/providers/page.tsx — replaces stub with full provider management UI
  configured/not-configured status per provider, green border when configured
  password input + Save; Update Key / Remove actions; docs links; no keys returned to client
- [x] Encryption: AES-256-GCM via @aistudio/crypto encrypt(); PBKDF2 salt embedded in api_key_encrypted

Completed (Session 60 — committed as `711a467`):
- [x] Identified getting-started provider check was hitting /api/health (always 200) — always showed complete
- [x] Confirmed providerConfigs table exists in DB schema with id, apiKeyEncrypted, iv, authTag, validatedAt
- [x] Confirmed no /api/providers route existed yet
- [x] Created GET /api/providers — returns [{id, validatedAt, createdAt}] from providerConfigs, no keys exposed
- [x] Updated getting-started provider check to call /api/providers and test data.length > 0
- [x] /api/health unchanged — still pure liveness/DB-ping

Completed (Session 59 — committed as `83986d4`):
- [x] Audited TemplatePicker — fully real with tabs, search, import, availability dots
- [x] Confirmed existing templates (full-pipeline, score-and-rank) use advanced capability nodes — no beginner entry
- [x] Created templates/packs/image-gen-starter.json — "Prompt to Image" (2-node: prompt-template → image-generation)
- [x] Registered imageGenStarter first in ensurePacksLoaded so it appears at top of Built-in tab
- [x] Template uses only always-available node types (prompt-template local, image-generation requires provider)
- [x] Loading flow, overlay dismiss, and PATCH save verified unchanged

Completed (Session 58 — committed as `64f771b`):
- [x] Converted the "Template" span in the empty-state overlay to a clickable button
- [x] Button calls toggleTemplatePicker (same store action as the top-bar Templates button)
- [x] Outer overlay keeps pointer-events-none; button uses pointer-events-auto (surgical opt-in)
- [x] Canvas interaction is unaffected — clicking outside the button still hits ReactFlow normally
- [x] Overlay still auto-hides on first node added (nodes.length guard unchanged)

Completed (Session 57 — committed as `ecccbd0`):
- [x] Verified editor page loads cleanly for new (empty-graph) workflows via GET /api/workflows/:id
- [x] Verified saveGraph uses PATCH /api/workflows/:id — no duplicate creation possible
- [x] Verified runWorkflow auto-saves via PATCH then POSTs to /runs (not /workflows)
- [x] Identified gap: canvas showed no affordance when empty (just dark grid)
- [x] Added pointer-events-none empty-state overlay in WorkflowCanvas.tsx (nodes.length === 0 guard)
- [x] Overlay auto-hides when first node is added; points users to palette and Templates

Completed (Session 56 — committed as `61242e0`):
- [x] Identified that `handleCreate` in `workflows/page.tsx` was not navigating after creation
- [x] API `POST /api/workflows` already returns `{ id, name }` with 201 — response was unused
- [x] Added `useRouter` import; called `router.push(/workflows/${data.id})` on success
- [x] Added `creating` guard at top of `handleCreate` to prevent duplicate submissions
- [x] Added `createError` state; surfaces API/network failures inline in the modal
- [x] Cleared `createError` on Cancel and backdrop close

Completed (Session 55 — committed as `626a966`, no new commits needed):
- [x] Audited full auth flow to verify `/workflows` is the default landing for authenticated users
- [x] Confirmed `middleware.ts` already redirects `/` → `/workflows` for authenticated users (lines 48–67)
- [x] Confirmed `login/page.tsx` already redirects to `/workflows` on success and when already authenticated
- [x] Confirmed `(app)` route group has no root `page.tsx` — correct by design (no URL segment added by route groups)
- [x] No redirect loops: unauthenticated `/workflows` → `/login`; authenticated `/` → `/workflows`
- [x] No code changes required — feature was already fully implemented

Completed (Session 54 — committed as `626a966`):
- [x] Audited all sidebar nav items against actual route files in `apps/web/src/app/(app)/`
- [x] Confirmed all 7 original routes have real pages (no broken links)
- [x] Removed `/canvas` from primary sidebar — it's a secondary surface, accessed from `/prompt` via "Open Canvas Editor" button
- [x] Promoted `/workflows` to position 2 (primary feature of the app)
- [x] Reordered: Get Started → Workflows → Generate → Prompt → Settings → Usage
- [x] Removed unused `CanvasIcon` SVG component from AppShell.tsx

Previous Task (Primary Task for prior sessions):
Registry-driven node platform — React Flow canvas integration wiring all UI components together.

Completed (Session 1 — committed as `cec4af3`):
- [x] Architecture audit of entire codebase
- [x] Designed target architecture (NodeDefinition, NodeRegistry, etc.)
- [x] Implemented foundation types and registry in packages/shared
- [x] Created built-in node definitions for all existing node types
- [x] Created capability node definitions (CLIP scoring, social format, export, ranking)
- [x] Created model bridge (ModelOption → NodeDefinition converter)
- [x] Created node definition helpers (defaults, validation, ports)
- [x] Updated NodeType enum with new capability types
- [x] Created web app registry initialization module
- [x] Documented architecture plan and migration strategy

Completed (Session 2 — uncommitted):
- [x] Schema-driven inspector: SchemaField, SchemaForm, NodeConfig, InspectorPanel
- [x] Execution graph: DAG builder, topological sort, tier computation, ready node detection
- [x] Run coordinator: state machine, event system, budget caps, parallel branch handling
- [x] Node executor: runtimeKind dispatch via registry, validation hooks
- [x] Worker integration: nodeJobProcessor bridging BullMQ → engine executor
- [x] Updated engine package from stub to full exports
- [x] Updated documentation

Completed (Session 3 — uncommitted):
- [x] Registry-aware NodePalette: groups by NodeCategory, text filter, port/runtime metadata
- [x] createWorkflowNode helper: NodeDefinition → WorkflowNode with correct defaults and ports
- [x] Model catalog entries flow through registry (no parallel data source)
- [x] Updated documentation

Completed (Session 4 — uncommitted):
- [x] Engine debug snapshot: buildDebugSnapshot(), buildGraphPreview(), BlockedReason types
- [x] RunDebuggerPanel: tier/flat views, status filters, per-node expanded detail
- [x] Blocked reason computation: waiting, failed upstream, cancelled, budget, validation
- [x] Added @aistudio/engine dependency to web app
- [x] Updated documentation

Completed (Session 5 — uncommitted):
- [x] Zustand workflow store: nodes, edges, selection, UI panel state, save/load, React Flow callbacks
- [x] React Flow ↔ WorkflowNode adapters (toFlowNode, toFlowEdge, fromFlowNode)
- [x] CustomNode component: color-coded port handles, runtime badge, selection ring
- [x] WorkflowCanvas: ReactFlow + NodePalette + InspectorPanel + RunDebuggerPanel composition
- [x] Workflow editor page wired to fetch workflow from API and render canvas
- [x] Added @xyflow/react and zustand dependencies
- [x] Updated documentation

Completed (Session 6 — uncommitted):
- [x] SSE run updates: RunCoordinator → RunDebuggerPanel via Server-Sent Events
- [x] useRunEvents hook: EventSource consumer with auto-cleanup
- [x] Singleton RunCoordinator accessor for SSE route
- [x] workflowStore: added currentRunId state + setter

Completed (Session 7 — uncommitted):
- [x] Upgraded ClipScoring node definition: array image input, model/normalize/topK params, uiSchema
- [x] Upgraded Ranking node definition: items/scores inputs, topK/threshold/sort modes, uiSchema
- [x] Created CLIP scoring capability executor with mock scoring (packages/engine/src/capabilities/clipScoring.ts)
- [x] Created Ranking capability executor with 3 selection modes (packages/engine/src/capabilities/ranking.ts)
- [x] Created registerCapabilityExecutors() for worker startup registration
- [x] Updated engine exports
- [x] Updated architecture and session docs

Completed (Session 8 — uncommitted):
- [x] Created candidate data contract types (CandidateItem, CandidateScore, CandidateCollection, CandidateSelection)
- [x] Created candidate helper functions (attachScore, sortByMetric, takeTopK, filterByThreshold, ensureCollection, etc.)
- [x] Updated ClipScoring executor to use candidate contract (ensureCollection input, CandidateCollection output)
- [x] Updated Ranking executor to use candidate contract (accepts scored collections, outputs CandidateSelection)
- [x] Refined node definitions for candidate-aware port descriptions
- [x] Made Ranking scores_in port optional (not needed when items already have scores from upstream)
- [x] Exported candidate types and helpers from packages/shared
- [x] Updated architecture and session docs

Completed (Session 9 — uncommitted):
- [x] Created SocialFormat capability executor with per-candidate, per-platform content generation
- [x] Created ExportBundle capability executor with structured manifest builder
- [x] Added attachMetadata() and attachCollectionMetadata() candidate helpers
- [x] Upgraded socialFormatNode definition with candidate-aware ports, parameterSchema, uiSchema
- [x] Upgraded exportBundleNode definition with candidate-aware ports, parameterSchema, uiSchema
- [x] Registered socialFormat and exportBundle executors in capabilities/index.ts
- [x] Added executeSocialFormat and executeExportBundle to engine barrel exports
- [x] Full pipeline now functional: Prompt → ImageGen → ClipScoring → Ranking → SocialFormat → ExportBundle
- [x] Updated architecture and session docs

Completed (Session 10 — uncommitted):
- [x] Created end-to-end pipeline integration test (9 test cases, all passing)
- [x] Verified full pipeline: Prompt → ImageGen → ClipScoring → Ranking → SocialFormat → ExportBundle
- [x] Verified stage-by-stage output shape and cross-stage metadata integrity
- [x] Added test script and tsx dev dependency to engine package.json
- [x] Updated architecture and session docs

Completed (Session 11 — uncommitted):
- [x] Created graph-driven orchestration integration test (9 test cases, all passing)
- [x] Verified WorkflowGraph → buildExecutionGraph() → RunCoordinator → NodeExecutor pipeline
- [x] Verified topological ordering, tier computation, dependency-gated dispatch
- [x] Verified event stream (run:started, node:queued, node:completed, run:completed)
- [x] Verified no duplicate execution, correct input resolution across edges
- [x] Verified final export output preserves upstream scores, ranks, social metadata
- [x] Fixed engine test script glob to match test files at all directory levels
- [x] Updated architecture and session docs

Completed (Session 12 — committed as `7e68ce5`):
- [x] Created template pack types with Zod validation (TemplatePackManifest, TemplatePack, TemplateEntry)
- [x] Created TemplatePackLoader class with register/lookup/filter/availability checking
- [x] Created parseTemplatePack() for JSON import validation
- [x] Created registerBuiltInPacks() for startup registration
- [x] Created built-in social-content-pipeline pack with 2 templates (full-pipeline, score-and-rank)
- [x] Added 12 tests covering loader, parser, availability, error handling
- [x] Added test script and tsx dev dependency to shared package.json
- [x] Created TEMPLATE_PACKS_PLAN.md documentation
- [x] Updated architecture and session docs

Completed (Session 13+14 — committed as `e01a2fe`):
- [x] Created TemplatePicker modal component with category grouping, source/availability badges, and text search
- [x] Wired TemplatePicker into WorkflowCanvas with Templates button in top bar
- [x] Added templatePickerOpen state and toggleTemplatePicker action to Zustand workflow store
- [x] Upgraded to product-grade "Template Gallery" with underline tab row, color-coded source badges, pack badges, tag pills, availability dots, micro-icons, empty state
- [x] Updated architecture and session docs

Completed (Session 15 — uncommitted):
- [x] Added "Import Pack" button to Template Gallery header with file upload icon
- [x] Added hidden file input accepting .json files with client-side FileReader
- [x] Validates imported JSON via parseTemplatePack() with Zod schema validation
- [x] Forces imported pack source to "imported" regardless of original manifest source
- [x] Registers valid packs at runtime via templatePackLoader, gallery refreshes immediately
- [x] Handles duplicate pack IDs by unregistering old pack before re-registering
- [x] Shows inline error banner (red) with dismissable X for invalid files
- [x] Shows inline success banner (green, auto-dismiss 4s) with pack name and template count
- [x] Auto-switches to "Imported" tab after successful import
- [x] Updated TEMPLATE_PACKS_PLAN.md, architecture, and session docs

Completed (Session 16 — uncommitted):
- [x] Created SaveAsTemplateDialog component with form for name, description, category, tags
- [x] Builds valid TemplatePack with source="user", auto-derived requiredNodeTypes and requiredProviders
- [x] Serializes pack as JSON and triggers browser download via Blob URL
- [x] Added "Save as Template" button to canvas top bar
- [x] Added saveAsTemplateOpen state and toggleSaveAsTemplate action to Zustand store
- [x] Pre-fills template name from workflow meta name
- [x] Validates non-empty name and non-empty graph before export
- [x] Updated barrel exports, architecture docs, TEMPLATE_PACKS_PLAN.md, and session docs

Completed (Session 17 — committed as `afd3cda`):
- [x] Created templatePackStorage.ts utility with rehydratePersistedPacks(), persistPack(), removePersistedPack()
- [x] Stores packs under "aiStudio.templatePacks" localStorage key as JSON array
- [x] Rehydrates persisted packs on gallery mount (after built-in packs, before first render)
- [x] Validates each pack via parseTemplatePack() during rehydration — invalid packs silently skipped
- [x] Skips built-in packs during rehydration to avoid duplicates
- [x] Imported packs now persisted automatically after successful import
- [x] User-created packs (Save as Template) now persisted + registered into loader immediately
- [x] Updated TEMPLATE_PACKS_PLAN.md, architecture docs, and session docs

Completed (Session 18 — uncommitted):
- [x] Created error-handling E2E orchestration test (9 test cases, all passing)
- [x] Verified node failure → downstream cancellation → partial_failure run status
- [x] Verified cancelled nodes never execute, independent branches still complete
- [x] Verified event stream includes node:failed, run:partial_failure, no run:completed
- [x] Verified execution order respects DAG even with failures
- [x] Verified node state summary: 3 completed, 1 failed, 1 cancelled, 0 pending
- [x] Fixed reentrancy bug in RunCoordinator.dispatchReadyNodes() — skip nodes already past pending
- [x] Updated architecture and session docs

Completed (Session 19 — uncommitted):
- [x] Created budget-enforcement E2E orchestration test (11 test cases, all passing)
- [x] Verified run begins normally with budgetCap + budgetMode persisted on RunState
- [x] Verified nodes execute and accumulate cost before cap is reached
- [x] Verified once totalCost >= budgetCap, run transitions to budget_exceeded (>= boundary exercised)
- [x] Verified pending/ready nodes (pricey + blocked) are cancelled and never dispatched
- [x] Verified completed work (source + worker) is preserved with correct outputs and completedAt
- [x] Verified event stream: run:budget_exceeded with correct totalCost + budgetCap payload
- [x] Verified no run:completed / run:failed / run:partial_failure / run:cancelled emitted
- [x] Verified node state summary: 2 completed, 2 cancelled, 0 non-terminal
- [x] All 38 engine tests pass (4 suites)

Completed (Session 20 — uncommitted):
- [x] Added sharp dependency to packages/engine (pnpm add sharp --filter @aistudio/engine)
- [x] Created packages/engine/src/local/resize.ts — executeResize() using sharp().resize()
- [x] Created packages/engine/src/local/crop.ts — executeCrop() using sharp().extract(); maps x/y params → left/top (sharp convention)
- [x] Created packages/engine/src/local/formatConvert.ts — executeFormatConvert() supporting jpeg/png/webp with quality param
- [x] Created packages/engine/src/local/index.ts — barrel + registerLocalExecutors() keyed by "resize", "crop", "format-convert"
- [x] Updated packages/engine/src/index.ts — exports registerLocalExecutors, executeResize, executeCrop, executeFormatConvert
- [x] Created packages/engine/src/imageTransforms.integration.test.ts — 16 test cases, all passing
  - resize: exact dims, non-square, metadata, invalid-fit fallback, cost=0
  - crop: exact dims, region metadata (x/y→left/top mapping), full-image crop, cost=0
  - format-convert: PNG→JPEG, PNG→WebP, PNG→PNG, default format, dim preservation, cost=0
  - chaining: resize→crop→format-convert pipeline fully in-memory (no disk I/O)
- [x] All 54 engine tests pass (9 suites, 0 failures)
- Architectural note: image_in/image_out port values are plain Buffer — compatible with Node.js Buffer serialization; sharp metadata returned in result.metadata field

---

## 2. Current Branch / Environment

Git Branch: milestone-node-platform
Environment: Local / macOS

---

## 3. Active Files

Files Created (Session 25):
- apps/web/src/app/api/workflows/[id]/runs/[runId]/outputs/route.ts
- apps/web/src/app/api/artifacts/route.ts
- apps/web/src/hooks/useRunOutputs.ts
- apps/web/src/components/generate/ResultsGrid.tsx

Files Modified (Session 25):
- apps/web/src/app/(app)/generate/page.tsx (added ResultsGrid + useRunOutputs)
- docs/SESSION_CONTEXT.md (this file)

Files Created (Session 18):
- packages/engine/src/error-handling.integration.test.ts

Files Modified (Session 18):
- packages/engine/src/runCoordinator.ts (reentrancy guard in dispatchReadyNodes)
- docs/ARCHITECTURE_NODE_PLATFORM_PLAN.md (added Session 18 / section 4p)
- docs/SESSION_CONTEXT.md (this file)

Files Created (Session 19):
- packages/engine/src/budget-enforcement.integration.test.ts

Files Modified (Session 19):
- docs/SESSION_CONTEXT.md (this file)

Files Created (Session 20):
- packages/engine/src/local/resize.ts
- packages/engine/src/local/crop.ts
- packages/engine/src/local/formatConvert.ts
- packages/engine/src/local/index.ts
- packages/engine/src/imageTransforms.integration.test.ts

Files Modified (Session 20):
- packages/engine/src/index.ts (added local executor exports)
- packages/engine/package.json (added sharp dependency)
- docs/SESSION_CONTEXT.md (this file)

Files Created (Session 21):
- packages/shared/src/artifactRef.ts (ArtifactRef type + isArtifactRef guard)
- packages/engine/src/local/imageUtils.ts (bufferFromInput + writeArtifact)
- packages/engine/src/artifactSerialization.integration.test.ts (14 new tests)

Files Modified (Session 21):
- packages/shared/src/index.ts (export ArtifactRef, isArtifactRef)
- packages/engine/src/local/resize.ts (writes to outputDir, returns ArtifactRef)
- packages/engine/src/local/crop.ts (writes to outputDir, returns ArtifactRef)
- packages/engine/src/local/formatConvert.ts (writes to outputDir, returns ArtifactRef)
- packages/engine/src/local/index.ts (export bufferFromInput, writeArtifact)
- packages/engine/src/index.ts (export bufferFromInput, writeArtifact)
- packages/engine/src/imageTransforms.integration.test.ts (updated to assert ArtifactRef contract)
- docs/SESSION_CONTEXT.md (this file)

Completed (Session 22 — Best-of-N generation node + generator adapter):
- [x] Created packages/shared/src/nodeDefinitions/capabilities.ts: added bestOfNNode definition (prompt_in, selection_out, all_candidates_out, n/k/model params)
- [x] Added NodeType.BestOfN = "best-of-n" to packages/shared/src/nodeTypes.ts
- [x] Created packages/engine/src/capabilities/bestOfN.ts: executeBestOfN() composing mock generation + executeClipScoring + executeRanking
- [x] Registered executeBestOfN in capabilities/index.ts as "best-of-n"
- [x] Created packages/engine/src/bestOfN.integration.test.ts (19 tests, 7 suites)
- [x] All 87 engine tests pass

Completed (Session 23 — GeneratorAdapter abstraction + Fal.ai integration):
- [x] Created packages/engine/src/capabilities/generator.ts:
  - GeneratorAdapter interface with kind + generate(opts)
  - MockGeneratorAdapter: deterministic solid-color PNGs via sharp (seed-based colors)
  - FalGeneratorAdapter: calls fal-ai/flux/schnell via plain fetch (no SDK); respects seed param; downloads image Buffer from CDN URL
  - createGenerator() factory: FAL_API_KEY env var → FalGeneratorAdapter; else → MockGeneratorAdapter
- [x] Refactored packages/engine/src/capabilities/bestOfN.ts to use GeneratorAdapter
  - resolveGenerator(): checks context.params.__generator (injection) → createGenerator factory
  - Per-candidate seed: (promptSeed * 1000 + i) & 0x7FFFFFFF — deterministic and provider-friendly
  - metadata.generatorKind surfaced; metadata.mock derived from generator.kind === "mock"
- [x] Created packages/engine/src/generator.integration.test.ts (16 new tests):
  - MockGeneratorAdapter: returns PNG Buffer, correct dimensions, deterministic, different seeds differ, kind=mock
  - FalGeneratorAdapter: kind=fal, accepts custom modelId
  - createGenerator factory: returns mock when no key, returns fal when key present or env var set
  - executeBestOfN injection: kind surfaces in metadata, ArtifactRefs produced, non-mock kind detected, invalid injection falls back gracefully
- [x] All 103 engine tests pass (27 suites, 0 failures)

Files Created (Session 23):
- packages/engine/src/capabilities/generator.ts
- packages/engine/src/generator.integration.test.ts

Files Modified (Session 23):
- packages/engine/src/capabilities/bestOfN.ts (uses GeneratorAdapter, removes inlined mock logic)
- packages/engine/src/capabilities/index.ts (exports generator types and classes)
- packages/engine/src/index.ts (re-exports generator types and classes)
- docs/SESSION_CONTEXT.md (this file)

Completed (Session 24 — Generator-backed workflow node integration):
- [x] Added `provider` param (enum: mock | fal) to bestOfNNode definition
- [x] Added `seed` param (number, optional) to bestOfNNode definition
- [x] Expanded `model` enum: added fal-ai/flux/schnell and fal-ai/flux-pro/v1.1 options
- [x] Updated bestOfNNode uiSchema groups: Generation now includes provider, model, seed fields
- [x] Updated executeBestOfN to honor params.seed as explicit base seed (overrides prompt-derived seed)
- [x] Rebuilt @aistudio/shared after definition changes
- [x] Created packages/engine/src/bestOfNWorkflow.integration.test.ts (21 new tests, 5 suites):
  - Suite 1: "best-of-n node through RunCoordinator + NodeExecutor dispatch"
    - run completes, node state completed, N ArtifactRefs generated, K selected, fully serializable, attempt/timestamps set
  - Suite 2: "best-of-n node receives prompt from upstream node via coordinator wiring"
    - DAG order enforced, prompt wired through graph, run completes
  - Suite 3: "best-of-n provider routing via workflow params"
    - params.provider=mock works without API key
    - Injected FalGeneratorAdapter stub called exactly N times
    - FAL_API_KEY env var activates FalGeneratorAdapter (factory-level, no network)
  - Suite 4: "explicit seed param produces reproducible outputs"
    - Same seed → identical score orderings across parallel runs
    - Different seeds → distinct artifact filenames
  - Suite 5: "full pipeline: best-of-n → social-format → export-bundle via coordinator"
    - Run completes, topological order enforced, K ArtifactRef assets in manifest, JSON-safe, social entries correct, coordinator wiring verified
- [x] All 124 engine tests pass (32 suites, 0 failures)

Files Created (Session 24):
- packages/engine/src/bestOfNWorkflow.integration.test.ts

Files Modified (Session 24):
- packages/shared/src/nodeDefinitions/capabilities.ts (added provider/seed params, expanded model enum, updated uiSchema)
- packages/engine/src/capabilities/bestOfN.ts (honors params.seed as explicit base seed)
- docs/SESSION_CONTEXT.md (this file)

Completed (Session 53 — Re-run action on history page cards):
- [x] Added `useRouter` + `rerunning` + `rerunError` state to history page
- [x] `handleRerun()`: POST /api/workflows/:id/runs → on success router.push(/workflows/:id); on failure sets rerunError
- [x] Single `rerunning` boolean disables all Re-run buttons while one request is in flight
- [x] Re-run button placed in right-side card div alongside duration/cost; shows "Starting…" while in flight
- [x] `rerunError` banner shown above the run list; cleared on next attempt
- [x] Does NOT replay the historical graph snapshot — starts a fresh run against the current saved workflow graph
- [x] TypeCheck passes: 0 errors; committed as b22667c

Files Added (Session 53): none

Files Modified (Session 53):
- apps/web/src/app/(app)/workflows/[id]/history/page.tsx (useRouter, rerunning/rerunError state, handleRerun, button + error banner)
- docs/SESSION_CONTEXT.md (this file)

Completed (Session 52 — Completion summary on history page):
- [x] Added `completed = runs.filter((r) => r.status === "completed").length` to the summary IIFE
- [x] Summary line now reads: "N run(s) · X completed · Total cost: $Y.YYYY"
- [x] Zero-completed and all-completed cases render sensibly ("0 completed" / "N completed")
- [x] Empty state unaffected; no API changes; TypeCheck passes: 0 errors; committed as 93f2edf

Files Added (Session 52): none

Files Modified (Session 52):
- apps/web/src/app/(app)/workflows/[id]/history/page.tsx (completed count in summary line)
- docs/SESSION_CONTEXT.md (this file)

Completed (Session 51 — Aggregate cost summary on history page):
- [x] Derived `totalCost = runs.reduce((sum, r) => sum + (r.totalCost ?? 0), 0)` client-side
- [x] Rendered as "X run(s) · Total cost: $X.XXXX" above the run list (only when runs.length > 0)
- [x] Uses same `.toFixed(4)` format as per-run cost display for consistency
- [x] Empty state unaffected; null/missing totalCost values safely treated as 0
- [x] No API changes; TypeCheck passes: 0 errors; committed as 0595050

Files Added (Session 51): none

Files Modified (Session 51):
- apps/web/src/app/(app)/workflows/[id]/history/page.tsx (summary line + totalCost derivation)
- docs/SESSION_CONTEXT.md (this file)

Completed (Session 50 — Workflows breadcrumb on history page):
- [x] Added `← Workflows` Link (href="/workflows") before the existing Editor link in the history page header
- [x] Changed `← Editor` label to just `Editor` (arrow moved to the top-level back link)
- [x] Header now reads: `← Workflows · Editor · Run History`
- [x] Navigation triangle fully closed from all three surfaces
- [x] TypeCheck passes: 0 errors; committed as 937287a

Files Added (Session 50): none

Files Modified (Session 50):
- apps/web/src/app/(app)/workflows/[id]/history/page.tsx (← Workflows link + header breadcrumb chain)
- docs/SESSION_CONTEXT.md (this file)

Completed (Session 49 — History link on workflow list cards):
- [x] Added `<a href="/workflows/:id/history">History</a>` with `onClick={stopPropagation}` to each card footer
- [x] Plain `<a>` used (not Next.js Link) to avoid nested `<a>` invalid HTML from the outer card `<Link>`
- [x] History + dot separator + Delete grouped in a right-side `<span>` flex row in the normal state
- [x] During delete-confirm state, History link is hidden — only the Yes/No confirm buttons show
- [x] Navigation triangle now complete from all three surfaces: list ↔ editor ↔ history
- [x] TypeCheck passes: 0 errors; committed as ef6b6d1

Files Added (Session 49): none

Files Modified (Session 49):
- apps/web/src/app/(app)/workflows/page.tsx (History link in card footer action cluster)
- docs/SESSION_CONTEXT.md (this file)

Completed (Session 48 — Run history navigation link in editor top bar):
- [x] Added "Run History" `<Link>` to canvas top bar after "← Workflows", routes to `/workflows/:id/history`
- [x] Conditional on `meta` being loaded (no link shown until workflow is fetched)
- [x] Same `text-xs text-neutral-500 hover:text-neutral-300` style as the existing back link
- [x] Removed `mr-1` from "← Workflows" link (now both sit in the container's natural `gap-2`)
- [x] Navigation triangle complete: list ↔ editor ↔ history
- [x] TypeCheck passes: 0 errors; committed as a315123

Files Added (Session 48): none

Files Modified (Session 48):
- apps/web/src/components/canvas/WorkflowCanvas.tsx ("Run History" link added to top bar)
- docs/SESSION_CONTEXT.md (this file)

Completed (Session 47 — Run history endpoint and page):
- [x] Added `GET /api/workflows/:id/runs`: validates workflow exists (404 on miss), queries `runs` table ordered by `createdAt DESC`, returns summary fields only (no graphSnapshot)
- [x] Added `desc` import from drizzle-orm to runs route
- [x] Replaced history page stub with real client component: fetches run list, renders status dot + label + short runId + duration + cost + timestamp
- [x] `durationLabel()` computes ms/s/m from startedAt/completedAt
- [x] Empty state: dashed border card with guidance text; error state: inline message
- [x] "← Editor" back-link to `/workflows/:id`
- [x] Status colors match `RUN_DOT_COLOR` / `STATUS_DOT` palettes used elsewhere
- [x] TypeCheck passes: 0 errors
- [x] Committed as 1b8fc36

Schema limitations:
- `budgetMode` stored but not shown (not useful for history at this stage)
- No node-level breakdown in history view (would need `nodeExecutions` table join, not yet wired)
- `graphSnapshot` excluded from response (large; not needed for list view)

Files Added (Session 47): none (history page replaced in place)

Files Modified (Session 47):
- apps/web/src/app/api/workflows/[id]/runs/route.ts (GET handler + desc import)
- apps/web/src/app/(app)/workflows/[id]/history/page.tsx (full replacement of stub)
- docs/SESSION_CONTEXT.md (this file)

Completed (Session 46 — Persist run outcome to workflow record):
- [x] Root cause: RunCoordinator is pure in-memory; nothing wrote lastRunStatus/lastRunAt to DB
- [x] Fix: `.then()` continuation after `coordinator.startRun()` (resolves when full DAG completes)
- [x] Writes `runs` table row: id, workflowId, status, graphSnapshot, totalCost, startedAt, completedAt, createdAt
- [x] Updates `workflows` row: lastRunId, lastRunStatus, lastRunAt, updatedAt
- [x] Covers all terminal statuses: completed, failed, partial_failure, budget_exceeded (all set run.completedAt)
- [x] cancelRun() not yet triggered via API — noted as edge case
- [x] All existing imports (getDb, schema, eq, workflowId, graph) already in scope — zero new imports
- [x] TypeCheck passes: 0 errors

Files Added (Session 46): none

Files Modified (Session 46):
- apps/web/src/app/api/workflows/[id]/runs/route.ts (.then() DB persistence after startRun)
- docs/SESSION_CONTEXT.md (this file)

Completed (Session 45 — Last-run status indicator on workflow cards):
- [x] Added `RUN_DOT_COLOR` map matching CustomNode STATUS_DOT palette (completed/running/failed/partial_failure/cancelled/budget_exceeded/pending)
- [x] Added `formatTimeAgo(iso)` helper: just now / Xm ago / Xh ago / Xd ago
- [x] Added `LastRunIndicator` component: colored dot + capitalized status label + relative time; "No runs yet" when status is null
- [x] Rendered between description and footer row on each card — visually subordinate to title
- [x] Reuses `lastRunStatus` and `lastRunAt` already returned by GET /api/workflows — no API changes
- [x] Existing StatusBadge in card header left intact (distinct role: quick color-only read)
- [x] TypeCheck passes: 0 errors

Files Added (Session 45): none

Files Modified (Session 45):
- apps/web/src/app/(app)/workflows/page.tsx (RUN_DOT_COLOR, formatTimeAgo, LastRunIndicator, card render)
- docs/SESSION_CONTEXT.md (this file)

Completed (Session 44 — Back to Workflows link in canvas top bar):
- [x] Added Next.js `<Link href="/workflows">← Workflows</Link>` as the first element in the top bar
- [x] Styled `text-xs text-neutral-500 hover:text-neutral-300 mr-1` — reads as nav context, not a primary action
- [x] No changes to button grouping, divider, or any other top bar element
- [x] TypeCheck passes: 0 errors

Files Added (Session 44): none

Files Modified (Session 44):
- apps/web/src/components/canvas/WorkflowCanvas.tsx (Link import, ← Workflows link at top bar start)
- docs/SESSION_CONTEXT.md (this file)

Completed (Session 43 — Delete action on workflow cards):
- [x] Added `deletingId` + `deleteError` local state — no store changes
- [x] `handleDelete(id)`: calls DELETE /api/workflows/:id; on success filters list locally (no refetch); on failure sets deleteError
- [x] Per-card inline confirm: "Delete" button → "Delete? Yes / No" row; both stop propagation so the Link doesn't navigate
- [x] Dismissable error banner above the list on delete failure — matches existing create-error style
- [x] Only one card can be in confirm state at a time (new click replaces previous deletingId)
- [x] TypeCheck passes: 0 errors

Files Added (Session 43): none

Files Modified (Session 43):
- apps/web/src/app/(app)/workflows/page.tsx (deletingId/deleteError state, handleDelete, inline confirm row, error banner)
- docs/SESSION_CONTEXT.md (this file)

Completed (Session 42 — Workflow list page audit + duplicate SSE fix):
- [x] /workflows page already fully implemented: GET /api/workflows, cards with name/description/updatedAt/lastRunStatus badge, empty state, Create Workflow modal, links to /workflows/:id
- [x] Identified duplicate useRunEvents() call: editor page AND CanvasInner both subscribed to the same SSE stream
- [x] Removed redundant useRunEvents(id, currentRunId) + its import from /workflows/[id]/page.tsx — CanvasInner is the single subscriber
- [x] TypeCheck passes: 0 errors

Files Added (Session 42): none

Files Modified (Session 42):
- apps/web/src/app/(app)/workflows/[id]/page.tsx (removed duplicate useRunEvents call + import)
- docs/SESSION_CONTEXT.md (this file)

Completed (Session 41 — Rename error recovery):
- [x] Captured `previous = meta.name` before optimistic `updateMetaName(trimmed)`
- [x] Wrapped PATCH in try/catch; non-ok responses throw to enter catch branch
- [x] On failure: `updateMetaName(previous)` silently reverts store to server-consistent state
- [x] All existing paths unchanged (Escape, unchanged name, empty name skip PATCH entirely)
- [x] TypeCheck passes: 0 errors

Files Added (Session 41): none

Files Modified (Session 41):
- apps/web/src/components/canvas/WorkflowCanvas.tsx (previous capture + try/catch revert in handleCommitRename)
- docs/SESSION_CONTEXT.md (this file)

Completed (Session 40 — Inline workflow rename in canvas top bar):
- [x] Added `updateMetaName(name)` action to Zustand store — updates `meta.name` optimistically in place
- [x] Name display changed from static `<span>` to clickable `<button>` with `cursor-text` + hover highlight
- [x] Click → inline `<input>` prefilled with current name, `autoFocus`, same position (no layout shift)
- [x] Commit on blur or Enter (via blur trigger); cancel on Escape (restores display without store update)
- [x] On commit: optimistic store update via `updateMetaName`, then PATCH `/api/workflows/:id` with `{ name }`
- [x] Empty/whitespace or unchanged name skips the PATCH
- [x] TypeCheck passes: 0 errors

Files Added (Session 40): none

Files Modified (Session 40):
- apps/web/src/stores/workflowStore.ts (updateMetaName action)
- apps/web/src/components/canvas/WorkflowCanvas.tsx (inline rename state, handlers, input/button toggle)
- docs/SESSION_CONTEXT.md (this file)

Completed (Session 39 — Disabled-state tooltip on Save button):
- [x] Added `title` to Save button: saving → "Saving…" / !dirty → "No unsaved changes" / actionable → undefined
- [x] Follows identical pattern to Run Workflow button (session 38)
- [x] No behavior, label, or styling changes
- [x] TypeCheck passes: 0 errors

Files Added (Session 39): none

Files Modified (Session 39):
- apps/web/src/components/canvas/WorkflowCanvas.tsx (title prop on Save button)
- docs/SESSION_CONTEXT.md (this file)

Completed (Session 38 — Disabled-state tooltip on Run Workflow button):
- [x] Added `title` attribute to Run Workflow button with priority-ordered reason: isRunning → !meta → nodes.length===0
- [x] Messages: "Run is starting…" / "No workflow loaded" / "Add nodes to the canvas first"
- [x] `title` is `undefined` when button is enabled — no tooltip shown in the happy path
- [x] Dependency-free (native title attribute); no behavior or styling changes
- [x] TypeCheck passes: 0 errors

Files Added (Session 38): none

Files Modified (Session 38):
- apps/web/src/components/canvas/WorkflowCanvas.tsx (title prop on Run Workflow button)
- docs/SESSION_CONTEXT.md (this file)

Completed (Session 37 — Top bar divider between workflow actions and run controls):
- [x] Added `<span className="h-4 w-px bg-neutral-700 mx-1" aria-hidden="true" />` between "Save as Template" and "Run Workflow"
- [x] Groups: [name · Templates · Debugger · Save · Save as Template] | [Run Workflow · badge · count]
- [x] No behavior, spacing, or button changes
- [x] TypeCheck passes: 0 errors

Files Added (Session 37): none

Files Modified (Session 37):
- apps/web/src/components/canvas/WorkflowCanvas.tsx (divider span)
- docs/SESSION_CONTEXT.md (this file)

Completed (Session 36 — Save button keyboard shortcut label):
- [x] Save button label updated: dirty state shows "Save ⌘S" with `<span className="opacity-50">` on the hint
- [x] Hint only appears when the save action is actionable (dirty=true); "Saving..." and "Saved" states unchanged
- [x] No platform detection added — ⌘S is the existing repo convention (handler already uses metaKey||ctrlKey)
- [x] No behavior, layout, or styling changes — label-only addition
- [x] TypeCheck passes: 0 errors

Files Added (Session 36): none

Files Modified (Session 36):
- apps/web/src/components/canvas/WorkflowCanvas.tsx (Save button label JSX)
- docs/SESSION_CONTEXT.md (this file)

Completed (Session 35 — Workflow name in canvas top bar):
- [x] Renders `meta?.name` (fallback: "Untitled workflow") as a `<span>` at the start of the top bar
- [x] Styled `text-xs font-medium text-neutral-400 select-none` — visually subordinate to action buttons
- [x] `max-w-[200px] truncate` prevents long names from breaking the layout; full name on `title` tooltip
- [x] No new state, no store changes — `meta` already destructured in CanvasInner
- [x] Read-only; no rename UX added
- [x] TypeCheck passes: 0 errors

Files Added (Session 35): none

Files Modified (Session 35):
- apps/web/src/components/canvas/WorkflowCanvas.tsx (name span added at start of top bar)
- docs/SESSION_CONTEXT.md (this file)

Completed (Session 34 — Node/edge count summary in canvas top bar):
- [x] Derived counts directly from `nodes.length` / `edges.length` already in scope — no new state
- [x] Renders "X node(s) · Y edge(s)" as a lightweight `<span>` at the end of the top bar
- [x] Correct singular/plural for both nouns
- [x] Styled as `text-xs text-neutral-600 select-none` — reads as passive metadata, not a control
- [x] Updates live on every graph change since it re-renders with the store
- [x] TypeCheck passes: 0 errors

Files Added (Session 34): none

Files Modified (Session 34):
- apps/web/src/components/canvas/WorkflowCanvas.tsx (count span added to top bar)
- docs/SESSION_CONTEXT.md (this file)

Completed (Session 33 — Live pulse dot on Run Workflow button):
- [x] Derived `isExecuting = !isRunning && debugSnapshot?.status === "running"` — no new state or effects
- [x] Added animated blue dot inside the Run Workflow button using exact same pattern as CustomNode status dot: `h-2 w-2 rounded-full animate-pulse` at `#60a5fa` (blue-400)
- [x] Dot is absent before submission, during the "Starting..." submit phase, and after terminal completion — no conflict with the terminal badge
- [x] Button updated to `inline-flex items-center gap-1.5` to align dot + label cleanly
- [x] TypeCheck passes: 0 errors

Files Added (Session 33): none

Files Modified (Session 33):
- apps/web/src/components/canvas/WorkflowCanvas.tsx (inline-flex button, pulse dot span)
- docs/SESSION_CONTEXT.md (this file)

Completed (Session 32 — Run-complete badge in canvas top bar):
- [x] Added `runBadge` local state + `badgeTimerRef` to CanvasInner — no store changes
- [x] `useEffect` on `debugSnapshot?.status` detects terminal transition → sets badge + starts 3 s auto-dismiss timer
- [x] `useEffect` on `isRunning` clears badge immediately when a new run starts
- [x] Cleanup effect cancels timer on unmount
- [x] Badge colors: emerald for completed, red for failed/partial_failure, yellow for cancelled/budget_exceeded — matches RunDebuggerPanel tokens
- [x] Badge renders as a `<span>` with same pill styling as top-bar buttons; sits inline after the Run Workflow button
- [x] TypeCheck passes: 0 errors

Files Added (Session 32): none

Files Modified (Session 32):
- apps/web/src/components/canvas/WorkflowCanvas.tsx (useEffect import, TERMINAL_BADGE map, runBadge state, badge render)
- docs/SESSION_CONTEXT.md (this file)

Completed (Session 31 — Run Workflow button in canvas top bar):
- [x] Added `isRunning` state + `runWorkflow` async action to Zustand workflow store
- [x] `runWorkflow` auto-saves dirty graph before POSTing to `/api/workflows/:id/runs`
- [x] Sets `currentRunId` + opens debugger panel on success; reuses existing `setCurrentRunId`
- [x] Mounted `useRunEvents(meta.id, currentRunId)` in `CanvasInner` — SSE → `setDebugSnapshot` → status dots + debugger update live
- [x] Added "Run Workflow" button to canvas top bar with emerald accent styling
- [x] Button disabled when: no workflow loaded (`!meta`), empty canvas (`nodes.length === 0`), or run in-progress (`isRunning`)
- [x] TypeCheck passes: 0 errors

Files Added (Session 31): none

Files Modified (Session 31):
- apps/web/src/stores/workflowStore.ts (added isRunning, runWorkflow)
- apps/web/src/components/canvas/WorkflowCanvas.tsx (useRunEvents mount, Run Workflow button)
- docs/SESSION_CONTEXT.md (this file)

Completed (Session 30 — Mini node status overlay on canvas):
- [x] Added STATUS_DOT map to CustomNode: pending/queued/running/completed/failed/cancelled → color + pulse + label; colors match RunDebuggerPanel tokens exactly
- [x] CustomNode reads its own run status from the Zustand store via targeted selector keyed to node id — only re-renders when its own status changes
- [x] Status dot renders as a 2×2 rounded span at the start of the header row; running status uses animate-pulse; title attribute shows label on hover
- [x] Dot is absent when debugSnapshot is null (no active run) — zero visual noise during editing
- [x] No prop changes to WorkflowCanvas, no store changes, no engine changes
- [x] TypeCheck passes: 0 errors

Files Added (Session 30): none

Files Modified (Session 30):
- apps/web/src/components/canvas/CustomNode.tsx (STATUS_DOT, useWorkflowStore selector, dot render)
- docs/SESSION_CONTEXT.md (this file)

Completed (Session 29 — Confirm before deleting connected node):
- [x] Created ConfirmDeleteDialog: overlay + card matching existing dialog pattern; shows node label + edge count; Cancel / Delete (red) buttons
- [x] Added onBeforeDelete handler in CanvasInner: counts edges connected to nodes being deleted; if any exist, stores pending state and returns Promise<boolean> resolved by dialog actions; if none, resolves immediately
- [x] deleteResolverRef holds the Promise resolver so dialog buttons can resolve/reject from event handlers
- [x] Wired onBeforeDelete prop on <ReactFlow>; React Flow's own deletion path (Delete/Backspace key) is intercepted before nodes/edges are removed
- [x] ConfirmDeleteDialog rendered at bottom of CanvasInner alongside ConfirmReplaceDialog
- [x] TypeCheck passes: 0 errors

Files Added (Session 29):
- apps/web/src/components/canvas/ConfirmDeleteDialog.tsx

Files Modified (Session 29):
- apps/web/src/components/canvas/WorkflowCanvas.tsx (onBeforeDelete, pendingDelete state, resolver ref, dialog render)
- docs/SESSION_CONTEXT.md (this file)

Completed (Session 28 — Confirm before template replace):
- [x] Created ConfirmReplaceDialog component: overlay + card matching SaveAsTemplateDialog pattern; Cancel / Replace (red) buttons; template name in message
- [x] Added pendingTemplate local state to CanvasInner: holds { graph, name } when dirty=true and user picks a template
- [x] Refactored handleTemplateSelect: if dirty → store pending; if clean → apply immediately
- [x] Added handleConfirmReplace (apply + clear) and handleCancelReplace (clear only)
- [x] Dialog renders conditionally at bottom of CanvasInner; no store changes required
- [x] TypeCheck passes: 0 errors

Files Added (Session 28):
- apps/web/src/components/canvas/ConfirmReplaceDialog.tsx

Files Modified (Session 28):
- apps/web/src/components/canvas/WorkflowCanvas.tsx (pendingTemplate state, guard, dialog render)
- docs/SESSION_CONTEXT.md (this file)

Completed (Session 27 — Canvas connection validation):
- [x] Created apps/web/src/lib/connectionValidation.ts: isConnectionValid(nodes, connection) using PORT_COMPATIBILITY from @aistudio/shared
- [x] Wired isValidConnection prop on <ReactFlow> in WorkflowCanvas.tsx — React Flow's native visual rejection (red line, no snap) when incompatible ports are dragged
- [x] Typed for Connection | Edge to match React Flow's IsValidConnection<Edge> signature
- [x] No new state, no toast, no engine changes — pure canvas-layer validation
- [x] TypeCheck passes: 0 errors

Files Added (Session 27):
- apps/web/src/lib/connectionValidation.ts

Files Modified (Session 27):
- apps/web/src/components/canvas/WorkflowCanvas.tsx (isValidConnection wiring)
- docs/SESSION_CONTEXT.md (this file)

Completed (Session 26 — All Candidates expandable section):
- [x] Extended useRunOutputs: added allItems field; extracts all_candidates_out (CandidateCollection) alongside existing selection_out in one fetch
- [x] Updated ResultsGrid: title prop now accepts null to suppress the heading, enabling embedding inside a parent container
- [x] Added collapsible "All Candidates" section to Generate page: toggle button with animated chevron, default collapsed, shows all N images via ResultsGrid when expanded
- [x] Top-K selected grid unchanged; all candidates renders below it and above debug panel
- [x] TypeCheck passes: 0 errors

Files Modified (Session 26):
- apps/web/src/hooks/useRunOutputs.ts (added allItems to state + extraction logic)
- apps/web/src/components/generate/ResultsGrid.tsx (title accepts null to suppress heading)
- apps/web/src/app/(app)/generate/page.tsx (destructures allItems, adds collapsible section)
- docs/SESSION_CONTEXT.md (this file)

Completed (Session 25 — committed as milestone-artifact-rendering):
- [x] Added GET /api/workflows/[id]/runs/[runId]/outputs — returns completed node outputs (CandidateSelection with ArtifactRef items) from the RunCoordinator
- [x] Added GET /api/artifacts?path=<encoded-path> — serves local artifact files; restricted to /tmp/aistudio-runs/ prefix to prevent path traversal
- [x] Created useRunOutputs hook — fetches outputs when run completes, extracts first CandidateSelection from any node's selection_out
- [x] Created ResultsGrid component — renders image grid from CandidateItem[], uses ArtifactRef path via /api/artifacts, shows rank/score/dimensions
- [x] Wired Generate page: imports useRunOutputs + ResultsGrid; ResultsGrid renders above debug panel when run is complete
- [x] Works for both mock and fal generators (both produce ArtifactRef outputs)
- [x] TypeCheck passes: 0 errors

---

## 4. Decisions Made This Session

- Zustand store is the single source of truth for canvas state — no prop-drilling
- React Flow ↔ WorkflowNode adapters live in the store file for co-location
- CustomNode uses inline SVG-free approach — Tailwind classes + @xyflow/react Handle components
- Port handle positions auto-distribute vertically based on port count
- Port colors match existing InspectorPanel conventions (image=purple, video=orange, text=green, number=blue, json=yellow)
- WorkflowCanvas composes all panels: palette (left), inspector (right on selection), debugger (bottom on toggle)
- Save uses PATCH /api/workflows/:id, triggered by Cmd+S or Save button
- Dirty tracking prevents unnecessary saves
- Node click opens inspector; pane click deselects

---

## 5. Open Questions / Blockers

- Pre-existing TS errors in engine integration test files (PortType string literals) — not caused by our changes
- ArtifactRef outputs (PNG file paths) are surfaced as JSON in RunDebuggerPanel; result rendering polish is the next milestone

---

## 6. Next Actions (When I Return)

1. [DONE] Budget enforcement E2E test — budget cap → budget_exceeded status → pending node cancellation
2. [DONE] Local executors — sharp-based resize/crop/format-convert implementations
3. [DONE] Artifact/output normalization — ArtifactRef contract; local executors write to outputDir, return serializable refs
4. [DONE] Best-of-N generation node — generate N variants, auto-score, select best using candidate contract + ArtifactRef
5. [DONE] GeneratorAdapter abstraction — MockGeneratorAdapter + FalGeneratorAdapter (fal-ai/flux/schnell via fetch); FAL_API_KEY activation; adapter injection for testing
6. [DONE] Generator-backed workflow node integration — bestOfNNode wired through RunCoordinator + NodeExecutor dispatch; provider/seed params added to definition; 21 new workflow-level tests
7. [DONE] Prompt-page / app wiring — Generate page (/generate) + full workflow/run path wiring
8. Connection validation — use PORT_COMPATIBILITY to validate edge connections at wire-up time
9. Confirmation dialog before replacing current graph when loading a template
10. Result rendering polish for ArtifactRef-based generated selections (next)

---

## 7. Notes

See /docs/ARCHITECTURE_NODE_PLATFORM_PLAN.md for the full architecture plan,
migration strategy, and recommended implementation order.
