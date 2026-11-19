import type { Metadata } from "next";

import { getAdminT } from "@/lib/admin/i18n/server";
import { requireAdminUser } from "@/lib/auth/session";

import { ClientLogosView } from "./client-logos-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getAdminT();
  return { title: t("Müştərilər") };
}

export const instant = false;

export default async function ClientLogosPage() {
  await requireAdminUser();
  return <ClientLogosView />;
}
