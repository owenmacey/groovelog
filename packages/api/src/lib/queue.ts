import { Queue } from "bullmq";
import { redis } from "./redis";
import type { FeedEventPayload } from "@groovelog/db";

export type FeedEventJob = {
  eventId: string;
  actorId: string;
  payload: FeedEventPayload;
};

// Separate Redis connection for BullMQ (BullMQ requires maxRetriesPerRequest: null)
export const feedQueue = new Queue<FeedEventJob>("feed-events", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
  },
});
