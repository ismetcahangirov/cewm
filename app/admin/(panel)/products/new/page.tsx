import type { Metadata } from "next";

import { getAdminT } from "@/lib/admin/i18n/server";
import { requireAdminUser } from "@/lib/auth/session";

import { ProductEditor } from "../product-editor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getAdminT();
  return { title: t("Yeni məhsul") };
}

export const instant = false;

export default async function NewProductPage() {
  await requireAdminUser();
  return <ProductEditor />;
}
