import { index, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { products } from "./catalog";
import { id, legacyKey, timestamps } from "./columns";

export const quoteRequestStatus = pgEnum("quote_request_status", ["new", "in-progress", "done"]);

export const contentLocale = pgEnum("content_locale", ["az", "ru", "en"]);

export const quoteRequests = pgTable(
  "quote_requests",
  {
    id: id(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    company: text("company"),
    message: text("message"),
    status: quoteRequestStatus("status").notNull().default("new"),
    locale: contentLocale("locale").notNull().default("az"),
    internalNote: text("internal_note"),
    ipHash: text("ip_hash"),
    legacyKey: legacyKey(),
    ...timestamps,
  },
  (t) => [
    index("quote_requests_status_idx").on(t.status, t.createdAt),
    index("quote_requests_ip_hash_idx").on(t.ipHash, t.createdAt),
  ],
);

export const quoteRequestProducts = pgTable(
  "quote_request_products",
  {
    id: id(),
    quoteRequestId: uuid("quote_request_id")
      .notNull()
      .references(() => quoteRequests.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    productName: text("product_name").notNull(),
  },
  (t) => [index("quote_request_products_request_idx").on(t.quoteRequestId)],
);
