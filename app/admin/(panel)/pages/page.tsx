import type { Metadata } from "next";

import { getAdminT } from "@/lib/admin/i18n/server";
import { requireAdminUser } from "@/lib/auth/session";

import { PagesView } from "./pages-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getAdminT();
  return { title: t("Səhifələr") };
}

export const instant = false;

export default async function PagesPage() {
  await requireAdminUser();
  return <PagesView />;
}
