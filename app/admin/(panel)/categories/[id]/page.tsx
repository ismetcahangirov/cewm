import type { Metadata } from "next";

import { getAdminT } from "@/lib/admin/i18n/server";
import { requireAdminUser } from "@/lib/auth/session";

import { CategoryEditor } from "../category-editor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getAdminT();
  return { title: t("Kateqoriya") };
}

export const instant = false;

export default async function CategoryPage({ params }: PageProps<"/admin/categories/[id]">) {
  await requireAdminUser();
  const { id } = await params;
  return <CategoryEditor id={id} />;
}
