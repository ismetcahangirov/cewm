import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import { categories } from "./catalog";
import { id, legacyKey, localized, timestamps } from "./columns";
import { pages } from "./content";

export const menuItemTarget = pgEnum("menu_item_target", ["none", "category", "page", "url"]);

export const menus = pgTable("menus", {
  id: id(),
  key: text("key").notNull().unique(),
  title: localized("title").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  legacyKey: legacyKey(),
  ...timestamps,
});

export const menuItems = pgTable(
  "menu_items",
  {
    id: id(),
    menuId: uuid("menu_id")
      .notNull()
      .references(() => menus.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references((): AnyPgColumn => menuItems.id, {
      onDelete: "cascade",
    }),
    label: localized("label").notNull(),
    target: menuItemTarget("target").notNull().default("none"),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "cascade" }),
    pageId: uuid("page_id").references(() => pages.id, { onDelete: "cascade" }),
    url: text("url"),
    sortOrder: integer("sort_order").notNull().default(0),
    legacyKey: legacyKey(),
    ...timestamps,
  },
  (t) => [
    index("menu_items_menu_id_idx").on(t.menuId, t.parentId, t.sortOrder),
    check(
      "menu_items_target_ref",
      sql`(${t.target} <> 'category' or ${t.categoryId} is not null)
        and (${t.target} <> 'page' or ${t.pageId} is not null)
        and (${t.target} <> 'url' or ${t.url} is not null)`,
    ),
  ],
);

export const redirects = pgTable(
  "redirects",
  {
    id: id(),
    fromPath: text("from_path").notNull().unique(),
    toPath: text("to_path").notNull(),
    statusCode: smallint("status_code").notNull().default(301),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("redirects_status_code", sql`${t.statusCode} in (301, 302, 307, 308)`)],
);
