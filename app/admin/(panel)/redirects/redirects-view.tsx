"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Ellipsis, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/admin/format";
import type { MessageKey } from "@/lib/admin/i18n";
import { useT } from "@/lib/admin/i18n/use-t";
import { useDeleteRedirectMutation, useGetRedirectsQuery } from "@/lib/api/redirects";
import { apiErrorMessage, type Page } from "@/lib/api/types";
import type { RedirectDto, RedirectKind, RedirectSortField } from "@/lib/validation/redirects";

import { RedirectDialog } from "./redirect-dialog";

const column = createColumnHelper<DataTableFeatures, RedirectDto>();

const emptyPage: Page<RedirectDto> = { rows: [], rowCount: 0 };

const kindOptions: { value: RedirectKind; label: MessageKey }[] = [
  { value: "all", label: "Bütün ünvanlar" },
  { value: "pages", label: "Səhifələr" },
  { value: "files", label: "Şəkillər və fayllar" },
];

type Editing = { redirect: RedirectDto | null } | null;

export function RedirectsView() {
  const t = useT();
  const list = useListState<RedirectSortField>({ sort: "fromPath" });
  const [kind, setKind] = useState<RedirectKind>("pages");
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<RedirectDto | null>(null);
  const {
    data = emptyPage,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetRedirectsQuery({ ...list.args, kind });
  const [deleteRedirect] = useDeleteRedirectMutation();

  const columns = useMemo<DataTableColumn<RedirectDto>[]>(
    () =>
      column.columns([
        column.accessor("fromPath", {
          header: t("Köhnə ünvan"),
          meta: { label: t("Köhnə ünvan"), mobile: "title" },
          enableHiding: false,
          cell: ({ getValue }) => (
            <span className="font-medium break-all">{getValue<string>()}</span>
          ),
        }),
        column.accessor("toPath", {
          header: t("Yeni ünvan"),
          meta: { label: t("Yeni ünvan"), mobile: "detail" },
          cell: ({ getValue }) => <span className="break-all">{getValue<string>()}</span>,
        }),
        column.accessor("statusCode", {
          header: t("Kod"),
          meta: { label: t("Kod"), mobile: "detail", className: "whitespace-nowrap" },
          cell: ({ getValue }) => <span className="tabular-nums">{getValue<number>()}</span>,
        }),
        column.accessor("createdAt", {
          header: t("Yaradılıb"),
          meta: { label: t("Yaradılıb"), mobile: "hidden", className: "whitespace-nowrap" },
          cell: ({ getValue }) => formatDateTime(getValue<string>(), t.locale),
        }),
      ]),
    [t],
  );

  async function remove(redirect: RedirectDto): Promise<boolean> {
    try {
      await deleteRedirect(redirect.id).unwrap();
      toast.success(t("Yönləndirmə silindi."));
      return true;
    } catch (error) {
      toast.error(apiErrorMessage(error));
      return false;
    }
  }

  function rowActions(redirect: RedirectDto) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("{name}: əməliyyatlar", { name: redirect.fromPath })}
          >
            <Ellipsis strokeWidth={1.5} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuItem onSelect={() => setEditing({ redirect })}>
            <Pencil strokeWidth={1.5} />
            {t("Redaktə et")}
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={redirect.fromPath} target="_blank" rel="noreferrer">
              <ExternalLink strokeWidth={1.5} />
              {t("Saytda yoxla")}
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(redirect)}>
            <Trash2 strokeWidth={1.5} />
            {t("Sil")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const filtered = Boolean(list.args.search);

  return (
    <>
      <PageHeader
        title={t("Yönləndirmələr")}
        description={t(
          "Köhnə saytın ünvanları yeni səhifələrə bir addımda (301) yönləndirilir. Dəyişikliklər saytda dərhal görünür.",
        )}
        actions={
          <Button onClick={() => setEditing({ redirect: null })}>
            <Plus strokeWidth={1.5} />
            {t("Yeni yönləndirmə")}
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
          {t("Yönləndirmələr yüklənmədi.")}
        </EmptyState>
      ) : (
        <DataTable
          columns={columns}
          rows={data.rows}
          rowCount={data.rowCount}
          getRowId={(redirect) => redirect.id}
          list={list}
          loading={isLoading}
          fetching={isFetching}
          searchPlaceholder={t("Köhnə və ya yeni ünvan ilə axtar")}
          rowActions={rowActions}
          toolbar={
            <Select
              value={kind}
              onValueChange={(value) => {
                setKind(value as RedirectKind);
                list.setPagination((old) => ({ ...old, pageIndex: 0 }));
              }}
            >
              <SelectTrigger aria-label={t("Ünvan növü")} className="w-full sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {kindOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
          empty={
            <EmptyState
              action={
                filtered ? undefined : (
                  <Button onClick={() => setEditing({ redirect: null })}>
                    {t("Yeni yönləndirmə")}
                  </Button>
                )
              }
            >
              {filtered ? t("Seçimə uyğun yönləndirmə tapılmadı.") : t("Hələ yönləndirmə yoxdur.")}
            </EmptyState>
          }
        />
      )}
      {editing ? (
        <RedirectDialog redirect={editing.redirect} onClose={() => setEditing(null)} />
      ) : null}
      {deleting ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleting(null);
          }}
          title={t("«{name}» yönləndirməsi silinsin?", { name: deleting.fromPath })}
          description={t(
            "Bu ünvana gələn ziyarətçilər və axtarış sistemləri «Səhifə tapılmadı» görəcək.",
          )}
          confirmLabel={t("Sil")}
          destructive
          onConfirm={() => remove(deleting)}
        />
      ) : null}
    </>
  );
}
