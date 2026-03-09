export const runtime = "nodejs";

import { buildDebugSnapshot } from "@aistudio/engine";
import type { RunEvent } from "@aistudio/engine";
import { getRunCoordinator } from "@/lib/runCoordinator";

const TERMINAL_STATUSES = new Set([
  "completed",
  "failed",
  "partial_failure",
  "cancelled",
  "budget_exceeded",
]);

function sseMessage(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; runId: string }> },
) {
  const { runId } = await params;
  const coordinator = getRunCoordinator();

  if (!coordinator.hasRun(runId)) {
    return new Response(JSON.stringify({ error: "Run not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      function send(event: string, data: unknown) {
        try {
          controller.enqueue(encoder.encode(sseMessage(event, data)));
        } catch {
          // Stream already closed
        }
      }

      // Send initial snapshot
      const run = coordinator.getRun(runId);
      const snapshot = buildDebugSnapshot(run);
      send("snapshot", snapshot);

      // If run is already terminal, close immediately
      if (TERMINAL_STATUSES.has(run.status)) {
        controller.close();
        return;
      }

      // Subscribe to future events
      const unsubscribe = coordinator.on((event: RunEvent) => {
        if (event.runId !== runId) return;

        // Rebuild full snapshot on every event
        const currentRun = coordinator.getRun(runId);
        const updated = buildDebugSnapshot(currentRun);
        send("snapshot", updated);

        // Close stream on terminal status
        if (TERMINAL_STATUSES.has(currentRun.status)) {
          unsubscribe();
          try {
            controller.close();
          } catch {
            // Already closed
          }
        }
      });

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        send("heartbeat", { ts: Date.now() });
      }, 15_000);

      // Cleanup when client disconnects
      _req.signal.addEventListener("abort", () => {
        unsubscribe();
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
