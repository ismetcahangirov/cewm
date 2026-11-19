import type { Metadata } from "next";

import { getAdminT } from "@/lib/admin/i18n/server";
import { requireAdminUser } from "@/lib/auth/session";

import { ProductsView } from "./products-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getAdminT();
  return { title: t("Məhsullar") };
}

export const instant = false;

export default async function ProductsPage() {
  const user = await requireAdminUser();
  return <ProductsView role={user.role} />;
}
