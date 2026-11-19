import type { Metadata } from "next";

import { getAdminT } from "@/lib/admin/i18n/server";
import { requireAdminUser } from "@/lib/auth/session";

import { LogosView } from "./logos-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getAdminT();
  return { title: t("Partnyorlar") };
}

export const instant = false;

export default async function LogosPage() {
  await requireAdminUser();
  return <LogosView />;
}
