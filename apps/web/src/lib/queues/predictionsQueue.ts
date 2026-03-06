import { Queue } from "bullmq";

let _predictionsQueue: Queue | undefined;

export function getPredictionsQueue(): Queue {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) throw new Error("REDIS_URL is not set");

  if (!_predictionsQueue) {
    _predictionsQueue = new Queue("predictions", {
      connection: { url: redisUrl },
    });
  }

  return _predictionsQueue;
}
