import { config } from "dotenv";
import { resolve } from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

config({ path: resolve(process.cwd(), ".env.local"), override: false });
config({ path: resolve(process.cwd(), "../../.env.local"), override: false });

function createDb(url: string) {
  return drizzle(
    postgres(url, { max: 10, idle_timeout: 20, connect_timeout: 10 }),
    { schema }
  );
}

export type DB = ReturnType<typeof createDb>;

let _db: DB | null = null;

export function getDb(): DB {
  if (!_db) {
    const url = process.env["DATABASE_URL"];
    if (!url) throw new Error("DATABASE_URL environment variable is required");
    _db = createDb(url);
  }
  return _db;
}

// Re-export everything so consumers only need to import from "@groovelog/db"
export * from "./schema";
