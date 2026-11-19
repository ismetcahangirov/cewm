"use client";

import { LocaleCompleteness } from "@/components/admin/locale-tabs";
import { filledLocales } from "@/lib/admin/form-values";
import { createColumnHelper } from "@tanstack/react-table";
import { Ellipsis, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
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
import { useDeletePostMutation, useGetPostsQuery } from "@/lib/api/content";
import { apiErrorMessage, type Page } from "@/lib/api/types";
import { localePath } from "@/lib/i18n/config";
import { routes } from "@/lib/routes";
import type { PostListItemDto, PostSortField, PostStatusFilter } from "@/lib/validation/posts";
import { useContentLocale, useContentText } from "@/lib/store/hooks";

import { PostStatus } from "./post-status";

const column = createColumnHelper<DataTableFeatures, PostListItemDto>();

const emptyPage: Page<PostListItemDto> = { rows: [], rowCount: 0 };

const statusOptions: { value: PostStatusFilter; label: MessageKey }[] = [
  { value: "all", label: "Bütün statuslar" },
  { value: "published", label: "Dərc olunub" },
  { value: "scheduled", label: "Planlaşdırılıb" },
  { value: "draft", label: "Qaralama" },
];

export const deletePostDescription: MessageKey =
  "Yazı saytdan və admin paneldən həmişəlik silinəcək. Bu əməliyyat geri qaytarılmır. Örtük şəkli media kitabxanasında qalır.";

function Cover({ post }: { post: PostListItemDto }) {
  return (
    <span className="relative size-10 shrink-0 border border-border bg-surface">
      {post.cover ? (
        <Image src={post.cover.src} alt="" fill sizes="40px" className="object-cover" />
      ) : null}
    </span>
  );
}

export function PostsView() {
  const locale = useContentLocale();
  const text = useContentText();
  const t = useT();
  const list = useListState<PostSortField>({ sort: "updatedAt", order: "desc" });
  const [status, setStatus] = useState<PostStatusFilter>("all");
  const [deleting, setDeleting] = useState<PostListItemDto | null>(null);
  const {
    data = emptyPage,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetPostsQuery({ ...list.args, status });
  const [deletePost] = useDeletePostMutation();

  const columns = useMemo<DataTableColumn<PostListItemDto>[]>(
    () =>
      column.columns([
        column.accessor("title", {
          header: t("Yazı"),
          meta: { label: t("Yazı"), mobile: "title" },
          enableHiding: false,
          cell: ({ row }) => (
            <Link
              href={`/admin/blog/${row.original.id}`}
              className="flex min-w-0 items-center gap-3 hover:underline"
            >
              <Cover post={row.original} />
              <span className="min-w-0">
                <span className="block truncate font-medium">{text(row.original.title)}</span>
                <span className="block truncate text-muted-foreground md:hidden">
                  {routes.post(text(row.original.slug))}
                </span>
              </span>
            </Link>
          ),
        }),
        column.display({
          id: "locales",
          header: t("Dillər"),
          meta: { label: t("Dillər"), mobile: "detail" },
          cell: ({ row }) => <LocaleCompleteness filled={filledLocales(row.original.title)} />,
        }),
        column.display({
          id: "status",
          header: t("Status"),
          meta: { label: t("Status"), mobile: "detail" },
          cell: ({ row }) => (
            <PostStatus state={row.original.state} publishedAt={row.original.publishedAt} />
          ),
        }),
        column.accessor("publishedAt", {
          header: t("Dərc tarixi"),
          meta: { label: t("Dərc tarixi"), mobile: "hidden", className: "whitespace-nowrap" },
          cell: ({ getValue }) => formatDateTime(getValue<string | null>(), t.locale),
        }),
        column.accessor("updatedAt", {
          header: t("Dəyişib"),
          meta: { label: t("Dəyişib"), mobile: "hidden", className: "whitespace-nowrap" },
          cell: ({ getValue }) => formatDateTime(getValue<string>(), t.locale),
        }),
      ]),
    [text, t],
  );

  async function remove(post: PostListItemDto): Promise<boolean> {
    try {
      await deletePost(post.id).unwrap();
      toast.success(t("«{name}» silindi.", { name: text(post.title) }));
      return true;
    } catch (error) {
      toast.error(apiErrorMessage(error));
      return false;
    }
  }

  function rowActions(post: PostListItemDto) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("{name}: əməliyyatlar", { name: text(post.title) })}
          >
            <Ellipsis strokeWidth={1.5} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuItem asChild>
            <Link href={`/admin/blog/${post.id}`}>
              <Pencil strokeWidth={1.5} />
              {t("Redaktə et")}
            </Link>
          </DropdownMenuItem>
          {post.state === "published" ? (
            <DropdownMenuItem asChild>
              <a
                href={localePath(locale, routes.post(text(post.slug)))}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink strokeWidth={1.5} />
                {t("Saytda bax")}
              </a>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(post)}>
            <Trash2 strokeWidth={1.5} />
            {t("Sil")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const filtered = Boolean(list.args.search || status !== "all");

  return (
    <>
      <PageHeader
        title={t("Bloq")}
        description={t(
          "Yazılar dərc tarixindən etibarən saytda görünür. Gələcək tarix seçilən yazı həmin vaxt özü dərc olunur.",
        )}
        actions={
          <Button asChild>
            <Link href="/admin/blog/new">
              <Plus strokeWidth={1.5} />
              {t("Yeni yazı")}
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
          {t("Yazılar yüklənmədi.")}
        </EmptyState>
      ) : (
        <DataTable
          columns={columns}
          rows={data.rows}
          rowCount={data.rowCount}
          getRowId={(post) => post.id}
          list={list}
          loading={isLoading}
          fetching={isFetching}
          searchPlaceholder={t("Başlıq və ya ünvan ilə axtar")}
          rowActions={rowActions}
          toolbar={
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as PostStatusFilter);
                list.setPagination((old) => ({ ...old, pageIndex: 0 }));
              }}
            >
              <SelectTrigger aria-label={t("Status")} className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
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
                  <Button asChild>
                    <Link href="/admin/blog/new">{t("Yeni yazı")}</Link>
                  </Button>
                )
              }
            >
              {filtered ? t("Seçimə uyğun yazı tapılmadı.") : t("Hələ yazı yoxdur.")}
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
          description={t(deletePostDescription)}
          confirmLabel={t("Sil")}
          destructive
          onConfirm={() => remove(deleting)}
        />
      ) : null}
    </>
  );
}
