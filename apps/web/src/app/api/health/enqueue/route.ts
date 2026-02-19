export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Queue } from "bullmq";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Create queue inline (this route is temporary for scaffolding verification)
const predictionsQueue = new Queue("predictions", {
  connection: { url: REDIS_URL },
});

export async function POST() {
  try {
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
