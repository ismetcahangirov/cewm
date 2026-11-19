"use client";

import { EmptyState } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/lib/admin/i18n/use-t";
import { useGetSettingsQuery } from "@/lib/api/settings";

import { SettingsForm } from "./settings-form";

export function SettingsEditor() {
  const t = useT();
  const { data, isLoading, isError, refetch } = useGetSettingsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  if (isLoading) {
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

  if (isError || !data) {
    return (
      <EmptyState
        action={
          <Button variant="outline" onClick={() => refetch()}>
            {t("Yenidən yüklə")}
          </Button>
        }
      >
        {t("Tənzimləmələr yüklənmədi.")}
      </EmptyState>
    );
  }

  return <SettingsForm key={data.updatedAt ?? "new"} settings={data} />;
}
