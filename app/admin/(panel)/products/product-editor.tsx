"use client";

import Link from "next/link";

import { EmptyState } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/lib/admin/i18n/use-t";
import { useGetCategoriesQuery, useGetProductQuery } from "@/lib/api/admin";
import { useGetBrandsQuery } from "@/lib/api/brands";
import { isApiError } from "@/lib/api/types";

import { ProductForm } from "./product-form";

function EditorSkeleton() {
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

export function ProductEditor({ id }: { id?: string }) {
  const t = useT();
  const categories = useGetCategoriesQuery();
  const brands = useGetBrandsQuery();
  const product = useGetProductQuery(id ?? "", { skip: !id, refetchOnMountOrArgChange: true });

  if (categories.isLoading || brands.isLoading || (id && product.isLoading))
    return <EditorSkeleton />;

  if (id && product.isError) {
    const missing = isApiError(product.error) && product.error.status === 404;
    return (
      <EmptyState
        action={
          <Button asChild variant="outline">
            <Link href="/admin/products">{t("Məhsullara qayıt")}</Link>
          </Button>
        }
      >
        {missing ? t("Məhsul tapılmadı.") : t("Məhsul yüklənmədi. Səhifəni yeniləyin.")}
      </EmptyState>
    );
  }

  return (
    <ProductForm
      key={product.data?.id ?? "new"}
      product={id ? (product.data ?? null) : null}
      categories={categories.data ?? []}
      brands={(brands.data ?? []).map((brand) => ({ id: brand.id, name: brand.name }))}
    />
  );
}
