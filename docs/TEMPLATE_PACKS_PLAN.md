# Template Packs Architecture

Date: 2026-03-08

---

## 1. Overview

Template packs are bundles of pre-built workflow templates that can be installed in AI Studio without a hosted marketplace. They provide ready-to-use workflow graphs that users can load into the canvas editor.

### Design Principles

- **No marketplace**: only built-in and imported packs
- **JSON-based**: packs are plain JSON files containing a manifest and WorkflowGraph objects
- **Schema-validated**: all packs are validated via Zod schemas at load time
- **Registry-aware**: packs declare required node types and providers; availability is checked against the node registry
- **Incremental**: extends the existing WorkflowGraph schema — templates are just pre-built graphs

---

## 2. Types

### TemplatePackManifest

```typescript
type TemplatePackManifest = {
  id: string;              // unique pack identifier
  name: string;            // display name
  version: string;         // semver
  author?: string;
  description?: string;
  category?: string;       // e.g. "content-creation", "automation"
  tags?: string[];
  templates: string[];     // IDs of templates in this pack
  previews?: Record<string, string>;  // template ID → description
  requiredProviders?: string[];       // provider IDs needed
  requiredNodeTypes?: string[];       // node types needed
  source: "builtin" | "user" | "imported" | "premium";
};
```

### TemplatePack

```typescript
type TemplatePack = {
  manifest: TemplatePackManifest;
  templates: Record<string, WorkflowGraph>;  // template ID → workflow graph
};
```

### TemplateEntry

```typescript
type TemplateEntry = {
  id: string;
  packId: string;
  name: string;
  graph: WorkflowGraph;
  preview?: string;
};
```

---

## 3. Architecture

### File locations

| File | Purpose |
|------|---------|
| `packages/shared/src/templatePack.ts` | Types, Zod schemas, `TemplatePackLoader` class, `parseTemplatePack()` helper, global singleton |
| `packages/shared/src/builtinPacks.ts` | `registerBuiltInPacks()` — validates and registers raw pack JSON data |
| `packages/shared/src/templatePack.test.ts` | 12 tests covering loader, parser, availability checking |
| `templates/packs/*.json` | Built-in pack JSON files |

### TemplatePackLoader

Singleton class (`templatePackLoader`) that manages pack registration and lookup:

- `register(pack)` / `registerAll(packs)` — register validated packs
- `getPack(id)` / `has(id)` — lookup by pack ID
- `getTemplate(packId, templateId)` — get a specific template entry
- `getAllTemplates()` — flat list of all templates across all packs
- `getBySource(source)` / `getByCategory(category)` — filtered lookups
- `checkAvailability(packId)` — checks required node types and providers against the node registry

### Import flow

```
JSON file → parseTemplatePack() → validates manifest + WorkflowGraphs → TemplatePack
  → templatePackLoader.register() → available via getAllTemplates()
```

### Built-in pack registration

```
templates/packs/*.json → readFileSync or import → registerBuiltInPacks([raw1, raw2, ...])
  → parseTemplatePack() each → templatePackLoader.register() each
```

---

## 4. Built-in Packs

### social-content-pipeline (v1.0.0)

Two templates:

| Template | Nodes | Description |
|----------|-------|-------------|
| `full-pipeline` | 6 | Prompt → ImageGen → ClipScoring → Ranking → SocialFormat → ExportBundle |
| `score-and-rank` | 3 | ClipScoring → Ranking → ExportBundle |

Required node types: `clip-scoring`, `ranking`, `social-format`, `export-bundle`

---

## 5. What Is NOT Implemented

- Hosted marketplace / pack discovery
- Pack versioning / upgrade logic
- Pack dependency resolution (pack A depends on pack B)
- User-created pack authoring UI
- Pack signing or verification
- Premium pack gating (type exists but no enforcement)
- Live preview rendering
- Template thumbnail images

---

## 6. Future Integration Points

### Template picker UI
A palette/modal that shows `templatePackLoader.getAllTemplates()` grouped by category, with availability badges from `checkAvailability()`. On selection, loads the `WorkflowGraph` into the Zustand workflow store.

### Import from file
A file picker that reads a JSON file, calls `parseTemplatePack()`, and registers it with `templatePackLoader`. Source = "imported".

### User-created templates
Save the current workflow graph as a template, wrap it in a `TemplatePack` with source = "user", and persist to the database or local storage.
