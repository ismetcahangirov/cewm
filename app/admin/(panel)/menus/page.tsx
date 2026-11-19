import type { Metadata } from "next";

import { getAdminT } from "@/lib/admin/i18n/server";
import { requireAdminUser } from "@/lib/auth/session";

import { MenusView } from "./menus-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getAdminT();
  return { title: t("Menyular") };
}

export const instant = false;

export default async function MenusPage({ searchParams }: PageProps<"/admin/menus">) {
  await requireAdminUser();
  const { menu } = await searchParams;
  return <MenusView menuId={typeof menu === "string" ? menu : null} />;
}
