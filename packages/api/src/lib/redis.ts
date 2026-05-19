import { config } from "dotenv";
import { resolve } from "path";
import { Redis } from "ioredis";

config({ path: resolve(process.cwd(), ".env.local"), override: false });
config({ path: resolve(process.cwd(), "../../.env.local"), override: false });

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (!_redis) {
    const url = process.env["REDIS_URL"];
    if (!url) throw new Error("REDIS_URL is required");
    _redis = new Redis(url, {
      maxRetriesPerRequest: null, // required by BullMQ
      enableReadyCheck: false,
    });
    _redis.on("error", (err: unknown) => {
      console.error("Redis error:", err);
    });
  }
  return _redis;
}
