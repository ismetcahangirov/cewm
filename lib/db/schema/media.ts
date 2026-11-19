import { index, integer, pgEnum, pgTable, text, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";

import { id, legacyKey, localized, timestamps } from "./columns";

export const mediaCleanupStatus = pgEnum("media_cleanup_status", [
  "cleaned",
  "needs-reshoot",
  "not-applicable",
]);

export const media = pgTable(
  "media",
  {
    id: id(),
    key: text("key").notNull().unique(),
    mimeType: text("mime_type").notNull(),
    width: integer("width"),
    height: integer("height"),
    size: integer("size").notNull(),
    sha256: text("sha256").notNull(),
    alt: localized("alt"),
    lqip: text("lqip"),
    originalId: uuid("original_id").references((): AnyPgColumn => media.id, {
      onDelete: "set null",
    }),
    cleanupStatus: mediaCleanupStatus("cleanup_status"),
    cleanupNote: text("cleanup_note"),
    sourceUrl: text("source_url").unique(),
    legacyKey: legacyKey(),
    ...timestamps,
  },
  (t) => [index("media_original_id_idx").on(t.originalId)],
);
