import { sql, type SQL } from "drizzle-orm";
import {
  jsonb,
  pgEnum,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import type { RichTextDoc } from "../../content/rich-text";
import { locales, type Locale } from "../../i18n/config";
import type { Localized } from "../../i18n/localized";

export const publishStatus = pgEnum("publish_status", ["draft", "published"]);

export const contentLocale = pgEnum("content_locale", locales);

export const id = () => uuid("id").primaryKey().defaultRandom();

export const localized = (name: string) => jsonb(name).$type<Localized>();

export const localizedRichText = (name: string) => jsonb(name).$type<Localized<RichTextDoc>>();

export const legacyKey = () => text("legacy_key").unique();

export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export function localeKey(column: AnyPgColumn, locale: Locale): SQL {
  return sql`(${column} ->> ${sql.raw(`'${locale}'`)})`;
}

export function slugIndexes(table: string, column: AnyPgColumn) {
  return locales.map((locale) =>
    uniqueIndex(`${table}_slug_${locale}_key`).on(localeKey(column, locale)),
  );
}
