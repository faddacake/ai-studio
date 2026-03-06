export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getPredictionsQueue } from "@/lib/queues/predictionsQueue";

export async function GET() {
  const predictionsQueue = getPredictionsQueue();
  const jobId = `test-${Date.now()}`;

  const job = await predictionsQueue.add("test-job", {
    type: "dummy",
    message: "Hello from API server",
    timestamp: new Date().toISOString(),
  }, { jobId });

  return Response.json({ ok: true, jobId: job.id });
}

export async function POST() {
  try {
    const predictionsQueue = getPredictionsQueue();
    const jobId = `test-${Date.now()}`;
    const job = await predictionsQueue.add("test-job", {
      type: "dummy",
      message: "Hello from API server",
      timestamp: new Date().toISOString(),
    }, { jobId });

    return NextResponse.json({
      status: "enqueued",
      jobId: job.id,
      queueName: "predictions",
    });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: String(err) },
      { status: 500 },
    );
  }
}
