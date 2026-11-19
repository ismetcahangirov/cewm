import type { Metadata } from "next";

import { getAdminT } from "@/lib/admin/i18n/server";
import { requireAdminUser } from "@/lib/auth/session";

import { BrandsView } from "./brands-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getAdminT();
  return { title: t("Brendlər") };
}

export const instant = false;

export default async function BrandsPage() {
  await requireAdminUser();
  return <BrandsView />;
}
