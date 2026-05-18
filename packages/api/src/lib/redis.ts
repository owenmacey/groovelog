import { config } from "dotenv";
import { resolve } from "path";
import { Redis } from "ioredis";

config({ path: resolve(process.cwd(), ".env.local"), override: false });
config({ path: resolve(process.cwd(), "../../.env.local"), override: false });

const redisUrl = process.env["REDIS_URL"];
if (!redisUrl) throw new Error("REDIS_URL is required");

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
});

redis.on("error", (err: unknown) => {
  console.error("Redis error:", err);
});
