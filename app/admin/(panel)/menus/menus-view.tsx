"use client";

import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/lib/admin/i18n/use-t";
import { useGetMenusQuery } from "@/lib/api/menus";
import { mainMenuKey } from "@/lib/validation/menus";

import { MenuEditor } from "./menu-editor";

export function MenusView({ menuId }: { menuId: string | null }) {
  const t = useT();
  const { data, isLoading, isError, refetch } = useGetMenusQuery();

  if (isLoading) {
    return (
      <>
        <PageHeader title={t("Menyular")} />
        <div className="flex flex-col gap-px border border-border" aria-busy="true">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      </>
    );
  }

  const menus = data ?? [];
  const current =
    menus.find((menu) => menu.id === menuId) ??
    menus.find((menu) => menu.key === mainMenuKey) ??
    menus[0];

  if (isError || !current) {
    return (
      <>
        <PageHeader title={t("Menyular")} />
        <EmptyState
          action={
            <Button variant="outline" onClick={() => refetch()}>
              {t("Yenidən yüklə")}
            </Button>
          }
        >
          {isError ? t("Menyular yüklənmədi.") : t("Hələ menyu yoxdur.")}
        </EmptyState>
      </>
    );
  }

  return <MenuEditor key={current.id} menu={current} menus={menus} />;
}
