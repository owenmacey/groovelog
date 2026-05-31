import { config } from "dotenv";
import { resolve } from "path";
import postgres from "postgres";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), "../../.env.local"), override: false });

const url = process.env["DATABASE_URL"];
if (!url) throw new Error("DATABASE_URL is required");

const sql = postgres(url);

async function main() {
  console.log("Adding is_day_one column to users table...");

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_day_one boolean NOT NULL DEFAULT false
  `;

  console.log("Column added. Backfilling existing users to is_day_one = true...");

  const result = await sql`
    UPDATE users SET is_day_one = true
  `;

  console.log(`Done. Updated ${result.count} user(s) to is_day_one = true.`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
