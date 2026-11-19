import "dotenv/config";

import { createRequire } from "node:module";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// tsx loads lib/ as CommonJS, whose `export *` re-exports are invisible to an ESM namespace import.
const load = createRequire(import.meta.url);
const schema = load("../lib/db/schema") as typeof import("../lib/db/schema");
const { seedDatabase } = load("../lib/db/seed") as typeof import("../lib/db/seed");
const remote = load(
  "../lib/cache/remote-revalidate",
) as typeof import("../lib/cache/remote-revalidate");

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const client = postgres(url, { max: 1 });

try {
  const summary = await seedDatabase(drizzle(client, { schema }));
  console.log(
    [
      summary.settings ? "settings row created" : "settings row already present",
      `${summary.brands} brands`,
      `${summary.categories} categories`,
      `${summary.contactPersons} contact persons`,
      `${summary.pages} pages`,
      `${summary.menus} menus added`,
    ].join(", "),
  );
  console.log(remote.describeRevalidation(await remote.requestPublicRevalidation()));
} finally {
  await client.end();
}
