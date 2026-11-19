import { date, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

export const siteVisits = pgTable(
  "site_visits",
  {
    visitorHash: text("visitor_hash").notNull(),
    day: date("day").notNull(),
  },
  (t) => [primaryKey({ columns: [t.day, t.visitorHash] })],
);
