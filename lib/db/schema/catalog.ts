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
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import type { Localized } from "../../i18n/localized";
import {
  id,
  legacyKey,
  localized,
  localizedRichText,
  publishStatus,
  slugIndexes,
  timestamps,
} from "./columns";
import { media } from "./media";

export type ProductSpec = {
  label: Localized;
  value: Localized;
  unit: Localized | null;
  group?: Localized | null;
};

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
  (t) => [index("categories_parent_id_idx").on(t.parentId), ...slugIndexes("categories", t.slug)],
);

export const brands = pgTable(
  "brands",
  {
    id: id(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logoId: uuid("logo_id").references(() => media.id, { onDelete: "set null" }),
    imageId: uuid("image_id").references(() => media.id, { onDelete: "set null" }),
    description: localized("description"),
    websiteUrl: text("website_url"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    legacyKey: legacyKey(),
    ...timestamps,
  },
  (t) => [index("brands_order_idx").on(t.isActive, t.sortOrder)],
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
    brandId: uuid("brand_id").references(() => brands.id, { onDelete: "set null" }),
    benefits: jsonb("benefits").$type<Localized[]>().notNull().default([]),
    specs: jsonb("specs").$type<ProductSpec[]>().notNull().default([]),
    videoId: uuid("video_id").references(() => media.id, { onDelete: "set null" }),
    videoUrl: text("video_url"),
    videoPosterId: uuid("video_poster_id").references(() => media.id, { onDelete: "set null" }),
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
    index("products_brand_id_idx").on(t.brandId),
    ...slugIndexes("products", t.slug),
    check(
      "products_single_video",
      sql`not (${t.videoId} is not null and ${t.videoUrl} is not null)`,
    ),
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

export const productDocuments = pgTable(
  "product_documents",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
    title: localized("title").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.mediaId] }),
    index("product_documents_media_id_idx").on(t.mediaId),
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
