import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import type { DomainError } from "@/lib/api/server";
import type { Page } from "@/lib/api/types";
import { getDb } from "@/lib/db";
import { uniqueViolation } from "@/lib/db/errors";
import { containsPattern } from "@/lib/db/like";
import {
  categories,
  media,
  productCategories,
  productImages,
  productRelations,
  products,
} from "@/lib/db/schema";
import { localeKey } from "@/lib/db/schema/columns";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { locales, type Locale } from "@/lib/i18n/config";
import type { Localized } from "@/lib/i18n/localized";
import { routes } from "@/lib/routes";
import { mediaKindOf } from "@/lib/validation/media";
import type {
  BulkProductsInput,
  BulkProductsResult,
  ProductDetailDto,
  ProductListArgs,
  ProductListItemDto,
  ProductOptionDto,
  ProductSortField,
  ProductValues,
} from "@/lib/validation/products";

import { findMediaByIds, toMediaDto } from "./media";
import { freeSlug } from "./slugs";

export const trashRetentionDays = 30;

export type ProductError = DomainError;

const sortColumns: Record<ProductSortField, SQL | AnyPgColumn> = {
  updatedAt: products.updatedAt,
  name: sql`lower(${localeKey(products.name, "az")})`,
  sku: products.sku,
  status: products.status,
};

const thumbnailKey = sql<string | null>`(select m.key from ${productImages} pi
  join ${media} m on m.id = pi.media_id
  where pi.product_id = products.id order by pi.position limit 1)`;

const thumbnailAlt = sql<string | null>`(select m.alt ->> 'az' from ${productImages} pi
  join ${media} m on m.id = pi.media_id
  where pi.product_id = products.id order by pi.position limit 1)`;

const categoryNames = sql<Localized[] | null>`(select jsonb_agg(c.name order by c.sort_order)
  from ${productCategories} pc join ${categories} c on c.id = pc.category_id
  where pc.product_id = products.id)`;

export async function purgeExpiredTrash(): Promise<number> {
  const cutoff = new Date(Date.now() - trashRetentionDays * 24 * 60 * 60 * 1000);
  const removed = await getDb()
    .delete(products)
    .where(and(isNotNull(products.deletedAt), lt(products.deletedAt, cutoff)))
    .returning({ id: products.id });
  return removed.length;
}

function listFilters(args: ProductListArgs): SQL | undefined {
  const filters: SQL[] = [];
  const status = args.status ?? "all";
  if (status === "trash") filters.push(isNotNull(products.deletedAt));
  else {
    filters.push(isNull(products.deletedAt));
    if (status !== "all") filters.push(eq(products.status, status));
  }
  if (args.categoryId) {
    filters.push(
      sql`exists (select 1 from ${productCategories} pc where pc.product_id = products.id
        and (pc.category_id = ${args.categoryId}
          or pc.category_id in (select id from ${categories} where parent_id = ${args.categoryId})))`,
    );
  }
  if (args.excludeId) filters.push(ne(products.id, args.excludeId));
  if (args.search) {
    const pattern = containsPattern(args.search);
    const match = or(
      ...locales.map((locale) => ilike(localeKey(products.name, locale), pattern)),
      ilike(products.sku, pattern),
      ilike(localeKey(products.slug, "az"), pattern),
    );
    if (match) filters.push(match);
  }
  return and(...filters);
}

export async function listProducts(args: ProductListArgs): Promise<Page<ProductListItemDto>> {
  if (args.status === "trash") await purgeExpiredTrash();
  const db = getDb();
  const where = listFilters(args);
  const direction = args.order === "desc" ? desc : asc;

  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        sku: products.sku,
        status: products.status,
        isFeatured: products.isFeatured,
        updatedAt: products.updatedAt,
        deletedAt: products.deletedAt,
        thumbnailKey,
        thumbnailAlt,
        categoryNames,
      })
      .from(products)
      .where(where)
      .orderBy(direction(sortColumns[args.sort]), asc(products.id))
      .limit(args.pageSize)
      .offset(args.page * args.pageSize),
    db.select({ value: count() }).from(products).where(where),
  ]);

  return {
    rows: rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      sku: row.sku,
      status: row.status,
      isFeatured: row.isFeatured,
      thumbnail: row.thumbnailKey
        ? { src: routes.media(row.thumbnailKey), alt: row.thumbnailAlt }
        : null,
      categories: row.categoryNames ?? [],
      updatedAt: row.updatedAt.toISOString(),
      deletedAt: row.deletedAt?.toISOString() ?? null,
    })),
    rowCount: total?.value ?? 0,
  };
}

export async function productOptions(ids: string[]): Promise<ProductOptionDto[]> {
  if (!ids.length) return [];
  const rows = await getDb()
    .select({ id: products.id, name: products.name, sku: products.sku, thumbnailKey, thumbnailAlt })
    .from(products)
    .where(inArray(products.id, ids));
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    if (!row) return [];
    return [
      {
        id: row.id,
        name: row.name,
        sku: row.sku,
        thumbnail: row.thumbnailKey
          ? { src: routes.media(row.thumbnailKey), alt: row.thumbnailAlt }
          : null,
      },
    ];
  });
}

export async function getProduct(id: string): Promise<ProductDetailDto | null> {
  const db = getDb();
  const [row] = await db.select().from(products).where(eq(products.id, id));
  if (!row) return null;

  const [categoryRows, imageRows, relatedRows] = await Promise.all([
    db
      .select({ id: productCategories.categoryId })
      .from(productCategories)
      .where(eq(productCategories.productId, id)),
    db
      .select({ mediaId: productImages.mediaId })
      .from(productImages)
      .where(eq(productImages.productId, id))
      .orderBy(asc(productImages.position)),
    db
      .select({ id: productRelations.relatedId })
      .from(productRelations)
      .where(eq(productRelations.productId, id))
      .orderBy(asc(productRelations.position)),
  ]);

  const mediaIds = [
    ...imageRows.map((image) => image.mediaId),
    ...[row.modelId, row.modelPosterId].filter((value): value is string => Boolean(value)),
  ];
  const [mediaRows, related] = await Promise.all([
    findMediaByIds(mediaIds),
    productOptions(relatedRows.map((related) => related.id)),
  ]);
  const mediaById = new Map(mediaRows.map((item) => [item.id, item]));

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    shortDescription: row.shortDescription,
    description: row.description,
    categoryIds: categoryRows.map((category) => category.id),
    specs: row.specs,
    images: imageRows.map((image) => ({
      mediaId: image.mediaId,
      alt: mediaById.get(image.mediaId)?.alt ?? { az: "" },
    })),
    media: mediaRows.map(toMediaDto),
    modelId: row.modelId,
    modelPosterId: row.modelPosterId,
    related,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    status: row.status,
    isFeatured: row.isFeatured,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    deletedAt: row.deletedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function checkReferences(
  id: string | null,
  values: ProductValues,
): Promise<Record<string, string> | null> {
  const db = getDb();
  const fields: Record<string, string> = {};

  if (values.categoryIds.length) {
    const found = await db
      .select({ id: categories.id })
      .from(categories)
      .where(inArray(categories.id, values.categoryIds));
    if (found.length !== values.categoryIds.length) fields.categoryIds = "Kateqoriya tapılmadı.";
  }

  const mediaIds = [
    ...values.images.map((image) => image.mediaId),
    ...[values.modelId, values.modelPosterId].filter((value): value is string => Boolean(value)),
  ];
  const mediaRows = await findMediaByIds(mediaIds);
  const kindById = new Map(mediaRows.map((row) => [row.id, mediaKindOf(row.mimeType)]));
  const isImage = (mediaId: string) =>
    kindById.get(mediaId) === "image" ||
    mediaRows.find((row) => row.id === mediaId)?.mimeType === "image/svg+xml";
  values.images.forEach((image, index) => {
    if (!isImage(image.mediaId)) fields[`images.${index}.mediaId`] = "Şəkil tapılmadı.";
  });
  if (values.modelId && kindById.get(values.modelId) !== "model") {
    fields.modelId = "3D model GLB faylı olmalıdır.";
  }
  if (values.modelPosterId && !isImage(values.modelPosterId)) {
    fields.modelPosterId = "Poster şəkil olmalıdır.";
  }

  if (values.relatedIds.length) {
    if (id && values.relatedIds.includes(id)) {
      fields.relatedIds = "Məhsul özü ilə əlaqələndirilə bilməz.";
    } else {
      const found = await db
        .select({ id: products.id })
        .from(products)
        .where(inArray(products.id, values.relatedIds));
      if (found.length !== values.relatedIds.length) fields.relatedIds = "Məhsul tapılmadı.";
    }
  }

  return Object.keys(fields).length ? fields : null;
}

function slugConflict(error: unknown): ProductError | null {
  const constraint = uniqueViolation(error);
  if (constraint === null) return null;
  const locale = locales.find((value) => constraint === `products_slug_${value}_key`);
  const field = `slug.${locale ?? "az"}`;
  return {
    status: 409,
    message: "Bu ünvan (slug) artıq başqa məhsulda istifadə olunur.",
    fields: { [field]: "Bu ünvan artıq istifadə olunur." },
  };
}

export async function saveProduct(
  id: string | null,
  values: ProductValues,
): Promise<{ id: string } | { error: ProductError }> {
  const db = getDb();
  let current: typeof products.$inferSelect | undefined;
  if (id) {
    [current] = await db.select().from(products).where(eq(products.id, id));
    if (!current) return { error: { status: 404, message: "Məhsul tapılmadı." } };
  }
  const fields = await checkReferences(id, values);
  if (fields) return { error: { status: 400, message: "Məlumatlar düzgün deyil.", fields } };

  const columns = {
    name: values.name,
    slug: values.slug,
    sku: values.sku,
    shortDescription: values.shortDescription,
    description: values.description,
    specs: values.specs,
    modelId: values.modelId,
    modelPosterId: values.modelId ? values.modelPosterId : null,
    seoTitle: values.seoTitle,
    seoDescription: values.seoDescription,
    status: values.status,
    isFeatured: values.isFeatured,
    ...(values.isFeatured ? {} : { featuredPosition: null }),
    publishedAt:
      values.status === "published" ? (current?.publishedAt ?? new Date()) : current?.publishedAt,
  };

  try {
    const savedId = await db.transaction(async (tx) => {
      let productId = id;
      if (productId) {
        await tx.update(products).set(columns).where(eq(products.id, productId));
      } else {
        const [row] = await tx.insert(products).values(columns).returning({ id: products.id });
        if (!row) throw new Error("Product was not created");
        productId = row.id;
      }

      await tx.delete(productCategories).where(eq(productCategories.productId, productId));
      if (values.categoryIds.length) {
        await tx
          .insert(productCategories)
          .values(values.categoryIds.map((categoryId) => ({ productId: productId, categoryId })));
      }

      await tx.delete(productImages).where(eq(productImages.productId, productId));
      if (values.images.length) {
        await tx.insert(productImages).values(
          values.images.map((image, position) => ({
            productId: productId,
            mediaId: image.mediaId,
            position,
          })),
        );
      }
      for (const image of values.images) {
        await tx
          .update(media)
          .set({ alt: image.alt as Localized })
          .where(
            and(
              eq(media.id, image.mediaId),
              sql`${media.alt} is distinct from ${JSON.stringify(image.alt)}::jsonb`,
            ),
          );
      }

      await tx.delete(productRelations).where(eq(productRelations.productId, productId));
      if (values.relatedIds.length) {
        await tx.insert(productRelations).values(
          values.relatedIds.map((relatedId, position) => ({
            productId: productId,
            relatedId,
            position,
          })),
        );
      }
      return productId;
    });
    return { id: savedId };
  } catch (error) {
    const conflict = slugConflict(error);
    if (conflict) return { error: conflict };
    throw error;
  }
}

function copyName(name: Localized): Localized {
  const suffix: Record<Locale, string> = { az: "(kopiya)", ru: "(копия)", en: "(copy)" };
  return {
    az: `${name.az} ${suffix.az}`,
    ru: name.ru ? `${name.ru} ${suffix.ru}` : null,
    en: name.en ? `${name.en} ${suffix.en}` : null,
  };
}

export async function duplicateProduct(id: string): Promise<{ id: string } | null> {
  const db = getDb();
  const [source] = await db.select().from(products).where(eq(products.id, id));
  if (!source) return null;

  const slug: Localized = {
    az: await freeSlug("product", "az", `${source.slug.az}-kopiya`),
    ru: source.slug.ru ? await freeSlug("product", "ru", `${source.slug.ru}-kopiya`) : null,
    en: source.slug.en ? await freeSlug("product", "en", `${source.slug.en}-copy`) : null,
  };

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(products)
      .values({
        name: copyName(source.name),
        slug,
        sku: source.sku,
        shortDescription: source.shortDescription,
        description: source.description,
        specs: source.specs,
        modelId: source.modelId,
        modelPosterId: source.modelPosterId,
        seoTitle: source.seoTitle,
        seoDescription: source.seoDescription,
        status: "draft",
        isFeatured: false,
        sortOrder: source.sortOrder,
      })
      .returning({ id: products.id });
    if (!row) throw new Error("Product copy was not created");
    await tx.execute(sql`insert into ${productCategories} (product_id, category_id)
      select ${row.id}::uuid, category_id from ${productCategories} where product_id = ${id}`);
    await tx.execute(sql`insert into ${productImages} (product_id, media_id, position)
      select ${row.id}::uuid, media_id, position from ${productImages} where product_id = ${id}`);
    await tx.execute(sql`insert into ${productRelations} (product_id, related_id, position)
      select ${row.id}::uuid, related_id, position from ${productRelations}
      where product_id = ${id} and related_id <> ${row.id}::uuid`);
    return { id: row.id };
  });
}

export async function bulkUpdateProducts(input: BulkProductsInput): Promise<BulkProductsResult> {
  const db = getDb();
  const ids = [...new Set(input.ids)];
  const active = and(inArray(products.id, ids), isNull(products.deletedAt));
  const trashed = and(inArray(products.id, ids), isNotNull(products.deletedAt));
  let updated: { id: string }[] = [];

  switch (input.action) {
    case "publish": {
      const withImages = sql`exists (select 1 from ${productImages} pi where pi.product_id = products.id)`;
      updated = await db
        .update(products)
        .set({ status: "published", publishedAt: sql`coalesce(${products.publishedAt}, now())` })
        .where(and(active, withImages))
        .returning({ id: products.id });
      const skipped = ids.length - updated.length;
      return {
        updated: updated.length,
        skipped,
        message: skipped
          ? `${skipped} məhsul dərc olunmadı: şəkli yoxdur və ya silinib.`
          : undefined,
      };
    }
    case "unpublish":
      updated = await db
        .update(products)
        .set({ status: "draft" })
        .where(active)
        .returning({ id: products.id });
      break;
    case "feature":
    case "unfeature":
      updated = await db
        .update(products)
        .set(
          input.action === "feature"
            ? { isFeatured: true }
            : { isFeatured: false, featuredPosition: null },
        )
        .where(active)
        .returning({ id: products.id });
      break;
    case "trash":
      updated = await db
        .update(products)
        .set({ deletedAt: new Date() })
        .where(active)
        .returning({ id: products.id });
      break;
    case "restore":
      updated = await db
        .update(products)
        .set({ deletedAt: null, status: "draft" })
        .where(trashed)
        .returning({ id: products.id });
      break;
    case "purge":
      updated = await db.delete(products).where(trashed).returning({ id: products.id });
      break;
  }
  return { updated: updated.length, skipped: ids.length - updated.length };
}

export async function productExists(id: string): Promise<boolean> {
  const [row] = await getDb().select({ id: products.id }).from(products).where(eq(products.id, id));
  return Boolean(row);
}
