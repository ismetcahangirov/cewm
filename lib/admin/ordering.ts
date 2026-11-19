import "server-only";

import { eq, inArray, sql } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";

import type { DomainError } from "@/lib/api/server";
import { getDb } from "@/lib/db";

type OrderedTable = PgTable & { id: PgColumn; sortOrder: PgColumn };

export function nextSortOrder(table: OrderedTable) {
  return sql<number>`(select coalesce(max(${table.sortOrder}), -1) + 1 from ${table})`;
}

export async function reorderRows(
  table: OrderedTable,
  orderedIds: string[],
): Promise<{ ok: true } | { error: DomainError }> {
  if (new Set(orderedIds).size !== orderedIds.length) {
    return { error: { status: 400, message: "Sıra təkrarlanan element ehtiva edir." } };
  }
  const db = getDb();
  const listed = await db.select({ id: table.id }).from(table).where(inArray(table.id, orderedIds));
  const all = await db.select({ id: table.id }).from(table);
  if (listed.length !== orderedIds.length || all.length !== orderedIds.length) {
    return {
      error: { status: 409, message: "Siyahı köhnədir. Səhifəni yeniləyib yenidən cəhd edin." },
    };
  }
  await db.transaction(async (tx) => {
    for (const [index, id] of orderedIds.entries()) {
      await tx.update(table).set({ sortOrder: index }).where(eq(table.id, id));
    }
  });
  return { ok: true };
}

export async function setRowActive(
  table: PgTable & { id: PgColumn; isActive: PgColumn },
  id: string,
  isActive: boolean,
): Promise<boolean> {
  const updated = await getDb()
    .update(table)
    .set({ isActive })
    .where(eq(table.id, id))
    .returning({ id: table.id });
  return updated.length > 0;
}

export async function deleteRow(table: PgTable & { id: PgColumn }, id: string): Promise<boolean> {
  const deleted = await getDb().delete(table).where(eq(table.id, id)).returning({ id: table.id });
  return deleted.length > 0;
}
