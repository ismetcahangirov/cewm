import type { Metadata } from "next";

import { getAdminT } from "@/lib/admin/i18n/server";
import { requireAdminUser } from "@/lib/auth/session";

import { CategoriesView } from "./categories-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getAdminT();
  return { title: t("Kateqoriyalar") };
}

export const instant = false;

export default async function CategoriesPage() {
  await requireAdminUser();
  return <CategoriesView />;
}
