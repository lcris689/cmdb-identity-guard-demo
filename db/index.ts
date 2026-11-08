import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  const database = (env as unknown as { DB?: D1Database }).DB;

  if (!database) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Define a D1 binding named `DB` in cloudflare.config.ts or let your control plane inject the real binding before using the database."
    );
  }

  return drizzle(database, { schema });
}
