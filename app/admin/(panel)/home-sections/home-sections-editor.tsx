"use client";

import { EmptyState } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/lib/admin/i18n/use-t";
import { useGetHomeSectionsQuery } from "@/lib/api/home-sections";

import { HomeSectionsForm } from "./home-sections-form";
import type { SectionDefaults } from "./section-list";

export function HomeSectionsEditor({ defaults }: { defaults: SectionDefaults }) {
  const t = useT();
  const { data, isLoading, isError, refetch } = useGetHomeSectionsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState
        action={
          <Button variant="outline" onClick={() => refetch()}>
            {t("Yenidən yüklə")}
          </Button>
        }
      >
        {t("Ana səhifə bölmələri yüklənmədi.")}
      </EmptyState>
    );
  }

  return <HomeSectionsForm key={data.updatedAt ?? "new"} data={data} defaults={defaults} />;
}
