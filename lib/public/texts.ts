import "server-only";

import { eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { publicTags } from "@/lib/cache/tags";
import { getDb } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import type { TextOverrides } from "@/lib/i18n/text-overrides";

export async function getTextOverrides(): Promise<TextOverrides> {
  "use cache";
  cacheTag(publicTags.settings);
  cacheLife("hours");
  const [row] = await getDb()
    .select({ textOverrides: settings.textOverrides })
    .from(settings)
    .where(eq(settings.id, 1));
  return row?.textOverrides ?? {};
}
