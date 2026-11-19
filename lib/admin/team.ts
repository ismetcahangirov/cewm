import "server-only";

import { asc, eq, inArray, sql } from "drizzle-orm";

import type { DomainError } from "@/lib/api/server";
import { getDb } from "@/lib/db";
import { media, teamMembers } from "@/lib/db/schema";
import type { ReorderTeamInput, TeamMemberDto, TeamMemberValues } from "@/lib/validation/team";

import { findMedia, toMediaDto } from "./media";

const missing: DomainError = { status: 404, message: "İşçi tapılmadı." };

async function checkPhoto(photoId: string | null): Promise<DomainError | null> {
  if (!photoId) return null;
  const photo = await findMedia(photoId);
  if (!photo || !photo.mimeType.startsWith("image/")) {
    const message = "Şəkil tapılmadı.";
    return { status: 400, message, fields: { photoId: message } };
  }
  return null;
}

export async function listTeamMembers(): Promise<TeamMemberDto[]> {
  const rows = await getDb()
    .select({ member: teamMembers, photo: media })
    .from(teamMembers)
    .leftJoin(media, eq(media.id, teamMembers.photoId))
    .orderBy(asc(teamMembers.sortOrder), asc(teamMembers.createdAt));
  return rows.map(({ member, photo }) => ({
    id: member.id,
    name: member.name,
    role: member.role,
    bio: member.bio,
    photo: photo ? toMediaDto(photo) : null,
    startedYear: member.startedYear,
    phone: member.phone,
    email: member.email,
    sortOrder: member.sortOrder,
    isActive: member.isActive,
  }));
}

const nextSortOrder = sql<number>`(select coalesce(max(${teamMembers.sortOrder}), -1) + 1 from ${teamMembers})`;

export async function createTeamMember(
  values: TeamMemberValues,
): Promise<{ id: string } | { error: DomainError }> {
  const error = await checkPhoto(values.photoId);
  if (error) return { error };
  const [row] = await getDb()
    .insert(teamMembers)
    .values({ ...values, sortOrder: nextSortOrder })
    .returning({ id: teamMembers.id });
  if (!row) throw new Error("Team member was not created");
  return { id: row.id };
}

export async function updateTeamMember(
  id: string,
  values: TeamMemberValues,
): Promise<{ id: string } | { error: DomainError }> {
  const error = await checkPhoto(values.photoId);
  if (error) return { error };
  const updated = await getDb()
    .update(teamMembers)
    .set(values)
    .where(eq(teamMembers.id, id))
    .returning({ id: teamMembers.id });
  return updated.length ? { id } : { error: missing };
}

export async function setTeamMemberActive(id: string, isActive: boolean): Promise<boolean> {
  const updated = await getDb()
    .update(teamMembers)
    .set({ isActive })
    .where(eq(teamMembers.id, id))
    .returning({ id: teamMembers.id });
  return updated.length > 0;
}

export async function reorderTeamMembers(
  input: ReorderTeamInput,
): Promise<{ ok: true } | { error: DomainError }> {
  const { orderedIds } = input;
  if (new Set(orderedIds).size !== orderedIds.length) {
    return { error: { status: 400, message: "Sıra təkrarlanan işçi ehtiva edir." } };
  }
  const db = getDb();
  const listed = await db
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .where(inArray(teamMembers.id, orderedIds));
  const all = await db.select({ id: teamMembers.id }).from(teamMembers);
  if (listed.length !== orderedIds.length || all.length !== orderedIds.length) {
    return {
      error: { status: 409, message: "Siyahı köhnədir. Səhifəni yeniləyib yenidən cəhd edin." },
    };
  }
  await db.transaction(async (tx) => {
    for (const [index, id] of orderedIds.entries()) {
      await tx.update(teamMembers).set({ sortOrder: index }).where(eq(teamMembers.id, id));
    }
  });
  return { ok: true };
}

export async function deleteTeamMember(id: string): Promise<boolean> {
  const deleted = await getDb()
    .delete(teamMembers)
    .where(eq(teamMembers.id, id))
    .returning({ id: teamMembers.id });
  return deleted.length > 0;
}
