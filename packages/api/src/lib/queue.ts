import { Queue } from "bullmq";
import { getRedis } from "./redis";
import type { FeedEventPayload } from "@groovelog/db";

export type FeedEventJob = {
  eventId: string;
  actorId: string;
  payload: FeedEventPayload;
};

let _feedQueue: Queue<FeedEventJob> | null = null;

export function getFeedQueue(): Queue<FeedEventJob> {
  if (!_feedQueue) {
    _feedQueue = new Queue<FeedEventJob>("feed-events", {
      connection: getRedis(),
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
      },
    });
  }
  return _feedQueue;
}
