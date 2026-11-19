import type { Metadata } from "next";

import { getAdminT } from "@/lib/admin/i18n/server";
import { requireAdminUser } from "@/lib/auth/session";

import { RequestsView } from "./requests-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getAdminT();
  return { title: t("Müraciətlər") };
}

export const instant = false;

export default async function RequestsPage() {
  const user = await requireAdminUser();
  return <RequestsView role={user.role} />;
}
