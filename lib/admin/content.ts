import "server-only";

import { sql, type SQL } from "drizzle-orm";

import type { DomainError } from "@/lib/api/server";
import { uniqueViolation } from "@/lib/db/errors";
import { menuItems } from "@/lib/db/schema";
import { locales } from "@/lib/i18n/config";
import { mediaKindOf } from "@/lib/validation/media";

import { findMedia } from "./media";

export function invalidField(field: string, message: string): DomainError {
  return { status: 400, message: "Məlumatlar düzgün deyil.", fields: { [field]: message } };
}

export async function checkImage(field: string, id: string | null): Promise<DomainError | null> {
  if (!id) return null;
  const row = await findMedia(id);
  if (!row || (mediaKindOf(row.mimeType) !== "image" && row.mimeType !== "image/svg+xml")) {
    return invalidField(field, "Şəkil tapılmadı.");
  }
  return null;
}

export function slugConflictFor(
  table: "pages" | "posts",
  message: string,
): (cause: unknown) => DomainError | null {
  return (cause) => {
    const constraint = uniqueViolation(cause);
    if (constraint === null) return null;
    const locale = locales.find((value) => constraint === `${table}_slug_${value}_key`) ?? "az";
    return {
      status: 409,
      message,
      fields: { [`slug.${locale}`]: "Bu ünvan artıq istifadə olunur." },
    };
  };
}

export function menuItemCount(column: "page_id" | "category_id", id: SQL): SQL<number> {
  return sql<number>`(select count(*) from ${menuItems} mi where mi.${sql.raw(column)} = ${id})::int`;
}
