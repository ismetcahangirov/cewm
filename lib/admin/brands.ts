import "server-only";

import { asc, eq, sql } from "drizzle-orm";

import type { DomainError } from "@/lib/api/server";
import { getDb } from "@/lib/db";
import { uniqueViolation } from "@/lib/db/errors";
import { brands, media, products } from "@/lib/db/schema";
import type { BrandDto, BrandOptionDto, BrandValues } from "@/lib/validation/brands";

import { checkImage } from "./content";
import { toMediaDto } from "./media";
import { nextSortOrder } from "./ordering";

const missing: DomainError = { status: 404, message: "Brend tapılmadı." };

const productCount = sql<number>`(select count(*) from ${products} p
  where p.brand_id = brands.id and p.deleted_at is null)::int`;

export async function listBrands(): Promise<BrandDto[]> {
  const rows = await getDb()
    .select({ brand: brands, logo: media, productCount })
    .from(brands)
    .leftJoin(media, eq(media.id, brands.logoId))
    .orderBy(asc(brands.sortOrder), asc(brands.createdAt));
  return rows.map(({ brand, logo, productCount: count }) => ({
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    description: brand.description,
    websiteUrl: brand.websiteUrl,
    sortOrder: brand.sortOrder,
    isActive: brand.isActive,
    productCount: count,
    logo: logo ? toMediaDto(logo) : null,
  }));
}

export async function brandOptions(): Promise<BrandOptionDto[]> {
  return getDb()
    .select({ id: brands.id, name: brands.name })
    .from(brands)
    .orderBy(asc(brands.sortOrder), asc(brands.name));
}

function slugConflict(error: unknown): DomainError | null {
  if (uniqueViolation(error) === null) return null;
  return {
    status: 409,
    message: "Bu ünvan (slug) artıq başqa brenddə istifadə olunur.",
    fields: { slug: "Bu ünvan artıq istifadə olunur." },
  };
}

export async function createBrand(
  values: BrandValues,
): Promise<{ id: string } | { error: DomainError }> {
  const error = await checkImage("logoId", values.logoId);
  if (error) return { error };
  try {
    const [row] = await getDb()
      .insert(brands)
      .values({ ...values, sortOrder: nextSortOrder(brands) })
      .returning({ id: brands.id });
    if (!row) throw new Error("Brand was not created");
    return { id: row.id };
  } catch (cause) {
    const conflict = slugConflict(cause);
    if (conflict) return { error: conflict };
    throw cause;
  }
}

export async function updateBrand(
  id: string,
  values: BrandValues,
): Promise<{ id: string } | { error: DomainError }> {
  const error = await checkImage("logoId", values.logoId);
  if (error) return { error };
  try {
    const updated = await getDb()
      .update(brands)
      .set(values)
      .where(eq(brands.id, id))
      .returning({ id: brands.id });
    return updated.length ? { id } : { error: missing };
  } catch (cause) {
    const conflict = slugConflict(cause);
    if (conflict) return { error: conflict };
    throw cause;
  }
}
