import "server-only";

import { and, asc, count, desc, eq, ilike, like, ne, notLike, or, type SQL } from "drizzle-orm";

import type { DomainError } from "@/lib/api/server";
import type { Page } from "@/lib/api/types";
import { getDb } from "@/lib/db";
import { uniqueViolation } from "@/lib/db/errors";
import { containsPattern } from "@/lib/db/like";
import { redirects } from "@/lib/db/schema";
import { splitTarget, tryNormalizeLegacyPath } from "@/lib/legacy-redirects";
import {
  uploadsPrefix,
  type RedirectDto,
  type RedirectKind,
  type RedirectListArgs,
  type RedirectSaveResult,
  type RedirectStatusCode,
  type RedirectValues,
} from "@/lib/validation/redirects";

const missing: DomainError = { status: 404, message: "Yönləndirmə tapılmadı." };

const duplicate: DomainError = {
  status: 409,
  message: "Bu köhnə ünvan üçün yönləndirmə artıq var.",
  fields: { fromPath: "Bu köhnə ünvan üçün yönləndirmə artıq var." },
};

function chained(target: string): DomainError {
  const message = `Bu ünvan özü də ${target} ünvanına yönləndirilir. Son ünvanı yazın.`;
  return { status: 400, message, fields: { toPath: message } };
}

const sortColumns = {
  fromPath: redirects.fromPath,
  toPath: redirects.toPath,
  statusCode: redirects.statusCode,
  createdAt: redirects.createdAt,
} as const;

function kindFilter(kind: RedirectKind): SQL | undefined {
  if (kind === "files") return like(redirects.fromPath, `${uploadsPrefix}%`);
  if (kind === "pages") return notLike(redirects.fromPath, `${uploadsPrefix}%`);
  return undefined;
}

function searchFilter(search: string): SQL | undefined {
  if (!search) return undefined;
  const terms = new Set([search]);
  const normalized = /[/%]/.test(search) ? tryNormalizeLegacyPath(search) : null;
  if (normalized) terms.add(normalized);
  return or(
    ...[...terms].flatMap((term) => {
      const pattern = containsPattern(term);
      return [ilike(redirects.fromPath, pattern), ilike(redirects.toPath, pattern)];
    }),
  );
}

function toDto(row: typeof redirects.$inferSelect): RedirectDto {
  return {
    id: row.id,
    fromPath: row.fromPath,
    toPath: row.toPath,
    statusCode: row.statusCode as RedirectStatusCode,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listRedirects(args: RedirectListArgs): Promise<Page<RedirectDto>> {
  const db = getDb();
  const where = and(kindFilter(args.kind), searchFilter(args.search));
  const direction = args.order === "desc" ? desc : asc;
  const [rows, [total]] = await Promise.all([
    db
      .select()
      .from(redirects)
      .where(where)
      .orderBy(direction(sortColumns[args.sort]), asc(redirects.id))
      .limit(args.pageSize)
      .offset(args.page * args.pageSize),
    db.select({ value: count() }).from(redirects).where(where),
  ]);
  return { rows: rows.map(toDto), rowCount: total?.value ?? 0 };
}

export async function saveRedirect(
  id: string | null,
  values: RedirectValues,
): Promise<RedirectSaveResult | { error: DomainError }> {
  const others = (column: SQL) => (id ? and(column, ne(redirects.id, id)) : column);
  try {
    return await getDb().transaction(async (tx) => {
      if (id) {
        const [current] = await tx
          .select({ id: redirects.id })
          .from(redirects)
          .where(eq(redirects.id, id))
          .for("update");
        if (!current) return { error: missing };
      }

      const [taken] = await tx
        .select({ id: redirects.id })
        .from(redirects)
        .where(others(eq(redirects.fromPath, values.fromPath)));
      if (taken) return { error: duplicate };

      const [next] = await tx
        .select({ toPath: redirects.toPath })
        .from(redirects)
        .where(others(eq(redirects.fromPath, splitTarget(values.toPath).path)));
      if (next) return { error: chained(next.toPath) };

      const [row] = id
        ? await tx
            .update(redirects)
            .set(values)
            .where(eq(redirects.id, id))
            .returning({ id: redirects.id })
        : await tx.insert(redirects).values(values).returning({ id: redirects.id });
      if (!row) throw new Error("Redirect was not saved");

      const retargeted = await tx
        .update(redirects)
        .set({ toPath: values.toPath })
        .where(and(eq(redirects.toPath, values.fromPath), ne(redirects.id, row.id)))
        .returning({ id: redirects.id });

      return { id: row.id, retargeted: retargeted.length };
    });
  } catch (error) {
    if (uniqueViolation(error) !== null) return { error: duplicate };
    throw error;
  }
}

export async function deleteRedirect(id: string): Promise<boolean> {
  const deleted = await getDb()
    .delete(redirects)
    .where(eq(redirects.id, id))
    .returning({ id: redirects.id });
  return deleted.length > 0;
}
