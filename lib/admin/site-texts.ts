import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import type { SiteTextsDto } from "@/lib/validation/site-texts";
import type { TextOverrides } from "@/lib/i18n/text-overrides";

export async function getSiteTexts(): Promise<SiteTextsDto> {
  const [row] = await getDb()
    .select({ texts: settings.textOverrides, updatedAt: settings.updatedAt })
    .from(settings)
    .where(eq(settings.id, 1));
  return { texts: row?.texts ?? {}, updatedAt: row?.updatedAt.toISOString() ?? null };
}

export async function saveSiteTexts(texts: TextOverrides): Promise<SiteTextsDto> {
  await getDb()
    .insert(settings)
    .values({ id: 1, textOverrides: texts })
    .onConflictDoUpdate({
      target: settings.id,
      set: { textOverrides: texts, updatedAt: new Date() },
    });
  return getSiteTexts();
}
