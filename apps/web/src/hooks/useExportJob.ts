"use client";

/**
 * useExportJob — trigger and observe a single export job execution.
 *
 * Flow (no polling):
 *   1. trigger() → POST /api/editor-projects/[projectId]/export → { jobId }
 *   2. immediately GET /api/export-jobs/[jobId] → ExportJobStatusResponse
 *   3. surface status + renderResult to the caller
 *
 * Errors at either step are surfaced via `error`; the hook resets via `reset()`.
 * The queue payload carries only { jobId }; all render metadata comes from the
 * status fetch.
 */

import { useState, useCallback } from "react";
import type { ExportJobStatusResponse } from "@/lib/exportJobStatus";

export type ExportJobHookState =
  | "idle"       // nothing triggered yet
  | "triggering" // POST in flight
  | "fetching"   // GET status in flight
  | "done"       // status fetched successfully
  | "error";     // any fetch failure

export interface UseExportJobResult {
  /** Current lifecycle state of the trigger+fetch flow. */
  state: ExportJobHookState;
  /** Fetched status response; non-null only when state is "done". */
  jobStatus: ExportJobStatusResponse | null;
  /** Error message when state is "error". */
  error: string | null;
  /** Trigger the export: POST to create, then GET to read status. */
  trigger: () => Promise<void>;
  /** Reset to idle so the user can trigger again. */
  reset: () => void;
}

export function useExportJob(projectId: string): UseExportJobResult {
  const [state, setState] = useState<ExportJobHookState>("idle");
  const [jobStatus, setJobStatus] = useState<ExportJobStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trigger = useCallback(async () => {
    setState("triggering");
    setError(null);
    setJobStatus(null);

    try {
      // Step 1 — create the export job
      const createRes = await fetch(`/api/editor-projects/${projectId}/export`, {
        method: "POST",
      });
      if (!createRes.ok) {
        const body = await createRes.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `export request failed (${createRes.status})`);
      }
      const { jobId } = (await createRes.json()) as { jobId: string };

      // Step 2 — read back status (includes renderResult when completed)
      setState("fetching");
      const statusRes = await fetch(`/api/export-jobs/${jobId}`);
      if (!statusRes.ok) {
        throw new Error(`status read failed (${statusRes.status})`);
      }
      const status = (await statusRes.json()) as ExportJobStatusResponse;
      setJobStatus(status);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown error");
      setState("error");
    }
  }, [projectId]);

  const reset = useCallback(() => {
    setState("idle");
    setJobStatus(null);
    setError(null);
  }, []);

  return { state, jobStatus, error, trigger, reset };
}
