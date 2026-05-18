import { config } from "dotenv";
import { resolve } from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Next.js loads apps/web/.env.local but this package runs in the server bundle.
// Explicitly load both possible locations so DATABASE_URL is always available.
config({ path: resolve(process.cwd(), ".env.local"), override: false });
config({ path: resolve(process.cwd(), "../../.env.local"), override: false });

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

// In production use a connection pool; for local dev a single connection is fine.
const client = postgres(databaseUrl, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
export type DB = typeof db;

// Re-export everything so consumers only need to import from "@groovelog/db"
export * from "./schema";
