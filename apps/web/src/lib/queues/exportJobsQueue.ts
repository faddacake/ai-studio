import { Queue } from "bullmq";

const QUEUE_NAME = "export-jobs";

/** Minimal BullMQ job payload — the DB row is the source of truth for the rest. */
export interface ExportJobQueuePayload {
  jobId: string;
}

/**
 * Minimal interface required by enqueueExportJob.
 * Using a structural interface rather than Pick<Queue, "add"> lets tests
 * inject a simple mock without satisfying BullMQ's full Job return type.
 */
export interface Enqueueable {
  add(name: string, data: unknown, opts?: unknown): Promise<unknown>;
}

let _exportJobsQueue: Queue | undefined;

/**
 * Return the singleton export-jobs BullMQ queue instance.
 * Throws if REDIS_URL is not set.
 */
export function getExportJobsQueue(): Queue {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) throw new Error("REDIS_URL is not set");

  if (!_exportJobsQueue) {
    _exportJobsQueue = new Queue(QUEUE_NAME, {
      connection: { url: redisUrl },
    });
  }

  return _exportJobsQueue;
}

/**
 * Enqueue a persisted export job ID for processing.
 *
 * Uses the persisted jobId as the BullMQ job ID so duplicate submissions
 * for the same job are naturally deduplicated by the queue.
 *
 * The full export payload lives in the DB row — only the jobId travels
 * through the queue so the worker can look it up and claim it.
 *
 * @param jobId - Persisted export job UUID to enqueue.
 * @param queue - Optional queue instance (defaults to production singleton;
 *                pass a test double in tests).
 */
export async function enqueueExportJob(
  jobId: string,
  queue?: Enqueueable,
): Promise<void> {
  const q = queue ?? getExportJobsQueue();
  await q.add(
    "process-export",
    { jobId } satisfies ExportJobQueuePayload,
    { jobId },
  );
}
