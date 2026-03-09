"use client";

import { useState, useCallback } from "react";
import { templatePackLoader, type TemplatePack, type TemplatePackManifest } from "@aistudio/shared";
import type { WorkflowGraph } from "@aistudio/shared";
import { persistPack } from "@/lib/templatePackStorage";

// ── Props ──

export interface SaveAsTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  /** Returns the current WorkflowGraph from the store */
  getGraph: () => WorkflowGraph;
  /** Default name pre-filled from workflow meta */
  defaultName?: string;
}

// ── Component ──

export function SaveAsTemplateDialog({
  open,
  onClose,
  getGraph,
  defaultName = "",
}: SaveAsTemplateDialogProps) {
  const [name, setName] = useState(defaultName || "My Template");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleExport = useCallback(() => {
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Template name is required");
      return;
    }

    try {
      const graph = getGraph();

      if (graph.nodes.length === 0) {
        setError("Cannot save an empty workflow as a template");
        return;
      }

      // Derive required node types from graph
      const requiredNodeTypes = Array.from(
        new Set(graph.nodes.map((n) => n.type)),
      );

      // Derive required providers from graph
      const requiredProviders = Array.from(
        new Set(
          graph.nodes
            .map((n) => n.data.providerId)
            .filter((p): p is string => !!p),
        ),
      );

      // Parse tags from comma-separated input
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      // Build template ID from name
      const templateId = trimmedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const packId = `user-${templateId}-${Date.now()}`;

      const manifest: TemplatePackManifest = {
        id: packId,
        name: trimmedName,
        version: "1.0.0",
        author: "User",
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        templates: [templateId],
        previews: {
          [templateId]: `${graph.nodes.length} nodes, ${graph.edges.length} edges`,
        },
        requiredNodeTypes,
        requiredProviders: requiredProviders.length > 0 ? requiredProviders : undefined,
        source: "user",
      };

      const pack: TemplatePack = {
        manifest,
        templates: {
          [templateId]: graph,
        },
      };

      // Register in loader + persist to localStorage
      if (templatePackLoader.has(pack.manifest.id)) {
        templatePackLoader.unregister(pack.manifest.id);
      }
      templatePackLoader.register(pack);
      persistPack(pack);

      // Serialize and trigger download
      const json = JSON.stringify(pack, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${templateId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export template");
    }
  }, [name, description, category, tagsInput, getGraph, onClose]);

  if (!open) return null;

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className="mx-4 w-full max-w-md overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-neutral-100">
            Save as Template
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
          >
            <XIcon />
          </button>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-3 px-5 py-4">
          {/* Name */}
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-neutral-400">
              Name <span className="text-red-400">*</span>
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Pipeline"
              className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none"
            />
          </label>

          {/* Description */}
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-neutral-400">
              Description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this workflow do?"
              rows={2}
              className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none resize-none"
            />
          </label>

          {/* Category */}
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-neutral-400">
              Category
            </span>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. content-creation, automation"
              className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none"
            />
          </label>

          {/* Tags */}
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-neutral-400">
              Tags <span className="text-neutral-600">(comma-separated)</span>
            </span>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. image, social, export"
              className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none"
            />
          </label>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-neutral-800 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:bg-neutral-800 hover:text-neutral-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/20"
          >
            Export as JSON
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Icons ──

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 3l8 8M11 3l-8 8" />
    </svg>
  );
}
