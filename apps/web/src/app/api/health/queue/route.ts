import { getPredictionsQueue } from "@/lib/queues/predictionsQueue";

export const runtime = "nodejs";

export async function GET() {
  const predictionsQueue = getPredictionsQueue();

  const [waiting, active, completed, failed] = await Promise.all([
    predictionsQueue.getWaitingCount(),
    predictionsQueue.getActiveCount(),
    predictionsQueue.getCompletedCount(),
    predictionsQueue.getFailedCount(),
  ]);

  return Response.json({
    ok: true,
    queue: { waiting, active, completed, failed },
  });
}
