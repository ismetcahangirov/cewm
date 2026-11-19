import "server-only";

import { asc, eq } from "drizzle-orm";

import type { DomainError } from "@/lib/api/server";
import { getDb } from "@/lib/db";
import { contactPersons, media } from "@/lib/db/schema";
import type { ContactPersonDto, ContactPersonValues } from "@/lib/validation/contact-persons";

import { checkImage } from "./content";
import { toMediaDto } from "./media";
import { nextSortOrder } from "./ordering";

const missing: DomainError = { status: 404, message: "Əlaqə şəxsi tapılmadı." };

export async function listContactPersons(): Promise<ContactPersonDto[]> {
  const rows = await getDb()
    .select({ person: contactPersons, photo: media })
    .from(contactPersons)
    .leftJoin(media, eq(media.id, contactPersons.photoId))
    .orderBy(asc(contactPersons.sortOrder), asc(contactPersons.createdAt));
  return rows.map(({ person, photo }) => ({
    id: person.id,
    name: person.name,
    role: person.role,
    phones: person.phones,
    email: person.email,
    whatsapp: person.whatsapp,
    photo: photo ? toMediaDto(photo) : null,
    sortOrder: person.sortOrder,
    isActive: person.isActive,
  }));
}

export async function createContactPerson(
  values: ContactPersonValues,
): Promise<{ id: string } | { error: DomainError }> {
  const error = await checkImage("photoId", values.photoId);
  if (error) return { error };
  const [row] = await getDb()
    .insert(contactPersons)
    .values({ ...values, sortOrder: nextSortOrder(contactPersons) })
    .returning({ id: contactPersons.id });
  if (!row) throw new Error("Contact person was not created");
  return { id: row.id };
}

export async function updateContactPerson(
  id: string,
  values: ContactPersonValues,
): Promise<{ id: string } | { error: DomainError }> {
  const error = await checkImage("photoId", values.photoId);
  if (error) return { error };
  const updated = await getDb()
    .update(contactPersons)
    .set(values)
    .where(eq(contactPersons.id, id))
    .returning({ id: contactPersons.id });
  return updated.length ? { id } : { error: missing };
}
