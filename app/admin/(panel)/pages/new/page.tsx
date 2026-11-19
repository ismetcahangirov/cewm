import type { Metadata } from "next";

import { getAdminT } from "@/lib/admin/i18n/server";
import { requireAdminUser } from "@/lib/auth/session";

import { PageEditor } from "../page-editor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getAdminT();
  return { title: t("Yeni səhifə") };
}

export const instant = false;

export default async function NewContentPagePage() {
  await requireAdminUser();
  return <PageEditor />;
}
