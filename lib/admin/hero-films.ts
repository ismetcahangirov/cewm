import "server-only";

import { asc, eq, sql } from "drizzle-orm";

import type { DomainError } from "@/lib/api/server";
import { getDb } from "@/lib/db";
import { uniqueViolation } from "@/lib/db/errors";
import { heroFilms, media, settings } from "@/lib/db/schema";
import type { HeroFilmDto, HeroFilmOptionDto, HeroFilmValues } from "@/lib/validation/hero-films";

import { checkImage } from "./content";
import { toMediaDto } from "./media";

const missing: DomainError = { status: 404, message: "Film tapılmadı." };

const inUse = sql<boolean>`exists (select 1 from ${settings} s where s.hero ->> 'filmId' = hero_films.id::text)`;

export async function listHeroFilms(): Promise<HeroFilmDto[]> {
  const rows = await getDb()
    .select({ film: heroFilms, poster: media, inUse })
    .from(heroFilms)
    .leftJoin(media, eq(media.id, heroFilms.posterId))
    .orderBy(asc(heroFilms.createdAt));
  return rows.map(({ film, poster, inUse: used }) => ({
    id: film.id,
    name: film.name,
    keyPrefix: film.keyPrefix,
    frameCount: film.frameCount,
    frameWidth: film.frameWidth,
    frameHeight: film.frameHeight,
    format: film.format,
    poster: poster ? toMediaDto(poster) : null,
    inUse: used,
    updatedAt: film.updatedAt.toISOString(),
  }));
}

export async function heroFilmOptions(): Promise<HeroFilmOptionDto[]> {
  return getDb()
    .select({ id: heroFilms.id, name: heroFilms.name, frameCount: heroFilms.frameCount })
    .from(heroFilms)
    .orderBy(asc(heroFilms.createdAt));
}

function prefixConflict(error: unknown): DomainError | null {
  if (uniqueViolation(error) === null) return null;
  return {
    status: 409,
    message: "Bu qovluq artıq başqa filmdə istifadə olunur.",
    fields: { keyPrefix: "Bu qovluq artıq istifadə olunur." },
  };
}

export async function saveHeroFilm(
  id: string | null,
  values: HeroFilmValues,
): Promise<{ id: string } | { error: DomainError }> {
  const error = await checkImage("posterId", values.posterId);
  if (error) return { error };
  try {
    if (id) {
      const updated = await getDb()
        .update(heroFilms)
        .set(values)
        .where(eq(heroFilms.id, id))
        .returning({ id: heroFilms.id });
      return updated.length ? { id } : { error: missing };
    }
    const [row] = await getDb().insert(heroFilms).values(values).returning({ id: heroFilms.id });
    if (!row) throw new Error("Hero film was not created");
    return { id: row.id };
  } catch (cause) {
    const conflict = prefixConflict(cause);
    if (conflict) return { error: conflict };
    throw cause;
  }
}

export async function deleteHeroFilm(id: string): Promise<boolean> {
  return getDb().transaction(async (tx) => {
    const deleted = await tx
      .delete(heroFilms)
      .where(eq(heroFilms.id, id))
      .returning({ id: heroFilms.id });
    if (!deleted.length) return false;
    await tx
      .update(settings)
      .set({ hero: sql`jsonb_set(${settings.hero}, '{filmId}', 'null'::jsonb)` })
      .where(sql`${settings.hero} ->> 'filmId' = ${id}`);
    return true;
  });
}
