import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Load local first (packages/db/.env.local), then root — same order as db/src/index.ts.
// This means the local postgres credentials win over whatever is in the root file.
config({ path: ".env.local" });
config({ path: "../../.env.local", override: false });

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
});
