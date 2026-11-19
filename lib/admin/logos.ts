import "server-only";

import { and, asc, eq, inArray, sql } from "drizzle-orm";

import type { DomainError } from "@/lib/api/server";
import { getDb } from "@/lib/db";
import { logos, media } from "@/lib/db/schema";
import type { LogoDto, LogoGroup, LogoValues, ReorderLogosInput } from "@/lib/validation/logos";

import { findMedia, toMediaDto } from "./media";

const missing: DomainError = { status: 404, message: "Loqo tapılmadı." };

async function checkImage(imageId: string): Promise<DomainError | null> {
  const image = await findMedia(imageId);
  if (!image || !image.mimeType.startsWith("image/")) {
    const message = "Şəkil tapılmadı.";
    return { status: 400, message, fields: { imageId: message } };
  }
  return null;
}

export async function listLogos(group?: LogoGroup): Promise<LogoDto[]> {
  const rows = await getDb()
    .select({ logo: logos, image: media })
    .from(logos)
    .leftJoin(media, eq(media.id, logos.imageId))
    .where(group ? eq(logos.group, group) : undefined)
    .orderBy(asc(logos.group), asc(logos.sortOrder), asc(logos.createdAt));
  return rows.map(({ logo, image }) => ({
    id: logo.id,
    name: logo.name,
    url: logo.url,
    group: logo.group,
    sortOrder: logo.sortOrder,
    isActive: logo.isActive,
    image: image ? toMediaDto(image) : null,
  }));
}

function nextSortOrder(group: LogoGroup) {
  return sql<number>`(select coalesce(max(${logos.sortOrder}), -1) + 1 from ${logos}
    where ${logos.group} = ${group})`;
}

export async function createLogo(
  values: LogoValues,
): Promise<{ id: string } | { error: DomainError }> {
  const error = await checkImage(values.imageId);
  if (error) return { error };
  const [row] = await getDb()
    .insert(logos)
    .values({ ...values, sortOrder: nextSortOrder(values.group) })
    .returning({ id: logos.id });
  if (!row) throw new Error("Logo was not created");
  return { id: row.id };
}

export async function updateLogo(
  id: string,
  values: LogoValues,
): Promise<{ id: string } | { error: DomainError }> {
  const [current] = await getDb().select().from(logos).where(eq(logos.id, id));
  if (!current) return { error: missing };
  const error = await checkImage(values.imageId);
  if (error) return { error };
  const groupChanged = current.group !== values.group;
  await getDb()
    .update(logos)
    .set({ ...values, ...(groupChanged ? { sortOrder: nextSortOrder(values.group) } : {}) })
    .where(eq(logos.id, id));
  return { id };
}

export async function setLogoActive(id: string, isActive: boolean): Promise<boolean> {
  const updated = await getDb()
    .update(logos)
    .set({ isActive })
    .where(eq(logos.id, id))
    .returning({ id: logos.id });
  return updated.length > 0;
}

export async function reorderLogos(
  input: ReorderLogosInput,
): Promise<{ ok: true } | { error: DomainError }> {
  const { group, orderedIds } = input;
  if (new Set(orderedIds).size !== orderedIds.length) {
    return { error: { status: 400, message: "Sıra təkrarlanan loqo ehtiva edir." } };
  }
  const db = getDb();
  const inGroup = await db
    .select({ id: logos.id })
    .from(logos)
    .where(and(eq(logos.group, group), inArray(logos.id, orderedIds)));
  const siblings = await db.select({ id: logos.id }).from(logos).where(eq(logos.group, group));
  if (inGroup.length !== orderedIds.length || siblings.length !== orderedIds.length) {
    return {
      error: { status: 409, message: "Siyahı köhnədir. Səhifəni yeniləyib yenidən cəhd edin." },
    };
  }
  await db.transaction(async (tx) => {
    for (const [index, id] of orderedIds.entries()) {
      await tx.update(logos).set({ sortOrder: index }).where(eq(logos.id, id));
    }
  });
  return { ok: true };
}

export async function deleteLogo(id: string): Promise<boolean> {
  const deleted = await getDb().delete(logos).where(eq(logos.id, id)).returning({ id: logos.id });
  return deleted.length > 0;
}
