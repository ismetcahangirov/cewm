"use client";

import { EditorLoadError, EditorSkeleton } from "@/components/admin/editor-state";
import { useT } from "@/lib/admin/i18n/use-t";
import { useGetPostQuery } from "@/lib/api/content";

import { PostForm } from "./post-form";

export function PostEditor({ id }: { id?: string }) {
  const t = useT();
  const post = useGetPostQuery(id ?? "", { skip: !id, refetchOnMountOrArgChange: true });

  if (id && post.isLoading) return <EditorSkeleton />;

  if (id && post.isError) {
    return (
      <EditorLoadError
        error={post.error}
        backHref="/admin/blog"
        backLabel={t("Bloqa qayıt")}
        missing={t("Yazı tapılmadı.")}
        failed={t("Yazı yüklənmədi. Səhifəni yeniləyin.")}
      />
    );
  }

  return <PostForm key={post.data?.id ?? "new"} post={id ? (post.data ?? null) : null} />;
}
