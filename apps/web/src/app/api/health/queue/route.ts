export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Queue } from "bullmq";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const predictionsQueue = new Queue("predictions", {
  connection: { url: REDIS_URL },
});

const downloadsQueue = new Queue("downloads", {
  connection: { url: REDIS_URL },
});

export async function GET() {
  try {
    const [pWaiting, pActive, pCompleted, pFailed] = await Promise.all([
      predictionsQueue.getWaitingCount(),
      predictionsQueue.getActiveCount(),
      predictionsQueue.getCompletedCount(),
      predictionsQueue.getFailedCount(),
    ]);

    const [dWaiting, dActive, dCompleted, dFailed] = await Promise.all([
      downloadsQueue.getWaitingCount(),
      downloadsQueue.getActiveCount(),
      downloadsQueue.getCompletedCount(),
      downloadsQueue.getFailedCount(),
    ]);

    return NextResponse.json({
      predictions: { waiting: pWaiting, active: pActive, completed: pCompleted, failed: pFailed },
      downloads: { waiting: dWaiting, active: dActive, completed: dCompleted, failed: dFailed },
    });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: String(err) },
      { status: 500 },
    );
  }
}
