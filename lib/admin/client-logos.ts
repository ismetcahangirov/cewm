import "server-only";

import { asc, eq } from "drizzle-orm";

import type { DomainError } from "@/lib/api/server";
import { getDb } from "@/lib/db";
import { clientLogos, media } from "@/lib/db/schema";
import type { ClientLogoDto, ClientLogoValues } from "@/lib/validation/client-logos";

import { checkImage } from "./content";
import { toMediaDto } from "./media";
import { nextSortOrder } from "./ordering";

const missing: DomainError = { status: 404, message: "Loqo tapılmadı." };

export async function listClientLogos(): Promise<ClientLogoDto[]> {
  const rows = await getDb()
    .select({ logo: clientLogos, image: media })
    .from(clientLogos)
    .leftJoin(media, eq(media.id, clientLogos.imageId))
    .orderBy(asc(clientLogos.sortOrder), asc(clientLogos.createdAt));
  return rows.map(({ logo, image }) => ({
    id: logo.id,
    name: logo.name,
    url: logo.url,
    sortOrder: logo.sortOrder,
    isActive: logo.isActive,
    image: image ? toMediaDto(image) : null,
  }));
}

export async function createClientLogo(
  values: ClientLogoValues,
): Promise<{ id: string } | { error: DomainError }> {
  const error = await checkImage("imageId", values.imageId);
  if (error) return { error };
  const [row] = await getDb()
    .insert(clientLogos)
    .values({ ...values, sortOrder: nextSortOrder(clientLogos) })
    .returning({ id: clientLogos.id });
  if (!row) throw new Error("Client logo was not created");
  return { id: row.id };
}

export async function updateClientLogo(
  id: string,
  values: ClientLogoValues,
): Promise<{ id: string } | { error: DomainError }> {
  const error = await checkImage("imageId", values.imageId);
  if (error) return { error };
  const updated = await getDb()
    .update(clientLogos)
    .set(values)
    .where(eq(clientLogos.id, id))
    .returning({ id: clientLogos.id });
  return updated.length ? { id } : { error: missing };
}
