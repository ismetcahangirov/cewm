import type { Metadata } from "next";

import { getAdminT } from "@/lib/admin/i18n/server";
import { requireAdminUser } from "@/lib/auth/session";

import { PostEditor } from "../post-editor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getAdminT();
  return { title: t("Yazı") };
}

export const instant = false;

export default async function PostPage({ params }: PageProps<"/admin/blog/[id]">) {
  await requireAdminUser();
  const { id } = await params;
  return <PostEditor id={id} />;
}
