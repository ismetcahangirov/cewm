import "dotenv/config";

import { randomBytes, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { parseArgs } from "node:util";

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";

// tsx loads lib/ as CommonJS, whose `export *` re-exports are invisible to an ESM namespace import.
const schema = createRequire(import.meta.url)(
  "../lib/db/schema",
) as typeof import("../lib/db/schema");

const { values } = parseArgs({
  options: { email: { type: "string" }, name: { type: "string" } },
});

const input = z
  .object({
    email: z.email().trim().toLowerCase(),
    name: z.string().trim().min(2),
  })
  .safeParse(values);

if (!input.success) {
  console.error('Usage: pnpm auth:owner --email owner@mebline.az --name "Full Name"');
  process.exit(1);
}

const url = process.env.DATABASE_URL;
const origin = process.env.BETTER_AUTH_URL;
if (!url) throw new Error("DATABASE_URL is not set");
if (!origin) throw new Error("BETTER_AUTH_URL is not set");

const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema });
const { users, verifications } = schema;

try {
  const { email, name } = input.data;
  const [existing] = await db.select().from(users).where(eq(users.email, email));
  const userId = existing?.id ?? randomUUID();

  if (existing) {
    await db
      .update(users)
      .set({ role: "owner", banned: false, banReason: null, banExpires: null })
      .where(eq(users.id, userId));
  } else {
    await db.insert(users).values({ id: userId, name, email, role: "owner" });
  }

  const token = randomBytes(18).toString("base64url");
  await db.insert(verifications).values({
    id: randomUUID(),
    identifier: `reset-password:${token}`,
    value: userId,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  const link = new URL(`/api/auth/reset-password/${token}`, origin);
  link.searchParams.set("callbackURL", "/admin/reset-password");

  console.log(existing ? `${email} is now an owner.` : `Created owner ${email}.`);
  console.log("Open this link within 24 hours to set the password:");
  console.log(link.href);
} finally {
  await client.end();
}
