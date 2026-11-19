import type { Metadata } from "next";

import { getAdminT } from "@/lib/admin/i18n/server";
import { requireAdminUser } from "@/lib/auth/session";

import { TeamView } from "./team-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getAdminT();
  return { title: t("Komanda") };
}

export const instant = false;

export default async function TeamPage() {
  await requireAdminUser();
  return <TeamView />;
}
