import { foreignKey, index, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { products } from "./catalog";
import { contentLocale, id, legacyKey, timestamps } from "./columns";

export const consultationRequestStatus = pgEnum("consultation_request_status", [
  "new",
  "in-progress",
  "done",
]);

export const consultationRequests = pgTable(
  "consultation_requests",
  {
    id: id(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    company: text("company"),
    message: text("message"),
    status: consultationRequestStatus("status").notNull().default("new"),
    locale: contentLocale("locale").notNull().default("az"),
    internalNote: text("internal_note"),
    ipHash: text("ip_hash"),
    legacyKey: legacyKey(),
    ...timestamps,
  },
  (t) => [
    index("consultation_requests_status_idx").on(t.status, t.createdAt),
    index("consultation_requests_ip_hash_idx").on(t.ipHash, t.createdAt),
  ],
);

export const consultationRequestProducts = pgTable(
  "consultation_request_products",
  {
    id: id(),
    consultationRequestId: uuid("consultation_request_id").notNull(),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    productName: text("product_name").notNull(),
  },
  (t) => [
    index("consultation_request_products_request_idx").on(t.consultationRequestId),
    foreignKey({
      name: "consultation_request_products_request_fk",
      columns: [t.consultationRequestId],
      foreignColumns: [consultationRequests.id],
    }).onDelete("cascade"),
  ],
);
