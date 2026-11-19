"use client";

import Link from "next/link";

import { EmptyState } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/lib/admin/i18n/use-t";
import { useGetCategoriesQuery, useGetCategoryQuery } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/types";

import { CategoryForm } from "./category-form";

export function CategoryEditor({ id }: { id?: string }) {
  const t = useT();
  const categories = useGetCategoriesQuery();
  const category = useGetCategoryQuery(id ?? "", { skip: !id, refetchOnMountOrArgChange: true });

  if (categories.isLoading || (id && category.isLoading)) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <Skeleton className="h-10 w-1/2" />
        <div className="grid gap-6 lg:grid-cols-12">
          <Skeleton className="h-96 lg:col-span-8" />
          <Skeleton className="h-96 lg:col-span-4" />
        </div>
      </div>
    );
  }

  if (id && category.isError) {
    const missing = isApiError(category.error) && category.error.status === 404;
    return (
      <EmptyState
        action={
          <Button asChild variant="outline">
            <Link href="/admin/categories">{t("Kateqoriyalara qayıt")}</Link>
          </Button>
        }
      >
        {missing ? t("Kateqoriya tapılmadı.") : t("Kateqoriya yüklənmədi. Səhifəni yeniləyin.")}
      </EmptyState>
    );
  }

  return (
    <CategoryForm
      key={category.data?.id ?? "new"}
      category={id ? (category.data ?? null) : null}
      categories={categories.data ?? []}
    />
  );
}
