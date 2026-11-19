import type { Metadata } from "next";

import { getAdminT } from "@/lib/admin/i18n/server";
import { requireAdminUser } from "@/lib/auth/session";

import { MediaView } from "./media-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getAdminT();
  return { title: t("Media") };
}

export const instant = false;

export default async function MediaPage() {
  await requireAdminUser();
  return <MediaView />;
}
