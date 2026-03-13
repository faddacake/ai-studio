"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Workflow {
  id: string;
  name: string;
  description: string;
  tags: string[];
  isPinned: boolean;
  lastRunStatus: string | null;
  lastRunAt: string | null;
  updatedAt: string;
  createdAt: string;
}

export default function WorkflowsPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [search, setSearch] = useState(() => {
    if (typeof window === "undefined") return "";
    const p = new URLSearchParams(window.location.search);
    return p.get("search") ?? localStorage.getItem("aiStudio.workflow.search") ?? "";
  });
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [tagSaving, setTagSaving] = useState(false);
  const [editingDescId, setEditingDescId] = useState<string | null>(null);
  const [descInput, setDescInput] = useState("");
  const [descSaving, setDescSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const p = new URLSearchParams(window.location.search);
    const urlTag = p.get("tag");
    if (urlTag !== null) return urlTag || null;
    return localStorage.getItem("aiStudio.workflow.tag") || null;
  });
  const [sortBy, setSortBy] = useState<"updated" | "lastRun" | "name">(() => {
    if (typeof window === "undefined") return "updated";
    const p = new URLSearchParams(window.location.search);
    const urlSort = p.get("sort");
    if (urlSort === "lastRun" || urlSort === "name" || urlSort === "updated") return urlSort;
    const v = localStorage.getItem("aiStudio.workflow.sort");
    return (v === "lastRun" || v === "name") ? v : "updated";
  });

  const [copied, setCopied] = useState(false);
  const [pinnedOnly, setPinnedOnly] = useState(() => {
    if (typeof window === "undefined") return false;
    const p = new URLSearchParams(window.location.search);
    if (p.has("pinned")) return p.get("pinned") === "1";
    return localStorage.getItem("aiStudio.workflow.pinned") === "1";
  });
  const [pinningId, setPinningId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkWorking, setBulkWorking] = useState(false);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setBulkDeleteConfirm(false);
  }

  async function handleBulkPin(pin: boolean) {
    setBulkWorking(true);
    try {
      await Promise.all([...selectedIds].map((id) =>
        fetch(`/api/workflows/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPinned: pin }),
        }),
      ));
      setWorkflows((prev) => prev.map((w) => selectedIds.has(w.id) ? { ...w, isPinned: pin } : w));
      clearSelection();
    } finally {
      setBulkWorking(false);
    }
  }

  async function handleBulkDelete() {
    setBulkWorking(true);
    try {
      await Promise.all([...selectedIds].map((id) =>
        fetch(`/api/workflows/${id}`, { method: "DELETE" }),
      ));
      setWorkflows((prev) => prev.filter((w) => !selectedIds.has(w.id)));
      clearSelection();
    } finally {
      setBulkWorking(false);
    }
  }

  async function handleBulkExport() {
    setBulkWorking(true);
    try {
      for (const id of selectedIds) {
        const w = workflows.find((x) => x.id === id);
        if (w) await handleExport(id, w.name);
      }
    } finally {
      setBulkWorking(false);
    }
  }

  async function handleTogglePin(id: string, current: boolean) {
    setPinningId(id);
    try {
      const res = await fetch(`/api/workflows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !current }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setWorkflows((prev) => prev.map((w) => w.id === id ? { ...w, isPinned: !current } : w));
    } finally {
      setPinningId(null);
    }
  }

  async function handleCopyLink() {
    if (typeof navigator === "undefined") return;
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const fetchWorkflows = useCallback(async () => {
    const res = await fetch("/api/workflows");
    if (res.ok) {
      setWorkflows(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

  useEffect(() => {
    if (!openMenuId) return;
    function close() { setOpenMenuId(null); }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpenMenuId(null); }
    document.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenuId]);

  useEffect(() => {
    // Persist to localStorage
    localStorage.setItem("aiStudio.workflow.search", search);
    if (activeTag) localStorage.setItem("aiStudio.workflow.tag", activeTag);
    else localStorage.removeItem("aiStudio.workflow.tag");
    localStorage.setItem("aiStudio.workflow.sort", sortBy);
    if (pinnedOnly) localStorage.setItem("aiStudio.workflow.pinned", "1");
    else localStorage.removeItem("aiStudio.workflow.pinned");
    // Sync URL (replace so search typing doesn't pollute history)
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (activeTag) params.set("tag", activeTag);
    if (sortBy !== "updated") params.set("sort", sortBy);
    if (pinnedOnly) params.set("pinned", "1");
    const qs = params.toString();
    router.replace(qs ? `/workflows?${qs}` : "/workflows");
  }, [search, activeTag, sortBy, pinnedOnly, router]);

  function startRename(id: string, currentName: string) {
    setRenamingId(id);
    setRenameInput(currentName);
    setRenameError(null);
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameInput("");
    setRenameError(null);
  }

  async function commitRename(id: string) {
    const trimmed = renameInput.trim();
    if (!trimmed) { cancelRename(); return; }
    const current = workflows.find((w) => w.id === id)?.name ?? "";
    if (trimmed === current) { cancelRename(); return; }

    setRenameSaving(true);
    setRenameError(null);
    try {
      const res = await fetch(`/api/workflows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setWorkflows((prev) =>
        prev.map((w) => w.id === id ? { ...w, name: trimmed } : w),
      );
      setRenamingId(null);
      setRenameInput("");
    } catch {
      setRenameError("Rename failed — please try again");
    } finally {
      setRenameSaving(false);
    }
  }

  async function handleDuplicate(id: string) {
    setDuplicatingId(id);
    try {
      const res = await fetch(`/api/workflows/${id}/duplicate`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        router.push(`/workflows/${data.id}`);
      }
    } finally {
      setDuplicatingId(null);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/workflows/${id}`, { method: "DELETE" });
    if (res.ok) {
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
      setDeletingId(null);
    } else {
      setDeleteError("Failed to delete — please try again");
      setDeletingId(null);
    }
  }

  async function handleCreate() {
    if (!newName.trim() || creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, description: newDesc }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/workflows/${data.id}`);
      } else {
        const data = await res.json().catch(() => ({}));
        setCreateError(data.message || "Failed to create workflow — please try again");
        setCreating(false);
      }
    } catch {
      setCreateError("Connection error — please try again");
      setCreating(false);
    }
  }

  async function handleExport(id: string, name: string) {
    setExportingId(id);
    try {
      const res = await fetch(`/api/workflows/${id}/export`);
      if (!res.ok) throw new Error(`${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? `${name}.workflow.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingId(null);
    }
  }

  async function handleImport(file: File) {
    setImporting(true);
    setImportError(null);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await file.text());
      } catch {
        setImportError("File is not valid JSON");
        return;
      }
      const res = await fetch("/api/workflows/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/workflows/${data.id}`);
      } else {
        const data = await res.json().catch(() => ({}));
        setImportError(data.message || "Import failed — please try again");
      }
    } catch {
      setImportError("Connection error — please try again");
    } finally {
      setImporting(false);
    }
  }

  function startEditDesc(id: string, current: string) {
    setEditingDescId(id);
    setDescInput(current);
  }

  function cancelEditDesc() {
    setEditingDescId(null);
    setDescInput("");
  }

  async function commitDesc(id: string) {
    const trimmed = descInput.trim();
    setDescSaving(true);
    try {
      const res = await fetch(`/api/workflows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: trimmed }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setWorkflows((prev) => prev.map((w) => w.id === id ? { ...w, description: trimmed } : w));
      setEditingDescId(null);
      setDescInput("");
    } catch {
      // leave edit open so user can retry
    } finally {
      setDescSaving(false);
    }
  }

  function startEditTags(id: string, current: string[]) {
    setEditingTagsId(id);
    setTagInput(current.join(", "));
  }

  function cancelEditTags() {
    setEditingTagsId(null);
    setTagInput("");
  }

  async function commitTags(id: string) {
    const tags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setTagSaving(true);
    try {
      const res = await fetch(`/api/workflows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setWorkflows((prev) => prev.map((w) => w.id === id ? { ...w, tags } : w));
      setEditingTagsId(null);
      setTagInput("");
    } catch {
      // leave edit open so user can retry
    } finally {
      setTagSaving(false);
    }
  }

  const allTags = Array.from(
    new Set(workflows.flatMap((w) => w.tags ?? []).filter(Boolean)),
  ).sort();

  const q = search.trim().toLowerCase();
  const filtered = workflows
    .filter((w) => {
      const matchesSearch = !q ||
        w.name.toLowerCase().includes(q) ||
        (w.description ?? "").toLowerCase().includes(q) ||
        (w.tags ?? []).some((t) => t.toLowerCase().includes(q));
      const matchesTag = activeTag === null || (w.tags ?? []).includes(activeTag);
      const matchesPin = !pinnedOnly || w.isPinned;
      return matchesSearch && matchesTag && matchesPin;
    })
    .slice()
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "lastRun") {
        if (!a.lastRunAt && !b.lastRunAt) return 0;
        if (!a.lastRunAt) return 1;
        if (!b.lastRunAt) return -1;
        return b.lastRunAt.localeCompare(a.lastRunAt);
      }
      // default: updated
      return b.updatedAt.localeCompare(a.updatedAt);
    });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.metaKey || e.ctrlKey) && e.key === "a") {
        e.preventDefault();
        setSelectedIds(new Set(filtered.map((w) => w.id)));
      }
      if (e.key === "Escape") {
        setSelectedIds(new Set());
        setBulkDeleteConfirm(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filtered]);

  return (
    <div style={{ padding: 32 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: workflows.length > 0 ? 16 : 32,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text-primary)" }}>
          Workflows
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label
            style={{
              padding: "10px 16px",
              backgroundColor: "transparent",
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: importing ? "default" : "pointer",
              opacity: importing ? 0.6 : 1,
            }}
          >
            {importing ? "Importing…" : "Import"}
            <input
              type="file"
              accept=".json"
              style={{ display: "none" }}
              disabled={importing}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) handleImport(file);
              }}
            />
          </label>
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: "10px 20px",
              backgroundColor: "var(--color-accent)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + New Workflow
          </button>
        </div>
      </div>

      {workflows.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: allTags.length > 0 ? 12 : 20 }}>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workflows…"
            style={{
              flex: "0 0 auto",
              width: 280,
              padding: "8px 12px",
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              color: "var(--color-text-primary)",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
            Sort by
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "updated" | "lastRun" | "name")}
              style={{
                padding: "6px 10px",
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                color: "var(--color-text-primary)",
                fontSize: 13,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="updated">Last updated</option>
              <option value="lastRun">Last run</option>
              <option value="name">Name A–Z</option>
            </select>
          </label>
          <button
            onClick={handleCopyLink}
            style={{
              padding: "6px 12px", fontSize: 13,
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              color: copied ? "var(--color-accent)" : "var(--color-text-muted)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "color 150ms ease",
            }}
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
          <button
            onClick={() => setPinnedOnly((v) => !v)}
            style={{
              padding: "6px 12px", fontSize: 13,
              backgroundColor: pinnedOnly ? "var(--color-accent)" : "var(--color-surface)",
              border: "1px solid",
              borderColor: pinnedOnly ? "var(--color-accent)" : "var(--color-border)",
              borderRadius: 8,
              color: pinnedOnly ? "#fff" : "var(--color-text-muted)",
              cursor: "pointer",
              fontWeight: pinnedOnly ? 600 : 400,
              whiteSpace: "nowrap",
            }}
          >
            📌 Pinned
          </button>
        </div>
      )}

      {allTags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
          <button
            onClick={() => setActiveTag(null)}
            style={{
              fontSize: 12, padding: "3px 10px", borderRadius: 6, border: "1px solid var(--color-border)",
              backgroundColor: activeTag === null ? "var(--color-text-secondary)" : "var(--color-surface)",
              color: activeTag === null ? "var(--color-bg-primary)" : "var(--color-text-secondary)",
              cursor: "pointer", fontWeight: activeTag === null ? 600 : 400,
            }}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              style={{
                fontSize: 12, padding: "3px 10px", borderRadius: 6, border: "1px solid",
                borderColor: activeTag === tag ? "var(--color-accent)" : "var(--color-border)",
                backgroundColor: activeTag === tag ? "var(--color-accent)" : "var(--color-surface)",
                color: activeTag === tag ? "#fff" : "var(--color-text-secondary)",
                cursor: "pointer", fontWeight: activeTag === tag ? 600 : 400,
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {(deleteError || importError) && (
        <div style={{
          marginBottom: 16, padding: "10px 14px", borderRadius: 8,
          backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
          fontSize: 13, color: "var(--color-error)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          {importError || deleteError}
          <button
            onClick={() => { setDeleteError(null); setImportError(null); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-error)", fontSize: 16, lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      )}

      {loading ? (
        <p style={{ color: "var(--color-text-muted)" }}>Loading...</p>
      ) : workflows.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 20px",
            border: "1px dashed var(--color-border)",
            borderRadius: 12,
            backgroundColor: "var(--color-surface)",
          }}
        >
          <p style={{ fontSize: 16, color: "var(--color-text-secondary)", marginBottom: 4 }}>
            No workflows yet.
          </p>
          <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
            Create your first one to get started.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 20px" }}>
          <p style={{ fontSize: 16, color: "var(--color-text-secondary)", marginBottom: 16 }}>
            {pinnedOnly && !search.trim() && !activeTag
              ? "No pinned workflows."
              : search.trim() && activeTag
              ? "No workflows match this search and tag combination."
              : search.trim()
              ? "No workflows match your search."
              : "No workflows found with this tag."}
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
            {search.trim() && (
              <button
                onClick={() => setSearch("")}
                style={{
                  padding: "7px 16px", fontSize: 13,
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8, color: "var(--color-text-secondary)",
                  cursor: "pointer",
                }}
              >
                Clear Search
              </button>
            )}
            {activeTag && (
              <button
                onClick={() => setActiveTag(null)}
                style={{
                  padding: "7px 16px", fontSize: 13,
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8, color: "var(--color-text-secondary)",
                  cursor: "pointer",
                }}
              >
                Clear Filter
              </button>
            )}
            {pinnedOnly && (
              <button
                onClick={() => setPinnedOnly(false)}
                style={{
                  padding: "7px 16px", fontSize: 13,
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8, color: "var(--color-text-secondary)",
                  cursor: "pointer",
                }}
              >
                Show All
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
        {selectedIds.size > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
            marginBottom: 12, padding: "10px 14px",
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-accent)",
            borderRadius: 10, fontSize: 13,
          }}>
            <span style={{ color: "var(--color-accent)", fontWeight: 600 }}>
              {selectedIds.size} selected
            </span>
            <button
              onClick={() => setSelectedIds(new Set(filtered.map((w) => w.id)))}
              style={{ fontSize: 12, color: "var(--color-text-muted)", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}
            >
              Select all ({filtered.length})
            </button>
            <span style={{ color: "var(--color-border)" }}>|</span>
            {bulkDeleteConfirm ? (
              <>
                <span style={{ color: "var(--color-error)", fontWeight: 500 }}>
                  Delete {selectedIds.size} workflow{selectedIds.size > 1 ? "s" : ""}?
                </span>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkWorking}
                  style={{ fontSize: 12, fontWeight: 600, color: "var(--color-error)", background: "none", border: "none", cursor: bulkWorking ? "default" : "pointer", padding: "2px 6px" }}
                >
                  {bulkWorking ? "Deleting…" : "Yes, delete"}
                </button>
                <button
                  onClick={() => setBulkDeleteConfirm(false)}
                  disabled={bulkWorking}
                  style={{ fontSize: 12, color: "var(--color-text-muted)", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleBulkPin(true)}
                  disabled={bulkWorking}
                  style={{ fontSize: 12, color: "var(--color-text-muted)", background: "none", border: "none", cursor: bulkWorking ? "default" : "pointer", padding: "2px 6px" }}
                >
                  Pin
                </button>
                <button
                  onClick={() => handleBulkPin(false)}
                  disabled={bulkWorking}
                  style={{ fontSize: 12, color: "var(--color-text-muted)", background: "none", border: "none", cursor: bulkWorking ? "default" : "pointer", padding: "2px 6px" }}
                >
                  Unpin
                </button>
                <button
                  onClick={handleBulkExport}
                  disabled={bulkWorking}
                  style={{ fontSize: 12, color: "var(--color-text-muted)", background: "none", border: "none", cursor: bulkWorking ? "default" : "pointer", padding: "2px 6px" }}
                >
                  {bulkWorking ? "Exporting…" : "Export"}
                </button>
                <button
                  onClick={() => setBulkDeleteConfirm(true)}
                  disabled={bulkWorking}
                  style={{ fontSize: 12, color: "var(--color-error)", background: "none", border: "none", cursor: bulkWorking ? "default" : "pointer", padding: "2px 6px" }}
                >
                  Delete
                </button>
                <span style={{ color: "var(--color-border)" }}>|</span>
                <button
                  onClick={clearSelection}
                  style={{ fontSize: 12, color: "var(--color-text-muted)", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}
                >
                  Clear selection
                </button>
              </>
            )}
            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--color-text-muted)", whiteSpace: "nowrap", paddingLeft: 8 }}>
              ⌘A · Esc
            </span>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((w) => (
            <Link
              key={w.id}
              href={`/workflows/${w.id}`}
              style={{
                display: "block",
                padding: 16,
                backgroundColor: selectedIds.has(w.id) ? "var(--color-accent)0d" : "var(--color-surface)",
                border: `1px solid ${selectedIds.has(w.id) ? "var(--color-accent)" : "var(--color-border)"}`,
                borderRadius: 10,
                textDecoration: "none",
                transition: "background-color 100ms ease",
              }}
              onMouseEnter={(e) => {
                if (!selectedIds.has(w.id)) e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = selectedIds.has(w.id) ? "var(--color-accent)0d" : "var(--color-surface)";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSelect(w.id); }}
                  style={{ marginRight: 10, flexShrink: 0, cursor: "pointer", display: "flex", alignItems: "center" }}
                >
                  <input
                    type="checkbox"
                    readOnly
                    checked={selectedIds.has(w.id)}
                    style={{ width: 15, height: 15, cursor: "pointer", accentColor: "var(--color-accent)" }}
                  />
                </span>
                {renamingId === w.id ? (
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  >
                    <input
                      // eslint-disable-next-line jsx-a11y/no-autofocus
                      autoFocus
                      value={renameInput}
                      onChange={(e) => setRenameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); commitRename(w.id); }
                        if (e.key === "Escape") { e.preventDefault(); cancelRename(); }
                      }}
                      disabled={renameSaving}
                      style={{
                        flex: 1, maxWidth: 320,
                        padding: "3px 8px",
                        backgroundColor: "var(--color-bg-primary)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 6,
                        color: "var(--color-text-primary)",
                        fontSize: 15,
                        fontWeight: 600,
                        outline: "none",
                      }}
                    />
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); commitRename(w.id); }}
                      disabled={renameSaving || !renameInput.trim()}
                      style={{ fontSize: 12, fontWeight: 600, color: "var(--color-accent)", background: "none", border: "none", cursor: renameSaving ? "default" : "pointer", padding: "2px 4px" }}
                    >
                      {renameSaving ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); cancelRename(); }}
                      disabled={renameSaving}
                      style={{ fontSize: 12, color: "var(--color-text-muted)", background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}
                    >
                      Cancel
                    </button>
                    {renameError && (
                      <span style={{ fontSize: 12, color: "var(--color-error)" }}>{renameError}</span>
                    )}
                  </span>
                ) : (
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 15, color: "var(--color-text-primary)" }}>
                      {w.name}
                    </span>
                    {w.isPinned && (
                      <span style={{ fontSize: 12, color: "var(--color-accent)", lineHeight: 1 }} title="Pinned">📌</span>
                    )}
                  </span>
                )}
                {w.lastRunStatus && renamingId !== w.id && (
                  <StatusBadge status={w.lastRunStatus} />
                )}
              </div>
              {editingDescId === w.id ? (
                <span
                  style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                >
                  <textarea
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus
                    value={descInput}
                    onChange={(e) => setDescInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") { e.preventDefault(); cancelEditDesc(); }
                      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); commitDesc(w.id); }
                    }}
                    disabled={descSaving}
                    rows={3}
                    placeholder="Add a description…"
                    style={{
                      width: "100%", padding: "6px 8px",
                      backgroundColor: "var(--color-bg-primary)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 6, color: "var(--color-text-primary)",
                      fontSize: 13, resize: "vertical", outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); commitDesc(w.id); }}
                      disabled={descSaving}
                      style={{ fontSize: 12, fontWeight: 600, color: "var(--color-accent)", background: "none", border: "none", cursor: descSaving ? "default" : "pointer", padding: "2px 4px" }}
                    >
                      {descSaving ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); cancelEditDesc(); }}
                      disabled={descSaving}
                      style={{ fontSize: 12, color: "var(--color-text-muted)", background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}
                    >
                      Cancel
                    </button>
                    <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>⌘↵ to save · Esc to cancel</span>
                  </span>
                </span>
              ) : w.description ? (
                <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
                  {w.description}
                </p>
              ) : null}
              {/* Tags row */}
              {editingTagsId === w.id ? (
                <span
                  style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                >
                  <input
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); commitTags(w.id); }
                      if (e.key === "Escape") { e.preventDefault(); cancelEditTags(); }
                    }}
                    disabled={tagSaving}
                    placeholder="social, video, draft"
                    style={{
                      padding: "3px 8px",
                      backgroundColor: "var(--color-bg-primary)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 6,
                      color: "var(--color-text-primary)",
                      fontSize: 12,
                      outline: "none",
                      minWidth: 180,
                    }}
                  />
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); commitTags(w.id); }}
                    disabled={tagSaving}
                    style={{ fontSize: 11, fontWeight: 600, color: "var(--color-accent)", background: "none", border: "none", cursor: tagSaving ? "default" : "pointer", padding: "2px 4px" }}
                  >
                    {tagSaving ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); cancelEditTags(); }}
                    disabled={tagSaving}
                    style={{ fontSize: 11, color: "var(--color-text-muted)", background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}
                  >
                    Cancel
                  </button>
                </span>
              ) : (w.tags ?? []).length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                  {(w.tags ?? []).map((tag) => (
                    <span
                      key={tag}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTag(tag); }}
                      style={{
                        fontSize: 11,
                        padding: "2px 7px",
                        borderRadius: 4,
                        backgroundColor: activeTag === tag ? "var(--color-accent)" : "var(--color-accent)18",
                        color: activeTag === tag ? "#fff" : "var(--color-accent)",
                        border: `1px solid ${activeTag === tag ? "var(--color-accent)" : "var(--color-accent)30"}`,
                        cursor: "pointer",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              <LastRunIndicator status={w.lastRunStatus} lastRunAt={w.lastRunAt} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: 0 }}>
                  Updated {new Date(w.updatedAt).toLocaleDateString()}
                </p>
                {deletingId === w.id ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Delete?</span>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(w.id); }}
                      style={{ fontSize: 12, fontWeight: 600, color: "var(--color-error)", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}
                    >
                      Yes
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingId(null); }}
                      style={{ fontSize: 12, color: "var(--color-text-muted)", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}
                    >
                      No
                    </button>
                  </span>
                ) : (
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <a
                      href={`/workflows/${w.id}/history`}
                      onClick={(e) => e.stopPropagation()}
                      style={{ fontSize: 12, color: "var(--color-text-muted)", textDecoration: "none", padding: "2px 6px" }}
                    >
                      History
                    </a>
                    <span style={{ fontSize: 12, color: "var(--color-border)" }}>·</span>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleTogglePin(w.id, w.isPinned); }}
                      disabled={pinningId === w.id}
                      style={{ fontSize: 12, color: w.isPinned ? "var(--color-accent)" : "var(--color-text-muted)", background: "none", border: "none", cursor: pinningId === w.id ? "default" : "pointer", padding: "2px 6px" }}
                    >
                      {pinningId === w.id ? "…" : w.isPinned ? "Unpin" : "Pin"}
                    </button>
                    <span style={{ fontSize: 12, color: "var(--color-border)" }}>·</span>
                    {/* Overflow menu */}
                    <span style={{ position: "relative" }}>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenMenuId(openMenuId === w.id ? null : w.id); }}
                        style={{ fontSize: 15, color: "var(--color-text-muted)", background: "none", border: "none", cursor: "pointer", padding: "2px 8px", letterSpacing: 2, lineHeight: 1 }}
                        title="More actions"
                      >
                        ···
                      </button>
                      {openMenuId === w.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: "absolute", bottom: "calc(100% + 4px)", right: 0,
                            backgroundColor: "var(--color-bg-secondary)",
                            border: "1px solid var(--color-border)",
                            borderRadius: 8, zIndex: 200,
                            minWidth: 150, boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
                            overflow: "hidden",
                          }}
                        >
                          {(
                            [
                              { label: "Rename", action: () => { setOpenMenuId(null); startRename(w.id, w.name); } },
                              { label: "Description", action: () => { setOpenMenuId(null); startEditDesc(w.id, w.description ?? ""); } },
                              { label: "Tags", action: () => { setOpenMenuId(null); startEditTags(w.id, w.tags ?? []); } },
                              { label: duplicatingId === w.id ? "Copying…" : "Duplicate", action: () => { setOpenMenuId(null); handleDuplicate(w.id); }, disabled: duplicatingId === w.id },
                              { label: exportingId === w.id ? "Exporting…" : "Export", action: () => { setOpenMenuId(null); handleExport(w.id, w.name); }, disabled: exportingId === w.id },
                              { label: "Delete", action: () => { setOpenMenuId(null); setDeletingId(w.id); }, danger: true },
                            ] as { label: string; action: () => void; disabled?: boolean; danger?: boolean }[]
                          ).map(({ label, action, disabled, danger }) => (
                            <button
                              key={label}
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!disabled) action(); }}
                              disabled={disabled}
                              style={{
                                display: "block", width: "100%", textAlign: "left",
                                padding: "8px 14px", fontSize: 13,
                                color: danger ? "var(--color-error)" : disabled ? "var(--color-text-muted)" : "var(--color-text-secondary)",
                                background: "none", border: "none",
                                cursor: disabled ? "default" : "pointer",
                                borderBottom: "1px solid var(--color-border)",
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </span>
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
        </>
      )}

      {/* Create Workflow Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
          onClick={() => { setShowModal(false); setCreateError(null); }}
        >
          <div
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              padding: 24,
              width: 420,
              maxWidth: "90vw",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 20 }}>
              New Workflow
            </h2>
            {createError && (
              <div style={{
                marginBottom: 16, padding: "10px 14px", borderRadius: 8,
                backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                fontSize: 13, color: "var(--color-error)",
              }}>
                {createError}
              </div>
            )}
            <label style={{ display: "block", marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>
                Name
              </span>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="My workflow"
                autoFocus
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  color: "var(--color-text-primary)",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newName.trim()) handleCreate();
                }}
              />
            </label>
            <label style={{ display: "block", marginBottom: 20 }}>
              <span style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>
                Description (optional)
              </span>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="What does this workflow do?"
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  color: "var(--color-text-primary)",
                  fontSize: 14,
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => { setShowModal(false); setCreateError(null); }}
                style={{
                  padding: "9px 18px",
                  backgroundColor: "transparent",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  color: "var(--color-text-secondary)",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                style={{
                  padding: "9px 18px",
                  backgroundColor: newName.trim() ? "var(--color-accent)" : "var(--color-surface)",
                  border: "none",
                  borderRadius: 8,
                  color: newName.trim() ? "#fff" : "var(--color-text-muted)",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: newName.trim() ? "pointer" : "default",
                }}
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Last-run dot + label ───────────────────────────────────────────────────

const RUN_DOT_COLOR: Record<string, string> = {
  completed:       "#4ade80",
  running:         "#60a5fa",
  failed:          "#f87171",
  partial_failure: "#f87171",
  cancelled:       "#737373",
  budget_exceeded: "#facc15",
  pending:         "#facc15",
};

function formatTimeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function LastRunIndicator({
  status,
  lastRunAt,
}: {
  status: string | null;
  lastRunAt: string | null;
}) {
  const dotColor = status ? (RUN_DOT_COLOR[status] ?? "#737373") : undefined;
  const label    = status ? status.replace("_", " ") : null;
  const time     = lastRunAt ? formatTimeAgo(lastRunAt) : null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
      {dotColor ? (
        <>
          <span style={{
            display: "inline-block", width: 7, height: 7,
            borderRadius: "50%", backgroundColor: dotColor, flexShrink: 0,
          }} />
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)", textTransform: "capitalize" }}>
            {label}
          </span>
          {time && (
            <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>· {time}</span>
          )}
        </>
      ) : (
        <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>No runs yet</span>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    completed: "var(--color-success)",
    running: "var(--color-accent)",
    failed: "var(--color-error)",
    pending: "var(--color-warning)",
  };
  const color = colorMap[status] || "var(--color-text-muted)";
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 8px",
        borderRadius: 6,
        backgroundColor: color + "20",
        color,
        textTransform: "capitalize",
      }}
    >
      {status.replace("_", " ")}
    </span>
  );
}
