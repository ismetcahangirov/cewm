import type { Metadata } from "next";

import { getAdminT } from "@/lib/admin/i18n/server";
import { requireAdminUser } from "@/lib/auth/session";

import { ProductEditor } from "../product-editor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getAdminT();
  return { title: t("Məhsul") };
}

export const instant = false;

export default async function ProductPage({ params }: PageProps<"/admin/products/[id]">) {
  await requireAdminUser();
  const { id } = await params;
  return <ProductEditor id={id} />;
}
