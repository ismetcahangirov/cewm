"use client";

import { LocaleCompleteness } from "@/components/admin/locale-tabs";
import { filledLocales } from "@/lib/admin/form-values";
import { createColumnHelper } from "@tanstack/react-table";
import { Ellipsis, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import {
  DataTable,
  useListState,
  type DataTableColumn,
  type DataTableFeatures,
} from "@/components/admin/data-table";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { PublishStatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateTime } from "@/lib/admin/format";
import { useT, type Translate } from "@/lib/admin/i18n/use-t";
import { useDeletePageMutation, useGetPagesQuery } from "@/lib/api/content";
import { apiErrorMessage, type Page } from "@/lib/api/types";
import { localePath } from "@/lib/i18n/config";
import { routes } from "@/lib/routes";
import { useContentLocale, useContentText } from "@/lib/store/hooks";
import {
  freePageLabel,
  pageKindLabels,
  type PageListItemDto,
  type PageSortField,
} from "@/lib/validation/pages";

const column = createColumnHelper<DataTableFeatures, PageListItemDto>();

const emptyPage: Page<PageListItemDto> = { rows: [], rowCount: 0 };

export function deletePageDescription(t: Translate, menuItemCount: number): string {
  return menuItemCount
    ? t(
        "Səhifə saytdan həmişəlik silinəcək. Bu əməliyyat geri qaytarılmır. Menyuda bu səhifəyə aparan {count} keçid də silinəcək.",
        { count: menuItemCount },
      )
    : t("Səhifə saytdan həmişəlik silinəcək. Bu əməliyyat geri qaytarılmır.");
}

export function PagesView() {
  const locale = useContentLocale();
  const text = useContentText();
  const t = useT();
  const list = useListState<PageSortField>({ sort: "updatedAt", order: "desc" });
  const [deleting, setDeleting] = useState<PageListItemDto | null>(null);
  const { data = emptyPage, isLoading, isFetching, isError, refetch } = useGetPagesQuery(list.args);
  const [deletePage] = useDeletePageMutation();

  const columns = useMemo<DataTableColumn<PageListItemDto>[]>(
    () =>
      column.columns([
        column.accessor("title", {
          header: t("Səhifə"),
          meta: { label: t("Səhifə"), mobile: "title" },
          enableHiding: false,
          cell: ({ row }) => (
            <Link
              href={`/admin/pages/${row.original.id}`}
              className="block min-w-0 hover:underline"
            >
              <span className="block truncate font-medium">{text(row.original.title)}</span>
              <span className="block truncate text-muted-foreground md:hidden">
                {routes.page(text(row.original.slug))}
              </span>
            </Link>
          ),
        }),
        column.display({
          id: "address",
          header: t("Ünvan"),
          meta: { label: t("Ünvan"), mobile: "hidden" },
          cell: ({ row }) => (
            <span className="break-all text-muted-foreground">
              {routes.page(text(row.original.slug))}
            </span>
          ),
        }),
        column.display({
          id: "kind",
          header: t("Növ"),
          meta: { label: t("Növ"), mobile: "detail", className: "whitespace-nowrap" },
          cell: ({ row }) =>
            t.message(row.original.kind ? pageKindLabels[row.original.kind] : freePageLabel),
        }),
        column.display({
          id: "locales",
          header: t("Dillər"),
          meta: { label: t("Dillər"), mobile: "detail" },
          cell: ({ row }) => <LocaleCompleteness filled={filledLocales(row.original.title)} />,
        }),
        column.accessor("status", {
          header: t("Status"),
          meta: { label: t("Status"), mobile: "detail" },
          cell: ({ row }) => <PublishStatusBadge status={row.original.status} />,
        }),
        column.accessor("updatedAt", {
          header: t("Dəyişib"),
          meta: { label: t("Dəyişib"), mobile: "hidden", className: "whitespace-nowrap" },
          cell: ({ getValue }) => formatDateTime(getValue<string>(), t.locale),
        }),
      ]),
    [text, t],
  );

  async function remove(page: PageListItemDto): Promise<boolean> {
    try {
      await deletePage(page.id).unwrap();
      toast.success(t("«{name}» silindi.", { name: text(page.title) }));
      return true;
    } catch (error) {
      toast.error(apiErrorMessage(error));
      return false;
    }
  }

  function rowActions(page: PageListItemDto) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("{name}: əməliyyatlar", { name: text(page.title) })}
          >
            <Ellipsis strokeWidth={1.5} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuItem asChild>
            <Link href={`/admin/pages/${page.id}`}>
              <Pencil strokeWidth={1.5} />
              {t("Redaktə et")}
            </Link>
          </DropdownMenuItem>
          {page.status === "published" ? (
            <DropdownMenuItem asChild>
              <a
                href={localePath(locale, routes.page(text(page.slug)))}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink strokeWidth={1.5} />
                {t("Saytda bax")}
              </a>
            </DropdownMenuItem>
          ) : null}
          {page.kind ? null : (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(page)}>
                <Trash2 strokeWidth={1.5} />
                {t("Sil")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <PageHeader
        title={t("Səhifələr")}
        description={t(
          "Haqqımızda, Əlaqə kimi sistem səhifələri və sərbəst səhifələr. Ünvan saytın kökündə olur.",
        )}
        actions={
          <Button asChild>
            <Link href="/admin/pages/new">
              <Plus strokeWidth={1.5} />
              {t("Yeni səhifə")}
            </Link>
          </Button>
        }
      />
      {isError ? (
        <EmptyState
          action={
            <Button variant="outline" onClick={() => refetch()}>
              {t("Yenidən yüklə")}
            </Button>
          }
        >
          {t("Səhifələr yüklənmədi.")}
        </EmptyState>
      ) : (
        <DataTable
          columns={columns}
          rows={data.rows}
          rowCount={data.rowCount}
          getRowId={(page) => page.id}
          list={list}
          loading={isLoading}
          fetching={isFetching}
          searchPlaceholder={t("Ad və ya ünvan ilə axtar")}
          rowActions={rowActions}
          empty={
            <EmptyState
              action={
                list.args.search ? undefined : (
                  <Button asChild>
                    <Link href="/admin/pages/new">{t("Yeni səhifə")}</Link>
                  </Button>
                )
              }
            >
              {list.args.search ? t("Axtarışa uyğun səhifə tapılmadı.") : t("Hələ səhifə yoxdur.")}
            </EmptyState>
          }
        />
      )}
      {deleting ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleting(null);
          }}
          title={t("«{name}» silinsin?", { name: text(deleting.title) })}
          description={deletePageDescription(t, deleting.menuItemCount)}
          confirmLabel={t("Sil")}
          destructive
          onConfirm={() => remove(deleting)}
        />
      ) : null}
    </>
  );
}
