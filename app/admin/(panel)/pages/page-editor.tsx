"use client";

import { EditorLoadError, EditorSkeleton } from "@/components/admin/editor-state";
import { useT } from "@/lib/admin/i18n/use-t";
import { useGetPageQuery } from "@/lib/api/content";

import { PageForm } from "./page-form";

export function PageEditor({ id }: { id?: string }) {
  const t = useT();
  const page = useGetPageQuery(id ?? "", { skip: !id, refetchOnMountOrArgChange: true });

  if (id && page.isLoading) return <EditorSkeleton />;

  if (id && page.isError) {
    return (
      <EditorLoadError
        error={page.error}
        backHref="/admin/pages"
        backLabel={t("Səhifələrə qayıt")}
        missing={t("Səhifə tapılmadı.")}
        failed={t("Səhifə yüklənmədi. Səhifəni yeniləyin.")}
      />
    );
  }

  return <PageForm key={page.data?.id ?? "new"} page={id ? (page.data ?? null) : null} />;
}
