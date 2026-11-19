import "server-only";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { isLocale, type Locale } from "@/lib/i18n/config";

import { getAuth } from ".";
import { adminPaths } from "./paths";
import { isUserRole, type UserRole } from "./roles";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  adminLocale: Locale | null;
};

export async function sessionUserFromHeaders(requestHeaders: Headers): Promise<AdminUser | null> {
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session || session.user.banned || !isUserRole(session.user.role)) return null;
  const { id, name, email, role } = session.user;
  const [row] = await getDb()
    .select({ adminLocale: users.adminLocale })
    .from(users)
    .where(eq(users.id, id));
  const saved = row?.adminLocale;
  return { id, name, email, role, adminLocale: saved && isLocale(saved) ? saved : null };
}

export const getAdminUser = cache(async (): Promise<AdminUser | null> => {
  return sessionUserFromHeaders(await headers());
});

export async function requireAdminUser(role?: UserRole): Promise<AdminUser> {
  const user = await getAdminUser();
  if (!user) redirect(adminPaths.login);
  if (role && user.role !== role) redirect(adminPaths.home);
  return user;
}
