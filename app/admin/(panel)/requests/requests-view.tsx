"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { CheckCheck, Download, Ellipsis, Eye, Trash2 } from "lucide-react";
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
import { RequestStatusBadge } from "@/components/admin/status-badge";
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
import { useT } from "@/lib/admin/i18n/use-t";
import {
  requestsExportHref,
  useDeleteRequestMutation,
  useGetRequestsQuery,
  useUpdateRequestMutation,
} from "@/lib/api/requests";
import { apiErrorMessage, type Page } from "@/lib/api/types";
import type { UserRole } from "@/lib/auth/roles";
import { telHref } from "@/lib/contact-links";
import { formatAzerbaijaniPhone } from "@/lib/phone";
import {
  quoteRequestStatusLabels,
  type QuoteRequestListItemDto,
  type QuoteRequestSortField,
  type QuoteRequestStatusFilter,
} from "@/lib/validation/quote-requests";

const column = createColumnHelper<DataTableFeatures, QuoteRequestListItemDto>();

const emptyPage: Page<QuoteRequestListItemDto> = { rows: [], rowCount: 0 };

export function RequestsView({ role }: { role: UserRole }) {
  const t = useT();
  const list = useListState<QuoteRequestSortField>({ sort: "createdAt", order: "desc" });
  const [status, setStatus] = useState<QuoteRequestStatusFilter>("all");
  const [deleting, setDeleting] = useState<QuoteRequestListItemDto | null>(null);
  const {
    data = emptyPage,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetRequestsQuery({ ...list.args, status });
  const [updateRequest] = useUpdateRequestMutation();
  const [deleteRequest] = useDeleteRequestMutation();

  const columns = useMemo<DataTableColumn<QuoteRequestListItemDto>[]>(
    () =>
      column.columns([
        column.accessor("createdAt", {
          header: t("Tarix"),
          meta: { label: t("Tarix"), mobile: "hidden", className: "whitespace-nowrap" },
          cell: ({ getValue }) => formatDateTime(getValue<string>(), t.locale),
        }),
        column.accessor("name", {
          header: t("Ad"),
          meta: { label: t("Ad"), mobile: "title" },
          enableHiding: false,
          cell: ({ row }) => (
            <Link
              href={`/admin/requests/${row.original.id}`}
              className="flex min-h-11 min-w-0 flex-col justify-center hover:underline md:min-h-0"
            >
              <span
                className={
                  row.original.status === "new"
                    ? "block truncate font-medium"
                    : "block truncate text-foreground"
                }
              >
                {row.original.name}
              </span>
              <span className="block truncate text-muted-foreground md:hidden">
                {formatDateTime(row.original.createdAt, t.locale)}
              </span>
            </Link>
          ),
        }),
        column.display({
          id: "phone",
          header: t("Telefon"),
          meta: { label: t("Telefon"), mobile: "detail", className: "whitespace-nowrap" },
          cell: ({ row }) => (
            <a
              href={telHref(row.original.phone)}
              className="inline-flex min-h-11 items-center hover:underline md:min-h-0"
            >
              {formatAzerbaijaniPhone(row.original.phone)}
            </a>
          ),
        }),
        column.display({
          id: "company",
          header: t("Şirkət"),
          meta: { label: t("Şirkət"), mobile: "hidden" },
          cell: ({ row }) =>
            row.original.company ? (
              <span className="line-clamp-2">{row.original.company}</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            ),
        }),
        column.display({
          id: "productCount",
          header: t("Məhsul"),
          meta: { label: t("Məhsul"), mobile: "hidden", className: "tabular-nums" },
          cell: ({ row }) => row.original.productCount,
        }),
        column.accessor("status", {
          header: t("Status"),
          meta: { label: t("Status"), mobile: "detail" },
          cell: ({ row }) => <RequestStatusBadge status={row.original.status} />,
        }),
      ]),
    [t],
  );

  async function markDone(request: QuoteRequestListItemDto) {
    try {
      await updateRequest({ id: request.id, status: "done" }).unwrap();
      toast.success(t("«{name}» cavablandı kimi qeyd olundu.", { name: request.name }));
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  async function remove(request: QuoteRequestListItemDto): Promise<boolean> {
    try {
      await deleteRequest(request.id).unwrap();
      toast.success(t("«{name}» müraciəti silindi.", { name: request.name }));
      return true;
    } catch (error) {
      toast.error(apiErrorMessage(error));
      return false;
    }
  }

  function rowActions(request: QuoteRequestListItemDto) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("{name}: əməliyyatlar", { name: request.name })}
          >
            <Ellipsis strokeWidth={1.5} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuItem asChild>
            <Link href={`/admin/requests/${request.id}`}>
              <Eye strokeWidth={1.5} />
              {t("Bax")}
            </Link>
          </DropdownMenuItem>
          {request.status !== "done" ? (
            <DropdownMenuItem onSelect={() => markDone(request)}>
              <CheckCheck strokeWidth={1.5} />
              {t("Cavablandı kimi qeyd et")}
            </DropdownMenuItem>
          ) : null}
          {role === "owner" ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(request)}>
                <Trash2 strokeWidth={1.5} />
                {t("Sil")}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const filtered = Boolean(list.args.search || status !== "all");
  const statusOptions: { value: QuoteRequestStatusFilter; label: string }[] = [
    { value: "all", label: t("Bütün müraciətlər") },
    { value: "new", label: t.message(quoteRequestStatusLabels.new) },
    { value: "in-progress", label: t.message(quoteRequestStatusLabels["in-progress"]) },
    { value: "done", label: t.message(quoteRequestStatusLabels.done) },
  ];

  return (
    <>
      <PageHeader
        title={t("Müraciətlər")}
        description={t(
          "Saytdakı «Təklif al» formasından gələn sorğular. Yeni müraciət açılanda «Baxılıb» olur.",
        )}
        actions={
          <Button asChild variant="outline">
            <a href={requestsExportHref({ status, search: list.args.search })} download>
              <Download strokeWidth={1.5} />
              {t("Excel-ə ixrac")}
            </a>
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
          {t("Müraciətlər yüklənmədi.")}
        </EmptyState>
      ) : (
        <DataTable
          columns={columns}
          rows={data.rows}
          rowCount={data.rowCount}
          getRowId={(request) => request.id}
          list={list}
          loading={isLoading}
          fetching={isFetching}
          searchPlaceholder={t("Ad, telefon, e-poçt və ya şirkət ilə axtar")}
          rowActions={rowActions}
          toolbar={
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as QuoteRequestStatusFilter);
                list.setPagination((old) => ({ ...old, pageIndex: 0 }));
              }}
            >
              <SelectTrigger aria-label={t("Status")} className="w-full sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
          empty={
            <EmptyState>
              {filtered
                ? t("Seçimə uyğun müraciət tapılmadı.")
                : t("Hələ müraciət yoxdur. Saytdan gələn təklif sorğuları burada görünəcək.")}
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
          title={t("«{name}» müraciəti silinsin?", { name: deleting.name })}
          description={t("Müraciət həmişəlik silinəcək. Bu əməliyyat geri qaytarılmır.")}
          confirmLabel={t("Sil")}
          destructive
          onConfirm={() => remove(deleting)}
        />
      ) : null}
    </>
  );
}
