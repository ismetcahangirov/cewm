import "dotenv/config";

import { createRequire } from "node:module";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// tsx loads lib/ as CommonJS, whose `export *` re-exports are invisible to an ESM namespace import.
const schema = createRequire(import.meta.url)(
  "../lib/db/schema",
) as typeof import("../lib/db/schema");

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema });

try {
  const inserted = await db
    .insert(schema.settings)
    .values({ id: 1, legalName: "Mebline" })
    .onConflictDoNothing()
    .returning({ id: schema.settings.id });
  console.log(
    inserted.length
      ? "Seeded the settings row; run `pnpm migrate:wp` to import the WordPress content"
      : "Settings row already present; nothing to seed",
  );
} finally {
  await client.end();
}
