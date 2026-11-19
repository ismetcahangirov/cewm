import type { Metadata } from "next";

import { getAdminT } from "@/lib/admin/i18n/server";
import { requireAdminUser } from "@/lib/auth/session";

import { HeroFilmsView } from "./hero-films-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getAdminT();
  return { title: t("Hero filmləri") };
}

export const instant = false;

export default async function HeroFilmsPage() {
  await requireAdminUser();
  return <HeroFilmsView />;
}
