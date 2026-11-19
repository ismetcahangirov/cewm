import type { Metadata } from "next";

import { getAdminT } from "@/lib/admin/i18n/server";
import { requireAdminUser } from "@/lib/auth/session";

import { PostEditor } from "../post-editor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getAdminT();
  return { title: t("Yeni yazı") };
}

export const instant = false;

export default async function NewPostPage() {
  await requireAdminUser();
  return <PostEditor />;
}
