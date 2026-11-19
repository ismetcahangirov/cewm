import "server-only";

import { and, asc, eq, inArray, isNull, ne, sql } from "drizzle-orm";

import type { DomainError } from "@/lib/api/server";
import { getDb } from "@/lib/db";
import { uniqueViolation } from "@/lib/db/errors";
import { categories, media, menuItems, productCategories, products } from "@/lib/db/schema";
import { locales } from "@/lib/i18n/config";
import { routes } from "@/lib/routes";
import type {
  CategoryDetailDto,
  CategoryNodeDto,
  CategoryValues,
  ReorderCategoriesInput,
} from "@/lib/validation/categories";

import { findMedia, toMediaDto } from "./media";

export type CategoryError = DomainError;

function invalid(field: string, message: string): CategoryError {
  return { status: 400, message, fields: { [field]: message } };
}

function slugConflict(cause: unknown): CategoryError | null {
  const constraint = uniqueViolation(cause);
  if (constraint === null) return null;
  const locale = locales.find((value) => constraint === `categories_slug_${value}_key`) ?? "az";
  return {
    status: 409,
    message: "Bu ünvan (slug) artıq başqa kateqoriyada istifadə olunur.",
    fields: { [`slug.${locale}`]: "Bu ünvan artıq istifadə olunur." },
  };
}

const productCount = sql<number>`(select count(*) from ${productCategories} pc
  join ${products} p on p.id = pc.product_id
  where pc.category_id = categories.id and p.deleted_at is null)::int`;

export async function listCategoryNodes(): Promise<CategoryNodeDto[]> {
  const rows = await getDb()
    .select({
      id: categories.id,
      parentId: categories.parentId,
      name: categories.name,
      slug: categories.slug,
      isActive: categories.isActive,
      sortOrder: categories.sortOrder,
      imageKey: media.key,
      imageAlt: media.alt,
      productCount,
      menuItemCount: sql<number>`(select count(*) from ${menuItems} mi where mi.category_id = categories.id)::int`,
    })
    .from(categories)
    .leftJoin(media, eq(media.id, categories.imageId))
    .orderBy(asc(categories.sortOrder), asc(categories.createdAt));

  return rows.map((row) => ({
    id: row.id,
    parentId: row.parentId,
    name: row.name,
    slug: row.slug,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    image: row.imageKey ? { src: routes.media(row.imageKey), alt: row.imageAlt?.az ?? null } : null,
    productCount: Number(row.productCount),
    menuItemCount: Number(row.menuItemCount),
  }));
}

type CategoryRow = typeof categories.$inferSelect;

async function findCategory(id: string): Promise<CategoryRow | undefined> {
  const [row] = await getDb().select().from(categories).where(eq(categories.id, id));
  return row;
}

export async function getCategory(id: string): Promise<CategoryDetailDto | null> {
  const row = await findCategory(id);
  if (!row) return null;
  const [image, [count]] = await Promise.all([
    row.imageId ? findMedia(row.imageId) : undefined,
    getDb().select({ value: productCount }).from(categories).where(eq(categories.id, id)),
  ]);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    parentId: row.parentId,
    imageId: row.imageId,
    image: image ? toMediaDto(image) : null,
    isActive: row.isActive,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    productCount: Number(count?.value ?? 0),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function hasChildren(id: string): Promise<boolean> {
  const [child] = await getDb()
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.parentId, id))
    .limit(1);
  return Boolean(child);
}

async function checkParent(
  id: string | null,
  parentId: string | null,
): Promise<CategoryError | null> {
  if (!parentId) return null;
  if (parentId === id) {
    return invalid("parentId", "Kateqoriya öz-özünün alt kateqoriyası ola bilməz.");
  }
  const parent = await findCategory(parentId);
  if (!parent) return invalid("parentId", "Üst kateqoriya tapılmadı.");
  if (parent.parentId) {
    return invalid(
      "parentId",
      "Yalnız iki səviyyə olar: alt kateqoriyanın altına kateqoriya qoymaq olmaz.",
    );
  }
  if (id && (await hasChildren(id))) {
    return invalid("parentId", "Alt kateqoriyaları olan kateqoriya başqasının altına keçə bilməz.");
  }
  return null;
}

async function checkImage(imageId: string | null): Promise<CategoryError | null> {
  if (!imageId) return null;
  const image = await findMedia(imageId);
  if (!image || !image.mimeType.startsWith("image/")) {
    return invalid("imageId", "Şəkil tapılmadı.");
  }
  return null;
}

function nextSortOrder(parentId: string | null) {
  return sql<number>`(select coalesce(max(${categories.sortOrder}), -1) + 1 from ${categories}
    where ${parentId ? sql`${categories.parentId} = ${parentId}` : sql`${categories.parentId} is null`})`;
}

function columnsFrom(values: CategoryValues) {
  return {
    name: values.name,
    slug: values.slug,
    description: values.description,
    parentId: values.parentId,
    imageId: values.imageId,
    isActive: values.isActive,
    seoTitle: values.seoTitle,
    seoDescription: values.seoDescription,
  };
}

export async function createCategory(
  values: CategoryValues,
): Promise<{ id: string } | { error: CategoryError }> {
  const error = (await checkParent(null, values.parentId)) ?? (await checkImage(values.imageId));
  if (error) return { error };
  try {
    const [row] = await getDb()
      .insert(categories)
      .values({ ...columnsFrom(values), sortOrder: nextSortOrder(values.parentId) })
      .returning({ id: categories.id });
    if (!row) throw new Error("Category was not created");
    return { id: row.id };
  } catch (cause) {
    const conflict = slugConflict(cause);
    if (conflict) return { error: conflict };
    throw cause;
  }
}

export async function updateCategory(
  id: string,
  values: CategoryValues,
): Promise<{ id: string } | { error: CategoryError }> {
  const current = await findCategory(id);
  if (!current) return { error: { status: 404, message: "Kateqoriya tapılmadı." } };
  const parentChanged = current.parentId !== values.parentId;
  const error =
    (parentChanged ? await checkParent(id, values.parentId) : null) ??
    (await checkImage(values.imageId));
  if (error) return { error };
  try {
    await getDb()
      .update(categories)
      .set({
        ...columnsFrom(values),
        ...(parentChanged ? { sortOrder: nextSortOrder(values.parentId) } : {}),
      })
      .where(eq(categories.id, id));
    return { id };
  } catch (cause) {
    const conflict = slugConflict(cause);
    if (conflict) return { error: conflict };
    throw cause;
  }
}

export async function setCategoryActive(id: string, isActive: boolean): Promise<boolean> {
  const updated = await getDb()
    .update(categories)
    .set({ isActive })
    .where(eq(categories.id, id))
    .returning({ id: categories.id });
  return updated.length > 0;
}

export async function reorderCategories(
  input: ReorderCategoriesInput,
): Promise<{ ok: true } | { error: CategoryError }> {
  const { parentId, orderedIds } = input;
  if (new Set(orderedIds).size !== orderedIds.length) {
    return { error: { status: 400, message: "Sıra təkrarlanan kateqoriya ehtiva edir." } };
  }
  if (parentId && orderedIds.includes(parentId)) {
    return { error: { status: 400, message: "Kateqoriya öz-özünün altına keçə bilməz." } };
  }
  const db = getDb();
  const rows = await db
    .select({ id: categories.id, parentId: categories.parentId })
    .from(categories)
    .where(inArray(categories.id, orderedIds));
  if (rows.length !== orderedIds.length) {
    return { error: { status: 404, message: "Kateqoriyalardan biri tapılmadı." } };
  }

  const siblings = await db
    .select({ id: categories.id })
    .from(categories)
    .where(parentId ? eq(categories.parentId, parentId) : isNull(categories.parentId));
  const missing = siblings.filter((sibling) => !orderedIds.includes(sibling.id));
  if (missing.length) {
    return {
      error: { status: 409, message: "Siyahı köhnədir. Səhifəni yeniləyib yenidən cəhd edin." },
    };
  }

  if (parentId) {
    const parent = await findCategory(parentId);
    if (!parent) return { error: { status: 404, message: "Üst kateqoriya tapılmadı." } };
    if (parent.parentId) {
      return {
        error: {
          status: 400,
          message: "Yalnız iki səviyyə olar: alt kateqoriyanın altına kateqoriya qoymaq olmaz.",
        },
      };
    }
    const movedWithChildren = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(inArray(categories.parentId, orderedIds), ne(categories.id, parentId)))
      .limit(1);
    if (movedWithChildren.length) {
      return {
        error: {
          status: 400,
          message: "Alt kateqoriyaları olan kateqoriya başqasının altına keçə bilməz.",
        },
      };
    }
  }

  await db.transaction(async (tx) => {
    for (const [index, id] of orderedIds.entries()) {
      await tx.update(categories).set({ parentId, sortOrder: index }).where(eq(categories.id, id));
    }
  });
  return { ok: true };
}

export async function deleteCategory(
  id: string,
  moveProductsTo: string | null,
): Promise<{ ok: true } | { error: CategoryError }> {
  const current = await findCategory(id);
  if (!current) return { error: { status: 404, message: "Kateqoriya tapılmadı." } };
  if (moveProductsTo) {
    if (moveProductsTo === id) {
      return {
        error: invalid("moveProductsTo", "Məhsulları başqa kateqoriyaya köçürün."),
      };
    }
    if (!(await findCategory(moveProductsTo))) {
      return {
        error: invalid("moveProductsTo", "Hədəf kateqoriya tapılmadı."),
      };
    }
  }

  await getDb().transaction(async (tx) => {
    if (moveProductsTo) {
      await tx.execute(sql`insert into ${productCategories} (product_id, category_id)
        select product_id, ${moveProductsTo}::uuid from ${productCategories} where category_id = ${id}
        on conflict do nothing`);
    }
    const children = await tx
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.parentId, id))
      .orderBy(asc(categories.sortOrder));
    for (const child of children) {
      await tx
        .update(categories)
        .set({ parentId: current.parentId, sortOrder: nextSortOrder(current.parentId) })
        .where(eq(categories.id, child.id));
    }
    await tx.delete(categories).where(eq(categories.id, id));
  });
  return { ok: true };
}
