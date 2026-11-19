import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

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

export const pageKind = pgEnum("page_kind", [
  "about",
  "contact",
  "consultation",
  "brands",
  "clients",
]);

export const pages = pgTable(
  "pages",
  {
    id: id(),
    kind: pageKind("kind").unique(),
    slug: localized("slug").notNull(),
    title: localized("title").notNull(),
    content: localizedRichText("content"),
    coverId: uuid("cover_id").references(() => media.id, { onDelete: "set null" }),
    status: publishStatus("status").notNull().default("draft"),
    seoTitle: localized("seo_title"),
    seoDescription: localized("seo_description"),
    legacyKey: legacyKey(),
    ...timestamps,
  },
  (t) => [...slugIndexes("pages", t.slug)],
);

export const posts = pgTable(
  "posts",
  {
    id: id(),
    slug: localized("slug").notNull(),
    title: localized("title").notNull(),
    excerpt: localized("excerpt"),
    content: localizedRichText("content"),
    coverId: uuid("cover_id").references(() => media.id, { onDelete: "set null" }),
    status: publishStatus("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    seoTitle: localized("seo_title"),
    seoDescription: localized("seo_description"),
    legacyKey: legacyKey(),
    ...timestamps,
  },
  (t) => [index("posts_published_at_idx").on(t.publishedAt), ...slugIndexes("posts", t.slug)],
);

export const clientLogos = pgTable(
  "client_logos",
  {
    id: id(),
    name: text("name").notNull(),
    imageId: uuid("image_id")
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
    url: text("url"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    legacyKey: legacyKey(),
    ...timestamps,
  },
  (t) => [index("client_logos_order_idx").on(t.isActive, t.sortOrder)],
);

export const contactPersons = pgTable(
  "contact_persons",
  {
    id: id(),
    name: localized("name").notNull(),
    role: localized("role").notNull(),
    phones: jsonb("phones").$type<string[]>().notNull().default([]),
    email: text("email"),
    whatsapp: text("whatsapp"),
    photoId: uuid("photo_id").references(() => media.id, { onDelete: "set null" }),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    legacyKey: legacyKey(),
    ...timestamps,
  },
  (t) => [index("contact_persons_order_idx").on(t.isActive, t.sortOrder)],
);

export const heroFilmFormats = ["webp", "avif", "jpg"] as const;

export type HeroFilmFormat = (typeof heroFilmFormats)[number];

export const heroFilmFormat = pgEnum("hero_film_format", heroFilmFormats);

export const heroFilms = pgTable("hero_films", {
  id: id(),
  name: text("name").notNull(),
  keyPrefix: text("key_prefix").notNull().unique(),
  frameCount: integer("frame_count").notNull(),
  frameWidth: integer("frame_width").notNull(),
  frameHeight: integer("frame_height").notNull(),
  format: heroFilmFormat("format").notNull().default("webp"),
  posterId: uuid("poster_id").references(() => media.id, { onDelete: "set null" }),
  ...timestamps,
});
