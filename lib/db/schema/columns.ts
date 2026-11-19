import { sql, type SQL } from "drizzle-orm";
import { jsonb, pgEnum, text, timestamp, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";

import type { RichTextDoc } from "../../content/rich-text";
import type { Localized } from "../../i18n/localized";

export const publishStatus = pgEnum("publish_status", ["draft", "published"]);

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

export function localeKey(column: AnyPgColumn, locale: "az" | "ru" | "en"): SQL {
  return sql`(${column} ->> ${sql.raw(`'${locale}'`)})`;
}
