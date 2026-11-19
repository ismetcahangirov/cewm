import type { Metadata } from "next";

import { getAdminT } from "@/lib/admin/i18n/server";
import { requireAdminUser } from "@/lib/auth/session";

import { PostsView } from "./posts-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getAdminT();
  return { title: t("Bloq") };
}

export const instant = false;

export default async function BlogPage() {
  await requireAdminUser();
  return <PostsView />;
}
