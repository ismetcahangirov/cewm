import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getAuth } from ".";
import { adminPaths } from "./paths";
import { isUserRole, type UserRole } from "./roles";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export async function sessionUserFromHeaders(requestHeaders: Headers): Promise<AdminUser | null> {
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session || session.user.banned || !isUserRole(session.user.role)) return null;
  const { id, name, email, role } = session.user;
  return { id, name, email, role };
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
