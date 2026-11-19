import "server-only";

import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import type { Page } from "@/lib/api/types";
import { toCsv } from "@/lib/csv";
import { getDb } from "@/lib/db";
import { containsPattern } from "@/lib/db/like";
import { products, quoteRequestProducts, quoteRequests } from "@/lib/db/schema";
import { routes } from "@/lib/routes";
import {
  quoteRequestLocaleLabels,
  quoteRequestStatusLabels,
  type QuoteRequestDetailDto,
  type QuoteRequestFilters,
  type QuoteRequestListArgs,
  type QuoteRequestListItemDto,
  type QuoteRequestSortField,
  type UpdateQuoteRequestValues,
} from "@/lib/validation/quote-requests";

export const requestProductCount = sql<number>`(select count(*)::int
  from quote_request_products qrp where qrp.quote_request_id = quote_requests.id)`;

const requestProductNames = sql<
  string | null
>`(select string_agg(qrp.product_name, ', ' order by qrp.product_name)
  from quote_request_products qrp where qrp.quote_request_id = quote_requests.id)`;

const sortColumns: Record<QuoteRequestSortField, SQL | AnyPgColumn> = {
  createdAt: quoteRequests.createdAt,
  name: sql`lower(${quoteRequests.name})`,
  status: quoteRequests.status,
};

function phoneDigits(search: string): string | null {
  const digits = search.replace(/\D/g, "");
  if (digits.length < 3 || /[^\d\s+()-]/.test(search)) return null;
  return digits.replace(/^0/, "");
}

function listFilters(filters: QuoteRequestFilters): SQL | undefined {
  const where: SQL[] = [];
  if (filters.status !== "all") where.push(eq(quoteRequests.status, filters.status));
  if (filters.search) {
    const pattern = containsPattern(filters.search);
    const digits = phoneDigits(filters.search);
    const match = or(
      ilike(quoteRequests.name, pattern),
      ilike(quoteRequests.phone, pattern),
      ilike(quoteRequests.email, pattern),
      ilike(quoteRequests.company, pattern),
      digits
        ? sql`regexp_replace(${quoteRequests.phone}, '\\D', '', 'g') like ${`%${digits}%`}`
        : undefined,
    );
    if (match) where.push(match);
  }
  return where.length ? and(...where) : undefined;
}

export async function listQuoteRequests(
  args: QuoteRequestListArgs,
): Promise<Page<QuoteRequestListItemDto>> {
  const db = getDb();
  const where = listFilters({ search: args.search, status: args.status ?? "all" });
  const direction = args.order === "desc" ? desc : asc;
  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: quoteRequests.id,
        name: quoteRequests.name,
        phone: quoteRequests.phone,
        email: quoteRequests.email,
        company: quoteRequests.company,
        status: quoteRequests.status,
        locale: quoteRequests.locale,
        createdAt: quoteRequests.createdAt,
        productCount: requestProductCount,
      })
      .from(quoteRequests)
      .where(where)
      .orderBy(
        direction(sortColumns[args.sort]),
        desc(quoteRequests.createdAt),
        asc(quoteRequests.id),
      )
      .limit(args.pageSize)
      .offset(args.page * args.pageSize),
    db.select({ value: count() }).from(quoteRequests).where(where),
  ]);
  return {
    rows: rows.map((row) => ({
      ...row,
      productCount: Number(row.productCount),
      createdAt: row.createdAt.toISOString(),
    })),
    rowCount: total?.value ?? 0,
  };
}

const productThumbnailKey = sql<string | null>`(select m.key from product_images pi
  join media m on m.id = pi.media_id
  where pi.product_id = quote_request_products.product_id order by pi.position limit 1)`;

const productThumbnailAlt = sql<string | null>`(select m.alt ->> 'az' from product_images pi
  join media m on m.id = pi.media_id
  where pi.product_id = quote_request_products.product_id order by pi.position limit 1)`;

export async function getQuoteRequest(
  id: string,
  options: { markSeen?: boolean } = {},
): Promise<QuoteRequestDetailDto | null> {
  const db = getDb();
  const seen = options.markSeen
    ? await db
        .update(quoteRequests)
        .set({ status: "in-progress" })
        .where(and(eq(quoteRequests.id, id), eq(quoteRequests.status, "new")))
        .returning({ id: quoteRequests.id })
    : [];
  const [row] = await db.select().from(quoteRequests).where(eq(quoteRequests.id, id));
  if (!row) return null;

  const items = await db
    .select({
      id: quoteRequestProducts.id,
      productId: quoteRequestProducts.productId,
      name: quoteRequestProducts.productName,
      deletedAt: products.deletedAt,
      thumbnailKey: productThumbnailKey,
      thumbnailAlt: productThumbnailAlt,
    })
    .from(quoteRequestProducts)
    .leftJoin(products, eq(products.id, quoteRequestProducts.productId))
    .where(eq(quoteRequestProducts.quoteRequestId, id))
    .orderBy(asc(quoteRequestProducts.productName));

  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    company: row.company,
    message: row.message,
    status: row.status,
    locale: row.locale,
    internalNote: row.internalNote,
    products: items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.name,
      inTrash: Boolean(item.deletedAt),
      thumbnail: item.thumbnailKey
        ? { src: routes.media(item.thumbnailKey), alt: item.thumbnailAlt }
        : null,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    markedSeen: seen.length > 0,
  };
}

export async function updateQuoteRequest(
  id: string,
  values: UpdateQuoteRequestValues,
): Promise<QuoteRequestDetailDto | null> {
  const changes: Partial<typeof quoteRequests.$inferInsert> = {};
  if (values.status !== undefined) changes.status = values.status;
  if (values.internalNote !== undefined) changes.internalNote = values.internalNote;
  const updated = await getDb()
    .update(quoteRequests)
    .set(changes)
    .where(eq(quoteRequests.id, id))
    .returning({ id: quoteRequests.id });
  if (!updated.length) return null;
  return getQuoteRequest(id);
}

export async function deleteQuoteRequest(id: string): Promise<boolean> {
  const removed = await getDb()
    .delete(quoteRequests)
    .where(eq(quoteRequests.id, id))
    .returning({ id: quoteRequests.id });
  return removed.length > 0;
}

const exportDate = new Intl.DateTimeFormat("az", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Baku",
});

export const quoteRequestCsvHeaders = [
  "Tarix",
  "Ad",
  "Telefon",
  "E-poçt",
  "Şirkət",
  "Məhsullar",
  "Mesaj",
  "Status",
  "Dil",
  "Daxili qeyd",
];

export async function exportQuoteRequestsCsv(filters: QuoteRequestFilters): Promise<string> {
  const rows = await getDb()
    .select({
      createdAt: quoteRequests.createdAt,
      name: quoteRequests.name,
      phone: quoteRequests.phone,
      email: quoteRequests.email,
      company: quoteRequests.company,
      products: requestProductNames,
      message: quoteRequests.message,
      status: quoteRequests.status,
      locale: quoteRequests.locale,
      internalNote: quoteRequests.internalNote,
    })
    .from(quoteRequests)
    .where(listFilters(filters))
    .orderBy(desc(quoteRequests.createdAt), asc(quoteRequests.id));

  return toCsv([
    quoteRequestCsvHeaders,
    ...rows.map((row) => [
      exportDate.format(row.createdAt),
      row.name,
      row.phone,
      row.email,
      row.company,
      row.products,
      row.message,
      quoteRequestStatusLabels[row.status],
      quoteRequestLocaleLabels[row.locale],
      row.internalNote,
    ]),
  ]);
}

export function exportFileName(now = new Date()): string {
  const day = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Baku",
  }).format(now);
  return `muracietler-${day}.csv`;
}
