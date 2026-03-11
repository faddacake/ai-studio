export const runtime = "nodejs";

/**
 * GET /api/workflows/:id/runs/:runId/outputs
 *
 * Returns the completed node outputs for a run, keyed by nodeId.
 * Used by the Generate page to extract ArtifactRef values for image rendering.
 */
import { NextResponse } from "next/server";
import { getRunCoordinator } from "@/lib/runCoordinator";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; runId: string }> },
) {
  const { runId } = await params;
  const coordinator = getRunCoordinator();

  if (!coordinator.hasRun(runId)) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const run = coordinator.getRun(runId);

  const outputs: Array<{ nodeId: string; outputs: Record<string, unknown> }> = [];
  for (const [nodeId, state] of run.nodeStates) {
    if (state.status === "completed" && Object.keys(state.outputs).length > 0) {
      outputs.push({ nodeId, outputs: state.outputs });
    }
  }

  return NextResponse.json({ outputs });
}
