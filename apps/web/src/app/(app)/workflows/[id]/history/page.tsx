"use client";

import { useEffect, useState, use, useCallback, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { extractImageRefs, extractVideoRefs } from "@/lib/artifactRefs";
import { ArtifactPreviewPanel } from "@/components/prompt/ArtifactPreviewPanel";
import type { ArtifactPreviewable } from "@/components/prompt/ArtifactPreviewPanel";
import { ArtifactLineage } from "@/components/history/ArtifactLineage";
import { ActivityTimeline } from "@/components/history/ActivityTimeline";

interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  provenanceNodeCount: number;
  nodeTypes: string[];
  provenanceLinks: Array<{ sourceRunId: string; artifactPath: string }>;
}

interface RunRecord {
  id: string;
  workflowId: string;
  status: string;
  totalCost: number | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  graphStats: GraphStats;
}

interface RevisionGraphStats {
  nodeCount: number;
  edgeCount: number;
  nodeIds: string[];
}

interface RevisionRecord {
  id: string;
  workflowId: string;
  label: string | null;
  createdAt: string;
  graphStats: RevisionGraphStats;
}

interface RevisionDiff {
  nodeCountDelta: number;
  edgeCountDelta: number;
  addedNodeCount: number;
  removedNodeCount: number;
}

interface FragmentRecord {
  id: string;
  name: string;
  createdAt: string;
  nodeCount?: number;
}

function diffRevisions(a: RevisionRecord, b: RevisionRecord): RevisionDiff {
  const aIds = new Set(a.graphStats.nodeIds);
  const bIds = new Set(b.graphStats.nodeIds);
  return {
    nodeCountDelta: b.graphStats.nodeCount - a.graphStats.nodeCount,
    edgeCountDelta: b.graphStats.edgeCount - a.graphStats.edgeCount,
    addedNodeCount: [...bIds].filter((id) => !aIds.has(id)).length,
    removedNodeCount: [...aIds].filter((id) => !bIds.has(id)).length,
  };
}

const STATUS_COLOR: Record<string, string> = {
  completed:       "#4ade80",
  failed:          "#f87171",
  partial_failure: "#f87171",
  cancelled:       "#737373",
  budget_exceeded: "#facc15",
  running:         "#60a5fa",
  pending:         "#a3a3a3",
};

function CostSparkline({ runs }: { runs: RunRecord[] }) {
  // oldest-first, only runs with positive cost
  const costs = [...runs].reverse().map((r) => r.totalCost ?? 0).filter((c) => c > 0);
  if (costs.length < 2) return null;

  const W = 120, H = 32, pad = 3;
  const min = Math.min(...costs);
  const max = Math.max(...costs);
  const range = max - min || 1;

  const pts = costs.map((c, i) => {
    const x = (pad + (i / (costs.length - 1)) * (W - pad * 2)).toFixed(1);
    const y = (pad + (1 - (c - min) / range) * (H - pad * 2)).toFixed(1);
    return `${x},${y}`;
  });

  const [fx, fy] = pts[0].split(",");
  const [lx, ly] = pts[pts.length - 1].split(",");

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke="#60a5fa"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.7"
      />
      <circle cx={fx} cy={fy} r="2" fill="#60a5fa" opacity="0.5" />
      <circle cx={lx} cy={ly} r="2.5" fill="#60a5fa" opacity="0.9" />
    </svg>
  );
}

function DurationSparkline({ runs }: { runs: RunRecord[] }) {
  // oldest-first, only runs with a positive measured duration
  const durations = [...runs]
    .reverse()
    .map((r) => (r.startedAt && r.completedAt ? new Date(r.completedAt).getTime() - new Date(r.startedAt).getTime() : 0))
    .filter((d) => d > 0);
  if (durations.length < 2) return null;

  const W = 120, H = 32, pad = 3;
  const min = Math.min(...durations);
  const max = Math.max(...durations);
  const range = max - min || 1;

  const pts = durations.map((d, i) => {
    const x = (pad + (i / (durations.length - 1)) * (W - pad * 2)).toFixed(1);
    const y = (pad + (1 - (d - min) / range) * (H - pad * 2)).toFixed(1);
    return `${x},${y}`;
  });

  const [fx, fy] = pts[0].split(",");
  const [lx, ly] = pts[pts.length - 1].split(",");

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke="#a78bfa"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.7"
      />
      <circle cx={fx} cy={fy} r="2" fill="#a78bfa" opacity="0.5" />
      <circle cx={lx} cy={ly} r="2.5" fill="#a78bfa" opacity="0.9" />
    </svg>
  );
}

function WorkflowInsights({
  runs,
  revisions,
  fragments,
}: {
  runs: RunRecord[];
  revisions: RevisionRecord[];
  fragments: FragmentRecord[];
}) {
  if (runs.length === 0) return null;

  const SUCCESS_STATUSES = new Set(["completed", "success"]);
  const successCount = runs.filter((r) => SUCCESS_STATUSES.has(r.status)).length;
  const successRate = Math.round((successCount / runs.length) * 100);

  const costsValid = runs.map((r) => r.totalCost).filter((c): c is number => c != null && c > 0);
  const avgCost =
    costsValid.length > 0 ? costsValid.reduce((a, b) => a + b, 0) / costsValid.length : null;

  const durationsValid = runs
    .filter((r) => r.startedAt && r.completedAt)
    .map((r) => new Date(r.completedAt!).getTime() - new Date(r.startedAt!).getTime())
    .filter((d) => d > 0);
  const avgDurationMs =
    durationsValid.length > 0
      ? durationsValid.reduce((a, b) => a + b, 0) / durationsValid.length
      : null;
  const avgDurationLabel =
    avgDurationMs == null
      ? "—"
      : avgDurationMs < 1000
      ? `${Math.round(avgDurationMs)}ms`
      : `${(avgDurationMs / 1000).toFixed(1)}s`;

  const lastStatus = runs[0]?.status ?? null;

  const stats: Array<{ label: string; value: string }> = [
    { label: "Runs", value: String(runs.length) },
    { label: "Success", value: `${successRate}%` },
    { label: "Avg cost", value: avgCost != null ? `$${avgCost.toFixed(4)}` : "—" },
    { label: "Avg duration", value: avgDurationLabel },
    { label: "Last status", value: lastStatus ? lastStatus.replace(/_/g, " ") : "—" },
    { label: "Checkpoints", value: String(revisions.length) },
    ...(fragments.length > 0 ? [{ label: "Fragments", value: String(fragments.length) }] : []),
  ];

  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{
        fontSize: 10, color: "var(--color-text-muted)", margin: "0 0 8px",
        textTransform: "uppercase", letterSpacing: "0.06em",
      }}>
        Workflow insights
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 28px" }}>
        {stats.map(({ label, value }) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{
              fontSize: 10, color: "var(--color-text-muted)",
              textTransform: "uppercase", letterSpacing: "0.04em",
            }}>
              {label}
            </span>
            <span style={{ fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500 }}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function durationLabel(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt || !completedAt) return "—";
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

export default function HistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rerunning, setRerunning] = useState(false);
  const [rerunError, setRerunError] = useState<string | null>(null);

  const [compareRunA, setCompareRunA] = useState<string | null>(null);
  const [compareRunB, setCompareRunB] = useState<string | null>(null);
  const [compareArtifact, setCompareArtifact] = useState<{ a: ArtifactPreviewable | null; b: ArtifactPreviewable | null } | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const urlInitializedRef = useRef(false);

  const [revisions, setRevisions] = useState<RevisionRecord[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(true);
  const [revisionsError, setRevisionsError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);

  const [fragments, setFragments] = useState<FragmentRecord[]>([]);
  const revisionsRef = useRef<HTMLDivElement>(null);
  const [runFilter, setRunFilter] = useState("");
  const [copiedRunId, setCopiedRunId] = useState<string | null>(null);
  const [hoveredRunId, setHoveredRunId] = useState<string | null>(null);
  const [keyboardRunId, setKeyboardRunId] = useState<string | null>(null);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const runFilterInputRef = useRef<HTMLInputElement>(null);
  const focusedRunIdRef = useRef<string | null>(null);
  const keyboardRunIdRef = useRef<string | null>(null);
  const filteredRunsRef = useRef<RunRecord[]>([]);
  const rowElsRef = useRef<Map<string, HTMLElement>>(new Map());
  const shortcutHelpRef = useRef<HTMLDivElement | null>(null);
  const shortcutTriggerRef = useRef<HTMLButtonElement | null>(null);
  const shortcutPanelRef = useRef<HTMLDivElement | null>(null);

  const handleDeleteConfirm = useCallback(async (revisionId: string) => {
    setDeletingId(revisionId);
    setConfirmingDeleteId(null);
    try {
      const res = await fetch(`/api/workflows/${id}/revisions/${revisionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`${res.status}`);
      setRevisions((prev) => prev.filter((r) => r.id !== revisionId));
    } finally {
      setDeletingId(null);
    }
  }, [id]);

  const handleRestore = useCallback(async (revisionId: string) => {
    setRestoringId(revisionId);
    try {
      const res = await fetch(`/api/workflows/${id}/revisions/${revisionId}/restore`, { method: "POST" });
      if (!res.ok) throw new Error(`${res.status}`);
      router.push(`/workflows/${id}`);
    } catch {
      setRestoringId(null);
    }
  }, [id, router]);

  async function handleRerun() {
    setRerunning(true);
    setRerunError(null);
    try {
      const res = await fetch(`/api/workflows/${id}/runs`, { method: "POST" });
      if (!res.ok) throw new Error(`${res.status}`);
      router.push(`/workflows/${id}`);
    } catch {
      setRerunError("Failed to start run — please try again");
      setRerunning(false);
    }
  }

  useEffect(() => {
    fetch(`/api/workflows/${id}/runs`)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json() as Promise<RunRecord[]>;
      })
      .then((loaded) => {
        setRuns(loaded);
        // Restore comparison from URL params once, after runs are available to validate IDs.
        if (!urlInitializedRef.current) {
          urlInitializedRef.current = true;
          const runIds = new Set(loaded.map((r) => r.id));
          const paramA = searchParams.get("runA");
          const paramB = searchParams.get("runB");
          if (paramA && runIds.has(paramA)) setCompareRunA(paramA);
          if (paramB && runIds.has(paramB)) setCompareRunB(paramB);
        }
      })
      .catch(() => setError("Failed to load run history"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Sync compare run selection to URL params (replace, not push — no history clutter).
  useEffect(() => {
    if (!urlInitializedRef.current) return;
    const params = new URLSearchParams(searchParams.toString());
    if (compareRunA) params.set("runA", compareRunA); else params.delete("runA");
    if (compareRunB) params.set("runB", compareRunB); else params.delete("runB");
    router.replace(`${pathname}?${params.toString()}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareRunA, compareRunB]);

  useEffect(() => {
    if (!compareRunA || !compareRunB) { setCompareArtifact(null); return; }
    setCompareLoading(true);

    async function fetchFirstArtifact(runId: string): Promise<ArtifactPreviewable | null> {
      const res = await fetch(`/api/workflows/${id}/runs/${runId}/outputs`);
      if (!res.ok) return null;
      const data: { outputs: Array<{ nodeId: string; outputs: Record<string, unknown> }> } = await res.json();
      const run = runs.find((r) => r.id === runId);
      for (const entry of data.outputs ?? []) {
        const vals = Object.values(entry.outputs);
        const imageRefs = vals.flatMap((v) => extractImageRefs(v));
        if (imageRefs.length > 0) {
          const ref = imageRefs[0];
          return {
            modelId: `${runId}-${entry.nodeId}`,
            modelName: run ? `Run ${runId.slice(0, 8)} · ${run.status}` : `Run ${runId.slice(0, 8)}`,
            outputUrl: `/api/artifacts?path=${encodeURIComponent(ref.path)}`,
            cost: run?.totalCost ?? undefined,
          };
        }
        const videoRefs = vals.flatMap((v) => extractVideoRefs(v));
        if (videoRefs.length > 0) {
          const ref = videoRefs[0];
          return {
            modelId: `${runId}-${entry.nodeId}`,
            modelName: run ? `Run ${runId.slice(0, 8)} · ${run.status}` : `Run ${runId.slice(0, 8)}`,
            outputUrl: `/api/artifacts?path=${encodeURIComponent(ref.path)}`,
            mimeType: ref.mimeType,
            cost: run?.totalCost ?? undefined,
          };
        }
      }
      return null;
    }

    Promise.all([fetchFirstArtifact(compareRunA), fetchFirstArtifact(compareRunB)])
      .then(([a, b]) => setCompareArtifact({ a, b }))
      .catch(() => setCompareArtifact({ a: null, b: null }))
      .finally(() => setCompareLoading(false));
  }, [compareRunA, compareRunB, id, runs]);

  useEffect(() => {
    fetch(`/api/workflows/${id}/revisions`)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json() as Promise<RevisionRecord[]>;
      })
      .then(setRevisions)
      .catch(() => setRevisionsError("Failed to load revisions"))
      .finally(() => setRevisionsLoading(false));
  }, [id]);

  useEffect(() => {
    fetch("/api/fragments")
      .then((res) => (res.ok ? (res.json() as Promise<FragmentRecord[]>) : Promise.resolve([])))
      .then(setFragments)
      .catch(() => { /* non-fatal — timeline just omits fragment events */ });
  }, []);

  // Cmd+F / Ctrl+F → focus the run filter input instead of browser find
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "f" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const el = runFilterInputRef.current;
        if (el) { el.focus(); el.select(); }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Enter → navigate to focused run's detail page
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Enter") return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      const rid = focusedRunIdRef.current;
      if (!rid) return;
      router.push(`/workflows/${id}/history/${rid}`);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // R → re-run the currently hovered workflow
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "r" && e.key !== "R") return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (!focusedRunIdRef.current) return;
      if (rerunning) return;
      handleRerun();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rerunning]);

  // C → copy focused run ID to clipboard
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "c" && e.key !== "C") return;
      if (e.metaKey || e.ctrlKey) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      const rid = focusedRunIdRef.current;
      if (!rid) return;
      navigator.clipboard.writeText(rid).then(() => {
        setCopiedRunId(rid);
        setTimeout(() => setCopiedRunId((prev) => prev === rid ? null : prev), 1500);
      }).catch(() => {});
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!showShortcutHelp) return;
    const t = setTimeout(() => { shortcutPanelRef.current?.focus(); }, 0);
    return () => clearTimeout(t);
  }, [showShortcutHelp]);

  useEffect(() => {
    if (!showShortcutHelp) return;
    function onMouseDown(e: MouseEvent) {
      if (shortcutHelpRef.current && !shortcutHelpRef.current.contains(e.target as Node)) {
        setShowShortcutHelp(false);
        shortcutTriggerRef.current?.focus();
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setShowShortcutHelp(false); shortcutTriggerRef.current?.focus(); }
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [showShortcutHelp]);

  // ↑ / ↓ → navigate between run rows
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      const rows = filteredRunsRef.current;
      if (rows.length === 0) return;
      e.preventDefault();
      const currentId = focusedRunIdRef.current;
      const idx = currentId ? rows.findIndex((r) => r.id === currentId) : -1;
      const nextIdx = e.key === "ArrowDown"
        ? (idx === -1 ? 0 : Math.min(idx + 1, rows.length - 1))
        : (idx === -1 ? rows.length - 1 : Math.max(idx - 1, 0));
      const nextId = rows[nextIdx]?.id ?? null;
      focusedRunIdRef.current = nextId;
      keyboardRunIdRef.current = nextId;
      setKeyboardRunId(nextId);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Scroll keyboard-selected run into view
  useEffect(() => {
    if (keyboardRunId) {
      rowElsRef.current.get(keyboardRunId)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [keyboardRunId]);

  const runFilterQ = runFilter.trim().toLowerCase();
  const filteredRuns = runFilterQ
    ? runs.filter((r) =>
        r.status.replace(/_/g, " ").includes(runFilterQ) ||
        r.id.toLowerCase().startsWith(runFilterQ),
      )
    : runs;
  filteredRunsRef.current = filteredRuns;

  // Clear stale keyboard selection when the selected run is no longer in the filtered list
  if (keyboardRunId && !filteredRuns.some((r) => r.id === keyboardRunId)) {
    setKeyboardRunId(null);
    keyboardRunIdRef.current = null;
    if (focusedRunIdRef.current === keyboardRunId) focusedRunIdRef.current = null;
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 860 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <Link
          href="/workflows"
          style={{ fontSize: 13, color: "var(--color-text-muted)", textDecoration: "none" }}
        >
          ← Workflows
        </Link>
        <span style={{ color: "var(--color-border)" }}>·</span>
        <Link
          href={`/workflows/${id}`}
          style={{ fontSize: 13, color: "var(--color-text-muted)", textDecoration: "none" }}
        >
          Editor
        </Link>
        <span style={{ color: "var(--color-border)" }}>·</span>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
          Run History
        </h1>
      </div>

      {loading && (
        <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Loading…</p>
      )}

      {error && (
        <p style={{ fontSize: 13, color: "var(--color-error)" }}>{error}</p>
      )}

      {rerunError && (
        <p style={{ fontSize: 13, color: "var(--color-error)", marginBottom: 12 }}>{rerunError}</p>
      )}

      {/* ── Activity Timeline ──────────────────────────────────────────── */}
      {(!loading || !revisionsLoading) && (
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 12 }}>
            Activity Timeline
          </h2>
          <ActivityTimeline
            workflowId={id}
            runs={runs}
            revisions={revisions}
            fragments={fragments}
            onCheckpointClick={() => {
              revisionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          />
        </div>
      )}

      {!loading && !error && runs.length > 0 && (() => {
        const totalCost = runs.reduce((sum, r) => sum + (r.totalCost ?? 0), 0);
        const completed = runs.filter((r) => r.status === "completed").length;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
              {runs.length} {runs.length === 1 ? "run" : "runs"} · {completed} completed · Total cost: ${totalCost.toFixed(4)}
              {!revisionsLoading && revisions.length > 0 && (
                <> · {revisions.length} {revisions.length === 1 ? "checkpoint" : "checkpoints"}</>
              )}
            </p>
            {(compareRunA || compareRunB) && (
              <button
                onClick={() => { setCompareRunA(null); setCompareRunB(null); }}
                style={{
                  fontSize: 12, background: "none", border: "none", padding: 0,
                  color: "var(--color-accent)", cursor: "pointer",
                }}
              >
                Clear compare
              </button>
            )}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Duration trend</span>
                <DurationSparkline runs={runs} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Cost trend</span>
                <CostSparkline runs={runs} />
              </div>
              <div ref={shortcutHelpRef} style={{ position: "relative" }}>
                <button
                  ref={shortcutTriggerRef}
                  onClick={() => setShowShortcutHelp((v) => !v)}
                  title="Keyboard shortcuts"
                  aria-label="Keyboard shortcuts"
                  aria-haspopup="dialog"
                  aria-expanded={showShortcutHelp}
                  style={{
                    width: 32, height: 32,
                    backgroundColor: showShortcutHelp ? "var(--color-surface-hover)" : "transparent",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    color: "var(--color-text-muted)",
                    fontSize: 14, fontWeight: 600,
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  ?
                </button>
                {showShortcutHelp && (
                  <div
                    ref={shortcutPanelRef}
                    role="dialog"
                    aria-label="Keyboard shortcuts reference"
                    aria-modal="false"
                    tabIndex={-1}
                    style={{
                      position: "absolute", top: "calc(100% + 8px)", right: 0,
                      backgroundColor: "var(--color-bg-secondary)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 10,
                      padding: "12px 16px",
                      zIndex: 300,
                      minWidth: 220,
                      boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Keyboard Shortcuts
                    </div>
                    {([
                      ["↑ / ↓", "Navigate runs"],
                      ["Enter", "Open focused run"],
                      ["C", "Copy focused run ID"],
                      ["R", "Re-run workflow"],
                      ["⌘F / Ctrl F", "Focus filter"],
                    ] as [string, string][]).map(([key, desc]) => (
                      <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <kbd style={{
                          display: "inline-block", minWidth: 52,
                          padding: "2px 6px", borderRadius: 5,
                          backgroundColor: "var(--color-surface)",
                          border: "1px solid var(--color-border)",
                          fontSize: 11, fontFamily: "inherit", fontWeight: 600,
                          color: "var(--color-text-secondary)",
                          textAlign: "center",
                        }}>
                          {key}
                        </kbd>
                        <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{desc}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Workflow Insights ───────────────────────────────────────────── */}
      {!loading && !error && runs.length > 0 && (
        <WorkflowInsights runs={runs} revisions={revisions} fragments={fragments} />
      )}

      {/* ── Run filter input ────────────────────────────────────────────── */}
      {!loading && !error && runs.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <input
            ref={runFilterInputRef}
            type="search"
            value={runFilter}
            onChange={(e) => setRunFilter(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                if (runFilter) { e.preventDefault(); setRunFilter(""); }
                else (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="Filter runs… (⌘F)"
            style={{
              width: 260,
              padding: "7px 12px",
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              color: "var(--color-text-primary)",
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
      )}

      {!loading && !error && runs.length === 0 && (
        <div style={{
          padding: "60px 20px", textAlign: "center",
          border: "1px dashed var(--color-border)", borderRadius: 12,
          backgroundColor: "var(--color-surface)",
        }}>
          <p style={{ fontSize: 15, color: "var(--color-text-secondary)", marginBottom: 4 }}>
            No runs yet.
          </p>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
            Run the workflow from the editor to see history here.
          </p>
        </div>
      )}

      {/* ── Revision Checkpoints ────────────────────────────────────────── */}
      <div ref={revisionsRef} style={{ marginTop: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
            Revision Checkpoints
          </h2>
          {revisions.length >= 2 && (
            <button
              onClick={() => { setCompareA(null); setCompareB(null); }}
              style={{
                fontSize: 12, background: "none", border: "none", padding: 0,
                color: (compareA || compareB) ? "var(--color-accent)" : "var(--color-text-muted)",
                cursor: "pointer",
              }}
            >
              {(compareA || compareB) ? "Clear compare" : "Compare…"}
            </button>
          )}
        </div>

        {/* Compare summary panel */}
        {compareA && compareB && (() => {
          const revA = revisions.find((r) => r.id === compareA);
          const revB = revisions.find((r) => r.id === compareB);
          if (!revA || !revB) return null;
          const diff = diffRevisions(revA, revB);
          return (
            <div style={{
              marginBottom: 16, padding: "14px 16px",
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)", borderRadius: 10,
            }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 8 }}>
                Compare: <em style={{ fontWeight: 400 }}>{revA.label ?? "Checkpoint"}</em> → <em style={{ fontWeight: 400 }}>{revB.label ?? "Checkpoint"}</em>
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[
                  { label: "Nodes", delta: diff.nodeCountDelta },
                  { label: "Edges", delta: diff.edgeCountDelta },
                ].map(({ label, delta }) => (
                  <span key={label} style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 4,
                    border: "1px solid var(--color-border)",
                    backgroundColor: "var(--color-bg-primary)",
                    color: delta === 0 ? "var(--color-text-muted)" : delta > 0 ? "#86efac" : "#fca5a5",
                    fontWeight: delta !== 0 ? 600 : 400,
                  }}>
                    {label}: {delta > 0 ? `+${delta}` : delta}
                  </span>
                ))}
                {diff.addedNodeCount > 0 && (
                  <span style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 4,
                    border: "1px solid rgba(134,239,172,0.3)",
                    backgroundColor: "rgba(20,83,45,0.25)", color: "#86efac",
                  }}>
                    +{diff.addedNodeCount} added
                  </span>
                )}
                {diff.removedNodeCount > 0 && (
                  <span style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 4,
                    border: "1px solid rgba(252,165,165,0.3)",
                    backgroundColor: "rgba(127,29,29,0.25)", color: "#fca5a5",
                  }}>
                    −{diff.removedNodeCount} removed
                  </span>
                )}
                {diff.nodeCountDelta === 0 && diff.edgeCountDelta === 0 && diff.addedNodeCount === 0 && diff.removedNodeCount === 0 && (
                  <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>No structural changes</span>
                )}
              </div>
            </div>
          );
        })()}

        {revisionsLoading && (
          <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Loading…</p>
        )}

        {revisionsError && (
          <p style={{ fontSize: 13, color: "var(--color-error)" }}>{revisionsError}</p>
        )}

        {!revisionsLoading && !revisionsError && revisions.length === 0 && (
          <div style={{
            padding: "40px 20px", textAlign: "center",
            border: "1px dashed var(--color-border)", borderRadius: 12,
            backgroundColor: "var(--color-surface)",
          }}>
            <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 4 }}>
              No checkpoints yet.
            </p>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
              Use <strong style={{ color: "var(--color-text-secondary)" }}>Save Revision</strong> in the canvas toolbar to snapshot the current graph.
            </p>
          </div>
        )}

        {!revisionsLoading && !revisionsError && revisions.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {revisions.map((rev) => (
              <div
                key={rev.id}
                style={{
                  padding: "14px 16px",
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 10,
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: "4px 24px",
                  alignItems: "center",
                }}
              >
                {/* Left: label + graph stats */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
                    {rev.label ?? "Checkpoint"}
                  </span>
                  <code style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                    {rev.id.slice(0, 8)}
                  </code>
                  {rev.graphStats.nodeCount > 0 && (
                    <span style={{
                      fontSize: 10, color: "var(--color-text-muted)",
                      padding: "1px 6px", borderRadius: 4,
                      border: "1px solid var(--color-border)",
                      backgroundColor: "var(--color-bg-primary)",
                    }}>
                      {rev.graphStats.nodeCount} node{rev.graphStats.nodeCount !== 1 ? "s" : ""} · {rev.graphStats.edgeCount} edge{rev.graphStats.edgeCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {/* Right: compare + restore + delete actions */}
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  {revisions.length >= 2 && (
                    <button
                      onClick={() => {
                        if (!compareA || (compareA && compareB)) {
                          setCompareA(rev.id); setCompareB(null);
                        } else {
                          setCompareB(rev.id);
                        }
                      }}
                      style={{
                        fontSize: 11, background: "none", border: "none", padding: "2px 6px",
                        color: compareA === rev.id || compareB === rev.id
                          ? "var(--color-accent)"
                          : "var(--color-text-muted)",
                        cursor: "pointer",
                        fontWeight: compareA === rev.id || compareB === rev.id ? 600 : 400,
                      }}
                    >
                      {compareA === rev.id ? "A" : compareB === rev.id ? "B" : "Compare"}
                    </button>
                  )}
                  <button
                    onClick={() => handleRestore(rev.id)}
                    disabled={restoringId === rev.id || deletingId === rev.id}
                    style={{
                      fontSize: 12, background: "none", border: "none", padding: "2px 6px",
                      color: restoringId === rev.id ? "var(--color-text-muted)" : "var(--color-text-secondary)",
                      cursor: restoringId === rev.id || deletingId === rev.id ? "default" : "pointer",
                    }}
                  >
                    {restoringId === rev.id ? "Restoring…" : "Restore"}
                  </button>
                  {confirmingDeleteId === rev.id ? (
                    <>
                      <span style={{ fontSize: 12, color: "#fca5a5" }}>Delete?</span>
                      <button
                        onClick={() => handleDeleteConfirm(rev.id)}
                        style={{
                          fontSize: 12, background: "none", border: "none", padding: "2px 6px",
                          color: "#f87171", cursor: "pointer",
                        }}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmingDeleteId(null)}
                        style={{
                          fontSize: 12, background: "none", border: "none", padding: "2px 6px",
                          color: "var(--color-text-muted)", cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmingDeleteId(rev.id)}
                      disabled={deletingId === rev.id || restoringId === rev.id}
                      style={{
                        fontSize: 12, background: "none", border: "none", padding: "2px 6px",
                        color: deletingId === rev.id ? "var(--color-text-muted)" : "#737373",
                        cursor: deletingId === rev.id || restoringId === rev.id ? "default" : "pointer",
                      }}
                    >
                      {deletingId === rev.id ? "Deleting…" : "Delete"}
                    </button>
                  )}
                </div>

                {/* Second row: date */}
                <div style={{ gridColumn: "1 / -1", marginTop: 2 }}>
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                    {new Date(rev.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Run compare panel */}
      {compareRunA && compareRunB && (() => {
        const runA = runs.find((r) => r.id === compareRunA);
        const runB = runs.find((r) => r.id === compareRunB);
        if (!runA || !runB) return null;
        return (
          <div style={{
            marginBottom: 16, padding: "16px",
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)", borderRadius: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)" }}>
                Run Comparison
              </span>
              <button
                onClick={() => { setCompareRunA(null); setCompareRunB(null); }}
                style={{ fontSize: 12, background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}
              >
                Clear
              </button>
            </div>
            {/* Metadata side-by-side */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              {[runA, runB].map((run) => (
                <div key={run.id} style={{
                  padding: "10px 12px", borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  backgroundColor: "var(--color-bg-primary)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{
                      display: "inline-block", width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                      backgroundColor: STATUS_COLOR[run.status] ?? "#737373",
                    }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", textTransform: "capitalize" }}>
                      {run.status.replace("_", " ")}
                    </span>
                    <code style={{ fontSize: 10, color: "var(--color-text-muted)" }}>{run.id.slice(0, 8)}</code>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                    {new Date(run.createdAt).toLocaleString()}
                  </div>
                  {run.totalCost != null && run.totalCost > 0 && (
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                      ${run.totalCost.toFixed(4)}
                    </div>
                  )}
                  {run.graphStats.provenanceNodeCount > 0 && (
                    <div style={{ fontSize: 10, color: "#c4b5fd", marginTop: 4 }}>
                      {run.graphStats.provenanceNodeCount} artifact-derived node{run.graphStats.provenanceNodeCount !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Artifact previews */}
            {compareLoading && (
              <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Loading artifacts…</p>
            )}
            {!compareLoading && compareArtifact && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {([compareArtifact.a, compareArtifact.b] as const).map((artifact, i) =>
                  artifact ? (
                    <ArtifactPreviewPanel
                      key={artifact.modelId}
                      result={artifact}
                      label={i === 0 ? "Run A" : "Run B"}
                      highlighted={false}
                    />
                  ) : (
                    <div key={i} style={{
                      padding: "24px 16px", textAlign: "center",
                      border: "1px dashed var(--color-border)", borderRadius: 8,
                      color: "var(--color-text-muted)", fontSize: 12,
                    }}>
                      No artifacts
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        );
      })()}

      {!loading && !error && runs.length > 0 && filteredRuns.length === 0 && (
        <div style={{
          padding: "32px 20px", textAlign: "center",
          border: "1px dashed var(--color-border)", borderRadius: 12,
          backgroundColor: "var(--color-surface)",
          marginBottom: 12,
        }}>
          <p aria-live="polite" aria-atomic="true" style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 8 }}>
            No runs match this filter.
          </p>
          <button
            onClick={() => setRunFilter("")}
            style={{
              fontSize: 12, background: "none", border: "none", padding: 0,
              color: "var(--color-accent)", cursor: "pointer",
            }}
          >
            Clear filter
          </button>
        </div>
      )}

      {!loading && !error && filteredRuns.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredRuns.map((run) => {
            const dot = STATUS_COLOR[run.status] ?? "#737373";
            const stats = run.graphStats ?? { nodeCount: 0, edgeCount: 0, provenanceNodeCount: 0 };
            // Diff vs. the run that came before this one in the original (unfiltered) list
            const originalIdx = runs.indexOf(run);
            const prevStats = runs[originalIdx + 1]?.graphStats;
            const nodeDiff = prevStats != null ? stats.nodeCount - prevStats.nodeCount : null;
            return (
              <div
                key={run.id}
                ref={(el) => { if (el) rowElsRef.current.set(run.id, el); else rowElsRef.current.delete(run.id); }}
                onMouseEnter={() => { focusedRunIdRef.current = run.id; setHoveredRunId(run.id); keyboardRunIdRef.current = null; setKeyboardRunId(null); }}
                onMouseLeave={() => { focusedRunIdRef.current = keyboardRunIdRef.current; setHoveredRunId(null); }}
                style={{
                  padding: "14px 16px",
                  backgroundColor: "var(--color-surface)",
                  border: keyboardRunId === run.id
                    ? "1px solid var(--color-accent)"
                    : "1px solid var(--color-border)",
                  borderRadius: 10,
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: "4px 24px",
                  alignItems: "center",
                  outline: keyboardRunId === run.id ? "2px solid color-mix(in srgb, var(--color-accent) 30%, transparent)" : "none",
                  outlineOffset: 1,
                }}
              >
                {/* Left: status + id + graph snapshot badges */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{
                    display: "inline-block", width: 8, height: 8,
                    borderRadius: "50%", backgroundColor: dot, flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)",
                    textTransform: "capitalize",
                  }}>
                    {run.status.replace("_", " ")}
                  </span>
                  <code style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                    {run.id.slice(0, 8)}
                  </code>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(run.id).then(() => {
                        setCopiedRunId(run.id);
                        setTimeout(() => setCopiedRunId((prev) => prev === run.id ? null : prev), 1500);
                      }).catch(() => {});
                    }}
                    title={copiedRunId === run.id ? "Copied run ID" : "Copy full run ID"}
                    aria-label={copiedRunId === run.id ? "Copied run ID" : "Copy run ID"}
                    style={{
                      fontSize: 10,
                      background: "none",
                      border: "none",
                      padding: "0 2px",
                      color: copiedRunId === run.id ? "#4ade80" : "var(--color-text-muted)",
                      cursor: "pointer",
                      lineHeight: 1,
                    }}
                  >
                    {copiedRunId === run.id ? "copied" : "copy"}
                  </button>
                  {/* Graph snapshot summary */}
                  {stats.nodeCount > 0 && (
                    <span style={{
                      fontSize: 10, color: "var(--color-text-muted)",
                      padding: "1px 6px", borderRadius: 4,
                      border: "1px solid var(--color-border)",
                      backgroundColor: "var(--color-bg-primary)",
                    }}>
                      {stats.nodeCount} node{stats.nodeCount !== 1 ? "s" : ""} · {stats.edgeCount} edge{stats.edgeCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  {/* Node count diff vs previous run */}
                  {nodeDiff !== null && nodeDiff !== 0 && (
                    <span style={{
                      fontSize: 10,
                      color: nodeDiff > 0 ? "#86efac" : "#fca5a5",
                      fontWeight: 600,
                    }}>
                      {nodeDiff > 0 ? `+${nodeDiff}` : nodeDiff} node{Math.abs(nodeDiff) !== 1 ? "s" : ""}
                    </span>
                  )}
                  {/* Artifact-derived badge */}
                  {stats.provenanceNodeCount > 0 && (
                    <span style={{
                      fontSize: 10, color: "#c4b5fd",
                      padding: "1px 6px", borderRadius: 4,
                      border: "1px solid rgba(167,139,250,0.25)",
                      backgroundColor: "rgba(88,28,135,0.25)",
                    }}
                      title={`${stats.provenanceNodeCount} artifact-derived node${stats.provenanceNodeCount !== 1 ? "s" : ""}`}
                    >
                      artifact-derived
                    </span>
                  )}
                </div>

                {/* Right: duration + cost + actions */}
                <div style={{ display: "flex", gap: 16, justifyContent: "flex-end", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                    {durationLabel(run.startedAt, run.completedAt)}
                  </span>
                  {run.totalCost != null && run.totalCost > 0 && (
                    <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                      ${run.totalCost.toFixed(4)}
                    </span>
                  )}
                  <button
                    onClick={() => {
                      if (!compareRunA || (compareRunA && compareRunB)) {
                        setCompareRunA(run.id); setCompareRunB(null);
                      } else {
                        setCompareRunB(run.id);
                      }
                    }}
                    style={{
                      fontSize: 12, background: "none", border: "none", padding: "2px 6px",
                      color: compareRunA === run.id || compareRunB === run.id
                        ? "var(--color-accent)"
                        : "var(--color-text-muted)",
                      cursor: "pointer",
                      fontWeight: compareRunA === run.id || compareRunB === run.id ? 600 : 400,
                    }}
                  >
                    {compareRunA === run.id ? "A" : compareRunB === run.id ? "B" : "Compare"}
                  </button>
                  <Link
                    href={`/workflows/${id}/history/${run.id}`}
                    style={{
                      fontSize: 12, padding: "2px 6px",
                      color: "var(--color-text-secondary)",
                      textDecoration: "none",
                    }}
                  >
                    View
                  </Link>
                  {(run.status === "completed" || run.status === "partial_failure") && (
                    <Link
                      href={`/workflows/${id}?replay=${run.id}`}
                      title="Load this run's graph into the canvas editor"
                      style={{
                        fontSize: 12, padding: "2px 6px",
                        color: "var(--color-accent)",
                        textDecoration: "none",
                      }}
                    >
                      Restore
                    </Link>
                  )}
                  <button
                    onClick={handleRerun}
                    disabled={rerunning}
                    style={{
                      fontSize: 12, background: "none", border: "none", padding: "2px 6px",
                      color: rerunning ? "var(--color-text-muted)" : "var(--color-text-secondary)",
                      cursor: rerunning ? "default" : "pointer",
                    }}
                  >
                    {rerunning ? "Starting…" : "Re-run"}
                  </button>
                  {hoveredRunId === run.id && (
                    <span style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: 4 }}>
                      {([["C", "Copy"], ["↵", "Open"], ["R", "Re-run"]] as const).map(([key, label]) => (
                        <span key={key} style={{ display: "flex", gap: 3, alignItems: "center", fontSize: 10, color: "var(--color-text-muted)" }}>
                          <kbd style={{
                            fontFamily: "monospace",
                            fontSize: 9,
                            padding: "1px 4px",
                            borderRadius: 3,
                            border: "1px solid var(--color-border)",
                            backgroundColor: "var(--color-bg-primary)",
                            lineHeight: 1.5,
                          }}>
                            {key}
                          </kbd>
                          {label}
                        </span>
                      ))}
                    </span>
                  )}
                </div>

                {/* Second row: date + optional error summary */}
                <div style={{ gridColumn: "1 / -1", marginTop: 2, display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                    {new Date(run.createdAt).toLocaleString()}
                  </span>
                  {(run.status === "failed" || run.status === "partial_failure") && run.error && (
                    <span
                      title={run.error}
                      style={{
                        fontSize: 10,
                        color: "#fca5a5",
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        lineHeight: 1.4,
                      }}
                    >
                      {run.error}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Artifact Lineage ────────────────────────────────────────────── */}
      {!loading && !error && runs.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 12 }}>
            Artifact Lineage
          </h2>
          <ArtifactLineage
            runs={runs.map((r) => ({
              id: r.id,
              status: r.status,
              createdAt: r.createdAt,
              provenanceLinks: r.graphStats.provenanceLinks ?? [],
            }))}
          />
        </div>
      )}
    </div>
  );
}
