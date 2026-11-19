import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import type { Localized } from "../../i18n/localized";
import {
  id,
  legacyKey,
  localeKey,
  localized,
  localizedRichText,
  publishStatus,
  timestamps,
} from "./columns";
import { media } from "./media";

export type ProductSpec = { key: Localized; value: Localized };

export const categories = pgTable(
  "categories",
  {
    id: id(),
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, {
      onDelete: "restrict",
    }),
    slug: localized("slug").notNull(),
    name: localized("name").notNull(),
    description: localizedRichText("description"),
    imageId: uuid("image_id").references(() => media.id, { onDelete: "set null" }),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    seoTitle: localized("seo_title"),
    seoDescription: localized("seo_description"),
    legacyKey: legacyKey(),
    ...timestamps,
  },
  (t) => [
    index("categories_parent_id_idx").on(t.parentId),
    uniqueIndex("categories_slug_az_key").on(localeKey(t.slug, "az")),
    uniqueIndex("categories_slug_ru_key").on(localeKey(t.slug, "ru")),
    uniqueIndex("categories_slug_en_key").on(localeKey(t.slug, "en")),
  ],
);

export const products = pgTable(
  "products",
  {
    id: id(),
    slug: localized("slug").notNull(),
    name: localized("name").notNull(),
    shortDescription: localizedRichText("short_description"),
    description: localizedRichText("description"),
    sku: text("sku"),
    specs: jsonb("specs").$type<ProductSpec[]>().notNull().default([]),
    modelId: uuid("model_id").references(() => media.id, { onDelete: "set null" }),
    modelPosterId: uuid("model_poster_id").references(() => media.id, { onDelete: "set null" }),
    status: publishStatus("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    sortOrder: integer("sort_order").notNull().default(0),
    isFeatured: boolean("is_featured").notNull().default(false),
    featuredPosition: integer("featured_position"),
    seoTitle: localized("seo_title"),
    seoDescription: localized("seo_description"),
    legacyKey: legacyKey(),
    ...timestamps,
  },
  (t) => [
    index("products_status_idx").on(t.status),
    index("products_deleted_at_idx").on(t.deletedAt),
    index("products_sku_idx").on(t.sku),
    uniqueIndex("products_slug_az_key").on(localeKey(t.slug, "az")),
    uniqueIndex("products_slug_ru_key").on(localeKey(t.slug, "ru")),
    uniqueIndex("products_slug_en_key").on(localeKey(t.slug, "en")),
  ],
);

export const productCategories = pgTable(
  "product_categories",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.categoryId] }),
    index("product_categories_category_id_idx").on(t.categoryId),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.mediaId] }),
    index("product_images_media_id_idx").on(t.mediaId),
  ],
);

export const productRelations = pgTable(
  "product_relations",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    relatedId: uuid("related_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.relatedId] }),
    check("product_relations_not_self", sql`${t.productId} <> ${t.relatedId}`),
  ],
);
