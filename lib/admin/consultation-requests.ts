import "server-only";

import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import type { Page } from "@/lib/api/types";
import { toCsv } from "@/lib/csv";
import { getDb } from "@/lib/db";
import { containsPattern } from "@/lib/db/like";
import { products, consultationRequestProducts, consultationRequests } from "@/lib/db/schema";
import { routes } from "@/lib/routes";
import {
  consultationRequestLocaleLabels,
  consultationRequestStatusLabels,
  type ConsultationRequestDetailDto,
  type ConsultationRequestFilters,
  type ConsultationRequestListArgs,
  type ConsultationRequestListItemDto,
  type ConsultationRequestSortField,
  type UpdateConsultationRequestValues,
} from "@/lib/validation/consultation-requests";

export const requestProductCount = sql<number>`(select count(*)::int
  from consultation_request_products qrp where qrp.consultation_request_id = consultation_requests.id)`;

const requestProductNames = sql<
  string | null
>`(select string_agg(qrp.product_name, ', ' order by qrp.product_name)
  from consultation_request_products qrp where qrp.consultation_request_id = consultation_requests.id)`;

const sortColumns: Record<ConsultationRequestSortField, SQL | AnyPgColumn> = {
  createdAt: consultationRequests.createdAt,
  name: sql`lower(${consultationRequests.name})`,
  status: consultationRequests.status,
};

function phoneDigits(search: string): string | null {
  const digits = search.replace(/\D/g, "");
  if (digits.length < 3 || /[^\d\s+()-]/.test(search)) return null;
  return digits.replace(/^0/, "");
}

function listFilters(filters: ConsultationRequestFilters): SQL | undefined {
  const where: SQL[] = [];
  if (filters.status !== "all") where.push(eq(consultationRequests.status, filters.status));
  if (filters.search) {
    const pattern = containsPattern(filters.search);
    const digits = phoneDigits(filters.search);
    const match = or(
      ilike(consultationRequests.name, pattern),
      ilike(consultationRequests.phone, pattern),
      ilike(consultationRequests.email, pattern),
      ilike(consultationRequests.company, pattern),
      digits
        ? sql`regexp_replace(${consultationRequests.phone}, '\\D', '', 'g') like ${`%${digits}%`}`
        : undefined,
    );
    if (match) where.push(match);
  }
  return where.length ? and(...where) : undefined;
}

export async function listConsultationRequests(
  args: ConsultationRequestListArgs,
): Promise<Page<ConsultationRequestListItemDto>> {
  const db = getDb();
  const where = listFilters({ search: args.search, status: args.status ?? "all" });
  const direction = args.order === "desc" ? desc : asc;
  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: consultationRequests.id,
        name: consultationRequests.name,
        phone: consultationRequests.phone,
        email: consultationRequests.email,
        company: consultationRequests.company,
        status: consultationRequests.status,
        locale: consultationRequests.locale,
        createdAt: consultationRequests.createdAt,
        productCount: requestProductCount,
      })
      .from(consultationRequests)
      .where(where)
      .orderBy(
        direction(sortColumns[args.sort]),
        desc(consultationRequests.createdAt),
        asc(consultationRequests.id),
      )
      .limit(args.pageSize)
      .offset(args.page * args.pageSize),
    db.select({ value: count() }).from(consultationRequests).where(where),
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
  where pi.product_id = consultation_request_products.product_id order by pi.position limit 1)`;

const productThumbnailAlt = sql<string | null>`(select m.alt ->> 'az' from product_images pi
  join media m on m.id = pi.media_id
  where pi.product_id = consultation_request_products.product_id order by pi.position limit 1)`;

export async function getConsultationRequest(
  id: string,
  options: { markSeen?: boolean } = {},
): Promise<ConsultationRequestDetailDto | null> {
  const db = getDb();
  const seen = options.markSeen
    ? await db
        .update(consultationRequests)
        .set({ status: "in-progress" })
        .where(and(eq(consultationRequests.id, id), eq(consultationRequests.status, "new")))
        .returning({ id: consultationRequests.id })
    : [];
  const [row] = await db.select().from(consultationRequests).where(eq(consultationRequests.id, id));
  if (!row) return null;

  const items = await db
    .select({
      id: consultationRequestProducts.id,
      productId: consultationRequestProducts.productId,
      name: consultationRequestProducts.productName,
      deletedAt: products.deletedAt,
      thumbnailKey: productThumbnailKey,
      thumbnailAlt: productThumbnailAlt,
    })
    .from(consultationRequestProducts)
    .leftJoin(products, eq(products.id, consultationRequestProducts.productId))
    .where(eq(consultationRequestProducts.consultationRequestId, id))
    .orderBy(asc(consultationRequestProducts.productName));

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

export async function updateConsultationRequest(
  id: string,
  values: UpdateConsultationRequestValues,
): Promise<ConsultationRequestDetailDto | null> {
  const changes: Partial<typeof consultationRequests.$inferInsert> = {};
  if (values.status !== undefined) changes.status = values.status;
  if (values.internalNote !== undefined) changes.internalNote = values.internalNote;
  const updated = await getDb()
    .update(consultationRequests)
    .set(changes)
    .where(eq(consultationRequests.id, id))
    .returning({ id: consultationRequests.id });
  if (!updated.length) return null;
  return getConsultationRequest(id);
}

export async function deleteConsultationRequest(id: string): Promise<boolean> {
  const removed = await getDb()
    .delete(consultationRequests)
    .where(eq(consultationRequests.id, id))
    .returning({ id: consultationRequests.id });
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

export const consultationRequestCsvHeaders = [
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

export async function exportConsultationRequestsCsv(
  filters: ConsultationRequestFilters,
): Promise<string> {
  const rows = await getDb()
    .select({
      createdAt: consultationRequests.createdAt,
      name: consultationRequests.name,
      phone: consultationRequests.phone,
      email: consultationRequests.email,
      company: consultationRequests.company,
      products: requestProductNames,
      message: consultationRequests.message,
      status: consultationRequests.status,
      locale: consultationRequests.locale,
      internalNote: consultationRequests.internalNote,
    })
    .from(consultationRequests)
    .where(listFilters(filters))
    .orderBy(desc(consultationRequests.createdAt), asc(consultationRequests.id));

  return toCsv([
    consultationRequestCsvHeaders,
    ...rows.map((row) => [
      exportDate.format(row.createdAt),
      row.name,
      row.phone,
      row.email,
      row.company,
      row.products,
      row.message,
      consultationRequestStatusLabels[row.status],
      consultationRequestLocaleLabels[row.locale],
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
