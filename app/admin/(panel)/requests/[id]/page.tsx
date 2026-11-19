import type { Metadata } from "next";

import { getAdminT } from "@/lib/admin/i18n/server";
import { requireAdminUser } from "@/lib/auth/session";

import { RequestDetail } from "../request-detail";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getAdminT();
  return { title: t("Müraciət") };
}

export const instant = false;

export default async function RequestPage({ params }: PageProps<"/admin/requests/[id]">) {
  const user = await requireAdminUser();
  const { id } = await params;
  return <RequestDetail id={id} role={user.role} />;
}
