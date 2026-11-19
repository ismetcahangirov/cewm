import "server-only";

import { asc, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { containsPattern } from "@/lib/db/like";
import { users } from "@/lib/db/schema";
import type { Page } from "@/lib/api/types";
import type { UserDto, UserListArgs, UserSortField } from "@/lib/validation/users";

const sortColumns = {
  name: users.name,
  email: users.email,
  role: users.role,
  lastSignInAt: users.lastSignInAt,
  createdAt: users.createdAt,
} satisfies Record<UserSortField, unknown>;

type UserRow = typeof users.$inferSelect;

export function toUserDto(row: UserRow): UserDto {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    active: !row.banned,
    invitePending: !row.emailVerified,
    lastSignInAt: row.lastSignInAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listUsers(args: UserListArgs): Promise<Page<UserDto>> {
  const db = getDb();
  let where: SQL | undefined;
  if (args.search) {
    const pattern = containsPattern(args.search);
    where = or(ilike(users.name, pattern), ilike(users.email, pattern));
  }
  const direction = args.order === "desc" ? desc : asc;
  const [rows, [total]] = await Promise.all([
    db
      .select()
      .from(users)
      .where(where)
      .orderBy(direction(sortColumns[args.sort]), asc(users.id))
      .limit(args.pageSize)
      .offset(args.page * args.pageSize),
    db.select({ value: count() }).from(users).where(where),
  ]);
  return { rows: rows.map(toUserDto), rowCount: total?.value ?? 0 };
}

export async function findUser(id: string): Promise<UserRow | undefined> {
  const [row] = await getDb().select().from(users).where(eq(users.id, id));
  return row;
}

export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  const [row] = await getDb().select().from(users).where(eq(users.email, email));
  return row;
}
