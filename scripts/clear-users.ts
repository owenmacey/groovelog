import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../apps/web/.env.local") });

import { db, users } from "../packages/db/src/index";

void (async () => {
  await db.delete(users);
  console.log("All users deleted");
  process.exit(0);
})();
