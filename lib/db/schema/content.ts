import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

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

export const projectType = pgEnum("project_type", ["completed", "3d-visual"]);

export const pageKind = pgEnum("page_kind", [
  "about",
  "references",
  "partners",
  "quote",
  "contact",
]);

export const employmentType = pgEnum("employment_type", [
  "full-time",
  "part-time",
  "contract",
  "internship",
]);

export const logoGroup = pgEnum("logo_group", ["references", "partners"]);

export const projects = pgTable(
  "projects",
  {
    id: id(),
    slug: localized("slug").notNull(),
    title: localized("title").notNull(),
    excerpt: localized("excerpt"),
    body: localizedRichText("body"),
    clientName: text("client_name"),
    type: projectType("type").notNull().default("completed"),
    coverId: uuid("cover_id").references(() => media.id, { onDelete: "set null" }),
    status: publishStatus("status").notNull().default("draft"),
    sortOrder: integer("sort_order").notNull().default(0),
    seoTitle: localized("seo_title"),
    seoDescription: localized("seo_description"),
    legacyKey: legacyKey(),
    ...timestamps,
  },
  (t) => [
    index("projects_type_idx").on(t.type),
    uniqueIndex("projects_slug_az_key").on(localeKey(t.slug, "az")),
    uniqueIndex("projects_slug_ru_key").on(localeKey(t.slug, "ru")),
    uniqueIndex("projects_slug_en_key").on(localeKey(t.slug, "en")),
  ],
);

export const projectImages = pgTable(
  "project_images",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    caption: localized("caption"),
  },
  (t) => [
    primaryKey({ columns: [t.projectId, t.mediaId] }),
    index("project_images_media_id_idx").on(t.mediaId),
  ],
);

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
  (t) => [
    uniqueIndex("pages_slug_az_key").on(localeKey(t.slug, "az")),
    uniqueIndex("pages_slug_ru_key").on(localeKey(t.slug, "ru")),
    uniqueIndex("pages_slug_en_key").on(localeKey(t.slug, "en")),
  ],
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
  (t) => [
    index("posts_published_at_idx").on(t.publishedAt),
    uniqueIndex("posts_slug_az_key").on(localeKey(t.slug, "az")),
    uniqueIndex("posts_slug_ru_key").on(localeKey(t.slug, "ru")),
    uniqueIndex("posts_slug_en_key").on(localeKey(t.slug, "en")),
  ],
);

export const vacancies = pgTable(
  "vacancies",
  {
    id: id(),
    slug: localized("slug").notNull(),
    title: localized("title").notNull(),
    summary: localized("summary"),
    content: localizedRichText("content"),
    location: localized("location"),
    employmentType: employmentType("employment_type").notNull().default("full-time"),
    salary: localized("salary"),
    applyEmail: text("apply_email"),
    closesOn: date("closes_on"),
    coverId: uuid("cover_id").references(() => media.id, { onDelete: "set null" }),
    status: publishStatus("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    seoTitle: localized("seo_title"),
    seoDescription: localized("seo_description"),
    ...timestamps,
  },
  (t) => [
    index("vacancies_status_idx").on(t.status, t.publishedAt),
    uniqueIndex("vacancies_slug_az_key").on(localeKey(t.slug, "az")),
    uniqueIndex("vacancies_slug_ru_key").on(localeKey(t.slug, "ru")),
    uniqueIndex("vacancies_slug_en_key").on(localeKey(t.slug, "en")),
  ],
);

export const logos = pgTable(
  "logos",
  {
    id: id(),
    name: text("name").notNull(),
    imageId: uuid("image_id")
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
    url: text("url"),
    group: logoGroup("group").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    legacyKey: legacyKey(),
    ...timestamps,
  },
  (t) => [index("logos_group_idx").on(t.group, t.sortOrder)],
);

export const teamMembers = pgTable(
  "team_members",
  {
    id: id(),
    name: text("name").notNull(),
    role: localized("role").notNull(),
    bio: localized("bio"),
    photoId: uuid("photo_id").references(() => media.id, { onDelete: "set null" }),
    startedYear: integer("started_year"),
    phone: text("phone"),
    email: text("email"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("team_members_order_idx").on(t.isActive, t.sortOrder)],
);
