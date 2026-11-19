import "server-only";

import { asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { publicTags } from "@/lib/cache/tags";
import { getDb } from "@/lib/db";
import { contactPersons, media } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n/config";
import { pickLocale } from "@/lib/i18n/localized";

import { imageColumns } from "./catalog";
import { toPublicImage, type PublicImage } from "./images";

export type PublicContactPerson = {
  id: string;
  name: string;
  role: string;
  phones: string[];
  email: string | null;
  whatsapp: string | null;
  photo: PublicImage | null;
};

export async function queryContactPersons(locale: Locale): Promise<PublicContactPerson[]> {
  const rows = await getDb()
    .select({ person: contactPersons, ...imageColumns })
    .from(contactPersons)
    .leftJoin(media, eq(media.id, contactPersons.photoId))
    .where(eq(contactPersons.isActive, true))
    .orderBy(asc(contactPersons.sortOrder), asc(contactPersons.createdAt), asc(contactPersons.id));
  return rows.map(({ person, ...image }) => {
    const name = pickLocale(person.name, locale);
    return {
      id: person.id,
      name,
      role: pickLocale(person.role, locale),
      phones: person.phones,
      email: person.email,
      whatsapp: person.whatsapp,
      photo: toPublicImage(image, locale, name),
    };
  });
}

export async function getContactPersons(locale: Locale): Promise<PublicContactPerson[]> {
  "use cache";
  cacheTag(publicTags.content);
  cacheLife("hours");
  return queryContactPersons(locale);
}
