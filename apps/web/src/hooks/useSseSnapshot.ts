"use client";

/**
 * Standalone SSE snapshot hook — no workflowStore dependency.
 *
 * Opens an EventSource to /api/workflows/:workflowId/runs/:runId/events
 * and accumulates snapshot events, exposing the latest RunDebugSnapshot.
 * Closes automatically when the run reaches a terminal status.
 */
import { useState, useEffect, useRef } from "react";
import type { RunDebugSnapshot } from "@aistudio/engine";

const TERMINAL_STATUSES = new Set([
  "completed",
  "failed",
  "partial_failure",
  "cancelled",
  "budget_exceeded",
]);

export interface SseSnapshotState {
  snapshot: RunDebugSnapshot | null;
  connected: boolean;
  error: string | null;
}

export function useSseSnapshot(
  workflowId: string | null,
  runId: string | null,
): SseSnapshotState {
  const [state, setState] = useState<SseSnapshotState>({
    snapshot: null,
    connected: false,
    error: null,
  });

  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Clean up any previous connection
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    if (!workflowId || !runId) {
      setState({ snapshot: null, connected: false, error: null });
      return;
    }

    const url = `/api/workflows/${workflowId}/runs/${runId}/events`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener("open", () => {
      setState((prev) => ({ ...prev, connected: true, error: null }));
    });

    es.addEventListener("snapshot", (event: MessageEvent) => {
      try {
        const snapshot = JSON.parse(event.data) as RunDebugSnapshot;
        setState((prev) => ({ ...prev, snapshot }));

        // Auto-close on terminal status
        if (TERMINAL_STATUSES.has(snapshot.status)) {
          es.close();
          esRef.current = null;
          setState((prev) => ({ ...prev, connected: false }));
        }
      } catch {
        // Malformed snapshot — ignore
      }
    });

    es.addEventListener("error", () => {
      setState((prev) => ({
        ...prev,
        connected: false,
        error: "SSE connection error",
      }));
      es.close();
      esRef.current = null;
    });

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [workflowId, runId]);

  return state;
}
