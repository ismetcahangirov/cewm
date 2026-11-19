import type { Metadata } from "next";

import { getAdminT } from "@/lib/admin/i18n/server";
import { requireAdminUser } from "@/lib/auth/session";

import { UsersView } from "./users-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getAdminT();
  return { title: t("İstifadəçilər") };
}

export const instant = false;

export default async function UsersPage() {
  const user = await requireAdminUser("owner");
  return <UsersView currentUserId={user.id} />;
}
