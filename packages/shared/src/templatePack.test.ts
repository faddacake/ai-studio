/**
 * Template Pack types, loader, and parser tests.
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { TemplatePackLoader, parseTemplatePack } from "./templatePack.js";
import { registerBuiltInPacks } from "./builtinPacks.js";
import { registerBuiltInNodes, nodeRegistry } from "./index.js";
import type { TemplatePack, WorkflowGraph } from "./index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACK_PATH = resolve(__dirname, "../../../templates/packs/social-content-pipeline.json");

function loadRawPack(): unknown {
  return JSON.parse(readFileSync(PACK_PATH, "utf-8"));
}

describe("TemplatePackLoader", () => {
  let loader: TemplatePackLoader;

  beforeEach(() => {
    loader = new TemplatePackLoader();
  });

  it("registers and retrieves a pack", () => {
    const pack = parseTemplatePack(loadRawPack());
    loader.register(pack);

    assert.equal(loader.size, 1);
    assert.ok(loader.has("social-content-pipeline"));

    const retrieved = loader.getPack("social-content-pipeline");
    assert.ok(retrieved);
    assert.equal(retrieved.manifest.name, "Social Content Pipeline");
  });

  it("returns all templates across packs", () => {
    const pack = parseTemplatePack(loadRawPack());
    loader.register(pack);

    const templates = loader.getAllTemplates();
    assert.equal(templates.length, 2);

    const ids = templates.map((t) => t.id);
    assert.ok(ids.includes("full-pipeline"));
    assert.ok(ids.includes("score-and-rank"));
  });

  it("retrieves a specific template", () => {
    const pack = parseTemplatePack(loadRawPack());
    loader.register(pack);

    const entry = loader.getTemplate("social-content-pipeline", "full-pipeline");
    assert.ok(entry);
    assert.equal(entry.id, "full-pipeline");
    assert.equal(entry.packId, "social-content-pipeline");
    assert.ok(entry.graph);
    assert.equal(entry.graph.version, 1);
    assert.equal(entry.graph.nodes.length, 6);
    assert.equal(entry.graph.edges.length, 6);
  });

  it("filters packs by source", () => {
    const pack = parseTemplatePack(loadRawPack());
    loader.register(pack);

    const builtins = loader.getBySource("builtin");
    assert.equal(builtins.length, 1);

    const imported = loader.getBySource("imported");
    assert.equal(imported.length, 0);
  });

  it("filters packs by category", () => {
    const pack = parseTemplatePack(loadRawPack());
    loader.register(pack);

    const contentPacks = loader.getByCategory("content-creation");
    assert.equal(contentPacks.length, 1);

    const otherPacks = loader.getByCategory("other");
    assert.equal(otherPacks.length, 0);
  });

  it("unregisters a pack", () => {
    const pack = parseTemplatePack(loadRawPack());
    loader.register(pack);
    assert.equal(loader.size, 1);

    loader.unregister("social-content-pipeline");
    assert.equal(loader.size, 0);
    assert.ok(!loader.has("social-content-pipeline"));
  });
});

describe("parseTemplatePack", () => {
  it("validates and parses a raw pack JSON", () => {
    const raw = loadRawPack();
    const pack = parseTemplatePack(raw);

    assert.equal(pack.manifest.id, "social-content-pipeline");
    assert.equal(pack.manifest.version, "1.0.0");
    assert.equal(pack.manifest.source, "builtin");
    assert.deepEqual(pack.manifest.templates, ["full-pipeline", "score-and-rank"]);

    // Templates are valid WorkflowGraphs
    assert.ok(pack.templates["full-pipeline"]);
    assert.equal(pack.templates["full-pipeline"].version, 1);
    assert.ok(pack.templates["score-and-rank"]);
    assert.equal(pack.templates["score-and-rank"].nodes.length, 3);
  });

  it("throws on invalid input", () => {
    assert.throws(() => parseTemplatePack(null), /expected an object/);
    assert.throws(() => parseTemplatePack({}), /Required/);
    assert.throws(
      () => parseTemplatePack({ manifest: { id: "x", name: "x", version: "1", templates: ["missing"], source: "builtin" }, templates: {} }),
      /manifest lists template "missing"/,
    );
  });
});

describe("registerBuiltInPacks", () => {
  it("registers built-in packs from raw JSON data", () => {
    const raw = loadRawPack();
    const registered = registerBuiltInPacks([raw]);

    assert.equal(registered.length, 1);
    assert.equal(registered[0].manifest.id, "social-content-pipeline");
  });

  it("skips invalid packs without throwing", () => {
    const registered = registerBuiltInPacks([null, "invalid", loadRawPack()]);
    assert.equal(registered.length, 1);
  });
});

describe("checkAvailability", () => {
  beforeEach(() => {
    nodeRegistry.clear();
  });

  it("reports missing node types when registry is empty", () => {
    const loader = new TemplatePackLoader();
    const pack = parseTemplatePack(loadRawPack());
    loader.register(pack);

    const availability = loader.checkAvailability("social-content-pipeline");
    assert.equal(availability.available, false);
    assert.ok(availability.missingNodeTypes.length > 0);
    assert.ok(availability.missingNodeTypes.includes("clip-scoring"));
  });

  it("reports available when all required types are registered", () => {
    registerBuiltInNodes();
    const loader = new TemplatePackLoader();
    const pack = parseTemplatePack(loadRawPack());
    loader.register(pack);

    const availability = loader.checkAvailability("social-content-pipeline");
    assert.equal(availability.available, true);
    assert.equal(availability.missingNodeTypes.length, 0);
  });
});
