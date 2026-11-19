import "server-only";

import { asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { publicTags } from "@/lib/cache/tags";
import { getDb } from "@/lib/db";
import { media, teamMembers } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n/config";
import { pickLocale } from "@/lib/i18n/localized";

import { imageColumns } from "./catalog";
import { toPublicImage, type PublicImage } from "./images";

export type PublicTeamMember = {
  id: string;
  name: string;
  role: string;
  bio: string | null;
  photo: PublicImage | null;
  startedYear: number | null;
  phone: string | null;
  email: string | null;
};

export async function queryTeamMembers(locale: Locale): Promise<PublicTeamMember[]> {
  const rows = await getDb()
    .select({ member: teamMembers, ...imageColumns })
    .from(teamMembers)
    .leftJoin(media, eq(media.id, teamMembers.photoId))
    .where(eq(teamMembers.isActive, true))
    .orderBy(asc(teamMembers.sortOrder), asc(teamMembers.createdAt), asc(teamMembers.id));
  return rows.map(({ member, ...image }) => ({
    id: member.id,
    name: member.name,
    role: pickLocale(member.role, locale),
    bio: member.bio ? pickLocale(member.bio, locale) : null,
    photo: toPublicImage(image, locale, member.name),
    startedYear: member.startedYear,
    phone: member.phone,
    email: member.email,
  }));
}

export async function getTeamMembers(locale: Locale): Promise<PublicTeamMember[]> {
  "use cache";
  cacheTag(publicTags.content);
  cacheLife("hours");
  return queryTeamMembers(locale);
}
