import { Worker, Queue } from "bullmq";
import { getDb, closeDb, checkpoint } from "@aistudio/db";

const REDIS_URL = process.env.REDIS_URL || "redis://redis:639";
const redisConnection = { url: REDIS_URL };

// --- Queues (also used by the API server to enqueue jobs) ---

export const predictionsQueue = new Queue("predictions", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

export const downloadsQueue = new Queue("downloads", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

// --- Workers (only run in the worker process) ---

async function processPredictionJob(job: { id?: string; data: Record<string, unknown> }) {
  console.log(`[worker] Processing prediction job ${job.id}`, job.data);
  // Placeholder: real implementation in T-024
  // For now, just prove the loop works
  const db = getDb();
  console.log(`[worker] DB connected, job ${job.id} processed successfully`);
  return { status: "completed" };
}

async function processDownloadJob(job: { id?: string; data: Record<string, unknown> }) {
  console.log(`[worker] Processing download job ${job.id}`, job.data);
  return { status: "completed" };
}

function startWorkers() {
  const concurrency = parseInt(process.env.MAX_CONCURRENT_NODES || "5");

  const predictionWorker = new Worker("predictions", processPredictionJob, {
    connection: redisConnection,
    concurrency,
  });

  const downloadWorker = new Worker("downloads", processDownloadJob, {
    connection: redisConnection,
    concurrency: 10,
  });

  predictionWorker.on("completed", (job) => {
    console.log(`[worker] Prediction job ${job.id} completed`);
  });

  predictionWorker.on("failed", (job, err) => {
    console.error(`[worker] Prediction job ${job?.id} failed:`, err.message);
  });

  downloadWorker.on("completed", (job) => {
    console.log(`[worker] Download job ${job.id} completed`);
  });

  downloadWorker.on("failed", (job, err) => {
    console.error(`[worker] Download job ${job?.id} failed:`, err.message);
  });

  console.log(`[worker] Workers started (predictions concurrency=${concurrency}, downloads concurrency=10)`);

  // Graceful shutdown
  const shutdown = async () => {
    console.log("[worker] Shutting down...");
    await predictionWorker.close();
    await downloadWorker.close();
    await predictionsQueue.close();
    await downloadsQueue.close();
    checkpoint();
    closeDb();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

// Only start workers when this file is the entry point (not when imported for queue access)
const isMainModule = process.argv[1]?.endsWith("worker/src/index.ts") ||
  process.argv[1]?.endsWith("worker/dist/index.js");

if (isMainModule) {
  console.log("[worker] Starting as standalone worker process...");
  startWorkers();
}

export { startWorkers };
