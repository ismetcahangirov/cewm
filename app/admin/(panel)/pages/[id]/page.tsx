import type { Metadata } from "next";

import { getAdminT } from "@/lib/admin/i18n/server";
import { requireAdminUser } from "@/lib/auth/session";

import { PageEditor } from "../page-editor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getAdminT();
  return { title: t("Səhifə") };
}

export const instant = false;

export default async function ContentPagePage({ params }: PageProps<"/admin/pages/[id]">) {
  await requireAdminUser();
  const { id } = await params;
  return <PageEditor id={id} />;
}
