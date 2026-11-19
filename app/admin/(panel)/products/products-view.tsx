"use client";

import { createColumnHelper } from "@tanstack/react-table";
import {
  Copy,
  Ellipsis,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  RotateCcw,
  Star,
  StarOff,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { LocaleCompleteness } from "@/components/admin/locale-tabs";
import { filledLocales } from "@/lib/admin/form-values";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
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
import { buildCategoryTree, flattenTree } from "@/lib/admin/category-tree";
import { formatDateTime } from "@/lib/admin/format";
import type { MessageKey } from "@/lib/admin/i18n";
import { useT } from "@/lib/admin/i18n/use-t";
import {
  useBulkProductsMutation,
  useDuplicateProductMutation,
  useGetCategoriesQuery,
  useGetProductsQuery,
} from "@/lib/api/admin";
import { apiErrorMessage, type Page } from "@/lib/api/types";
import type { UserRole } from "@/lib/auth/roles";
import { useContentText } from "@/lib/store/hooks";
import type {
  ProductBulkAction,
  ProductListItemDto,
  ProductSortField,
  ProductStatusFilter,
} from "@/lib/validation/products";

const column = createColumnHelper<DataTableFeatures, ProductListItemDto>();

const emptyPage: Page<ProductListItemDto> = { rows: [], rowCount: 0 };

const statusOptions: { value: ProductStatusFilter; label: MessageKey }[] = [
  { value: "all", label: "Bütün statuslar" },
  { value: "published", label: "Dərc olunub" },
  { value: "draft", label: "Qaralama" },
  { value: "trash", label: "Silinənlər" },
];

type ActionCopy = {
  label: MessageKey;
  title: MessageKey;
  titleOne: MessageKey;
  description: MessageKey;
  done: MessageKey;
  doneOne: MessageKey;
};

const actionCopy: Record<ProductBulkAction, ActionCopy> = {
  publish: {
    label: "Dərc et",
    title: "{count} məhsul dərc olunsun?",
    titleOne: "«{name}» dərc olunsun?",
    description: "Məhsullar saytda görünəcək. Şəkli olmayanlar dərc olunmayacaq.",
    done: "{count} məhsul dərc olundu.",
    doneOne: "«{name}» dərc olundu.",
  },
  unpublish: {
    label: "Qaralamaya çevir",
    title: "{count} məhsul qaralamaya çevrilsin?",
    titleOne: "«{name}» qaralamaya çevrilsin?",
    description: "Məhsullar saytdan götürüləcək, amma silinməyəcək.",
    done: "{count} məhsul qaralamaya çevrildi.",
    doneOne: "«{name}» qaralamaya çevrildi.",
  },
  feature: {
    label: "Ana səhifəyə əlavə et",
    title: "{count} məhsul ana səhifəyə əlavə olunsun?",
    titleOne: "«{name}» ana səhifəyə əlavə olunsun?",
    description:
      "Məhsullar ana səhifənin seçilmiş məhsullar bölməsində görünəcək. Qaralamalar dərc olunana qədər görünmür.",
    done: "{count} məhsul ana səhifəyə əlavə olundu.",
    doneOne: "«{name}» ana səhifəyə əlavə olundu.",
  },
  unfeature: {
    label: "Ana səhifədən çıxar",
    title: "{count} məhsul ana səhifədən çıxarılsın?",
    titleOne: "«{name}» ana səhifədən çıxarılsın?",
    description: "Məhsullar kataloqda qalacaq, amma ana səhifədə görünməyəcək.",
    done: "{count} məhsul ana səhifədən çıxarıldı.",
    doneOne: "«{name}» ana səhifədən çıxarıldı.",
  },
  trash: {
    label: "Sil",
    title: "{count} məhsul silinsin?",
    titleOne: "«{name}» silinsin?",
    description:
      "Məhsullar saytdan götürüləcək və silinənlərə düşəcək. 30 gün ərzində bərpa etmək olar.",
    done: "{count} məhsul silinənlərə köçürüldü.",
    doneOne: "«{name}» silinənlərə köçürüldü.",
  },
  restore: {
    label: "Bərpa et",
    title: "{count} məhsul bərpa olunsun?",
    titleOne: "«{name}» bərpa olunsun?",
    description: "Bərpa olunan məhsullar qaralama kimi qayıdır.",
    done: "{count} məhsul bərpa olundu.",
    doneOne: "«{name}» bərpa olundu.",
  },
  purge: {
    label: "Həmişəlik sil",
    title: "{count} məhsul həmişəlik silinsin?",
    titleOne: "«{name}» həmişəlik silinsin?",
    description: "Bu əməliyyat geri qaytarılmır. Şəkillər media kitabxanasında qalır.",
    done: "{count} məhsul həmişəlik silindi.",
    doneOne: "«{name}» həmişəlik silindi.",
  },
};

type PendingAction = { action: ProductBulkAction; ids: string[]; names: string[] };

function Thumbnail({ product }: { product: ProductListItemDto }) {
  return (
    <span className="relative size-10 shrink-0 border border-border bg-surface">
      {product.thumbnail ? (
        <Image src={product.thumbnail.src} alt="" fill sizes="40px" className="object-contain" />
      ) : null}
    </span>
  );
}

export function ProductsView({ role }: { role: UserRole }) {
  const t = useT();
  const text = useContentText();
  const router = useRouter();
  const list = useListState<ProductSortField>({ sort: "updatedAt", order: "desc" });
  const [status, setStatus] = useState<ProductStatusFilter>("all");
  const [categoryId, setCategoryId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<PendingAction | null>(null);
  const categoriesQuery = useGetCategoriesQuery();
  const {
    data = emptyPage,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetProductsQuery({
    ...list.args,
    status,
    categoryId,
  });
  const [bulkProducts] = useBulkProductsMutation();
  const [duplicateProduct] = useDuplicateProductMutation();
  const inTrash = status === "trash";

  const categoryOptions = useMemo(
    () => flattenTree(buildCategoryTree(categoriesQuery.data ?? [])),
    [categoriesQuery.data],
  );

  const names = useMemo(
    () => new Map(data.rows.map((row) => [row.id, text(row.name)])),
    [data.rows, text],
  );

  function resetPage() {
    list.setPagination((old) => ({ ...old, pageIndex: 0 }));
    setSelected(new Set());
  }

  const columns = useMemo<DataTableColumn<ProductListItemDto>[]>(
    () =>
      column.columns([
        column.accessor("name", {
          header: t("Məhsul"),
          meta: { label: t("Məhsul"), mobile: "title" },
          enableHiding: false,
          cell: ({ row }) => (
            <Link
              href={`/admin/products/${row.original.id}`}
              className="flex min-w-0 items-center gap-3 hover:underline"
            >
              <Thumbnail product={row.original} />
              <span className="min-w-0">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate font-medium">{text(row.original.name)}</span>
                  {row.original.isFeatured && !row.original.deletedAt ? (
                    <span title={t("Ana səhifədə")} className="inline-flex shrink-0 text-primary">
                      <Star
                        className="size-3.5 fill-current"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      <span className="sr-only">{t("Ana səhifədə")}</span>
                    </span>
                  ) : null}
                </span>
                {row.original.sku ? (
                  <span className="block truncate text-muted-foreground md:hidden">
                    {row.original.sku}
                  </span>
                ) : null}
              </span>
            </Link>
          ),
        }),
        column.accessor("sku", {
          header: t("Model kodu"),
          meta: { label: t("Model kodu"), mobile: "hidden", className: "whitespace-nowrap" },
          cell: ({ getValue }) => getValue<string | null>() ?? "—",
        }),
        column.display({
          id: "categories",
          header: t("Kateqoriyalar"),
          meta: { label: t("Kateqoriya"), mobile: "detail" },
          cell: ({ row }) =>
            row.original.categories.length ? (
              <span className="line-clamp-2">{row.original.categories.map(text).join(", ")}</span>
            ) : (
              <span className="text-muted-foreground">{t("Kateqoriyasız")}</span>
            ),
        }),
        column.display({
          id: "locales",
          header: t("Dillər"),
          meta: { label: t("Dillər"), mobile: "detail" },
          cell: ({ row }) => <LocaleCompleteness filled={filledLocales(row.original.name)} />,
        }),
        column.accessor("status", {
          header: t("Status"),
          meta: { label: t("Status"), mobile: "detail" },
          cell: ({ row }) =>
            row.original.deletedAt ? (
              <Badge variant="outline">{t("Silinib")}</Badge>
            ) : (
              <PublishStatusBadge status={row.original.status} />
            ),
        }),
        column.accessor("updatedAt", {
          header: t("Dəyişib"),
          meta: { label: t("Dəyişib"), mobile: "hidden", className: "whitespace-nowrap" },
          cell: ({ getValue }) => formatDateTime(getValue<string>(), t.locale),
        }),
      ]),
    [text, t],
  );

  async function run(action: PendingAction): Promise<boolean> {
    try {
      const result = await bulkProducts({ action: action.action, ids: action.ids }).unwrap();
      const copy = actionCopy[action.action];
      const single = action.ids.length === 1 ? action.names[0] : undefined;
      if (result.updated) {
        toast.success(
          single ? t(copy.doneOne, { name: single }) : t(copy.done, { count: result.updated }),
        );
      }
      if (result.message) toast.warning(t.message(result.message));
      else if (!result.updated) toast.warning(t("Heç bir məhsul dəyişmədi."));
      setSelected(new Set());
      return true;
    } catch (error) {
      toast.error(apiErrorMessage(error));
      return false;
    }
  }

  function ask(action: ProductBulkAction, ids: string[]) {
    setPending({ action, ids, names: ids.map((id) => names.get(id) ?? "") });
  }

  async function duplicate(product: ProductListItemDto) {
    try {
      const copy = await duplicateProduct(product.id).unwrap();
      toast.success(t("«{name}» üçün kopya yaradıldı.", { name: text(product.name) }));
      router.push(`/admin/products/${copy.id}`);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  function rowActions(product: ProductListItemDto) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("{name}: əməliyyatlar", { name: text(product.name) })}
          >
            <Ellipsis strokeWidth={1.5} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          {product.deletedAt ? (
            <>
              <DropdownMenuItem onSelect={() => ask("restore", [product.id])}>
                <RotateCcw strokeWidth={1.5} />
                {t("Bərpa et")}
              </DropdownMenuItem>
              {role === "owner" ? (
                <DropdownMenuItem variant="destructive" onSelect={() => ask("purge", [product.id])}>
                  <Trash2 strokeWidth={1.5} />
                  {t("Həmişəlik sil")}
                </DropdownMenuItem>
              ) : null}
            </>
          ) : (
            <>
              <DropdownMenuItem asChild>
                <Link href={`/admin/products/${product.id}`}>
                  <Pencil strokeWidth={1.5} />
                  {t("Redaktə et")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => duplicate(product)}>
                <Copy strokeWidth={1.5} />
                {t("Kopyasını yarat")}
              </DropdownMenuItem>
              {product.status === "published" ? (
                <DropdownMenuItem onSelect={() => ask("unpublish", [product.id])}>
                  <EyeOff strokeWidth={1.5} />
                  {t("Qaralamaya çevir")}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => ask("publish", [product.id])}>
                  <Eye strokeWidth={1.5} />
                  {t("Dərc et")}
                </DropdownMenuItem>
              )}
              {product.isFeatured ? (
                <DropdownMenuItem onSelect={() => ask("unfeature", [product.id])}>
                  <StarOff strokeWidth={1.5} />
                  {t("Ana səhifədən çıxar")}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => ask("feature", [product.id])}>
                  <Star strokeWidth={1.5} />
                  {t("Ana səhifəyə əlavə et")}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => ask("trash", [product.id])}>
                <Trash2 strokeWidth={1.5} />
                {t("Sil")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const selectedIds = [...selected];
  const bulkActions: ProductBulkAction[] = inTrash
    ? role === "owner"
      ? ["restore", "purge"]
      : ["restore"]
    : ["publish", "unpublish", "feature", "unfeature", "trash"];

  const selectionBar = (
    <div
      role="region"
      aria-label={t("Seçilmiş məhsullar#selection")}
      className="flex flex-wrap items-center gap-2 border border-border bg-accent px-3 py-2 text-meta"
    >
      <span className="mr-auto font-medium">
        {t("{count} məhsul seçilib", { count: selected.size })}
      </span>
      {bulkActions.map((action) => (
        <Button
          key={action}
          size="sm"
          variant={action === "trash" || action === "purge" ? "destructive" : "outline"}
          className={action === "trash" || action === "purge" ? "bg-white" : undefined}
          onClick={() => ask(action, selectedIds)}
        >
          {t(actionCopy[action].label)}
        </Button>
      ))}
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label={t("Seçimi ləğv et")}
        onClick={() => setSelected(new Set())}
      >
        <X strokeWidth={1.5} />
      </Button>
    </div>
  );

  const filtered = Boolean(list.args.search || categoryId || status !== "all");

  return (
    <>
      <PageHeader
        title={t("Məhsullar")}
        description={t("Kataloqdakı bütün məhsullar. Dərc olunanlar saytda dərhal görünür.")}
        actions={
          <Button asChild>
            <Link href="/admin/products/new">
              <Plus strokeWidth={1.5} />
              {t("Yeni məhsul")}
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
          {t("Məhsullar yüklənmədi.")}
        </EmptyState>
      ) : (
        <DataTable
          columns={columns}
          rows={data.rows}
          rowCount={data.rowCount}
          getRowId={(product) => product.id}
          list={list}
          loading={isLoading}
          fetching={isFetching}
          searchPlaceholder={t("Ad, artikul və ya ünvan ilə axtar")}
          rowActions={rowActions}
          selection={{
            selected,
            onChange: setSelected,
            label: (id) => names.get(id) ?? t("məhsul"),
          }}
          selectionBar={selectionBar}
          toolbar={
            <>
              <Select
                value={categoryId || "all"}
                onValueChange={(value) => {
                  setCategoryId(value === "all" ? "" : value);
                  resetPage();
                }}
              >
                <SelectTrigger aria-label={t("Kateqoriya")} className="w-full sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("Bütün kateqoriyalar")}</SelectItem>
                  {categoryOptions.map((node) => (
                    <SelectItem key={node.id} value={node.id}>
                      {node.depth ? `— ${text(node.name)}` : text(node.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value as ProductStatusFilter);
                  resetPage();
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
            </>
          }
          empty={
            <EmptyState
              action={
                filtered ? undefined : (
                  <Button asChild>
                    <Link href="/admin/products/new">{t("Yeni məhsul")}</Link>
                  </Button>
                )
              }
            >
              {inTrash
                ? t("Silinənlər boşdur. Silinən məhsullar burada 30 gün saxlanılır.")
                : filtered
                  ? t("Seçimə uyğun məhsul tapılmadı.")
                  : t("Hələ məhsul yoxdur.")}
            </EmptyState>
          }
        />
      )}
      {pending ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setPending(null);
          }}
          title={
            pending.ids.length === 1 && pending.names[0]
              ? t(actionCopy[pending.action].titleOne, { name: pending.names[0] })
              : t(actionCopy[pending.action].title, { count: pending.ids.length })
          }
          description={t(actionCopy[pending.action].description)}
          confirmLabel={t(actionCopy[pending.action].label)}
          destructive={pending.action === "trash" || pending.action === "purge"}
          onConfirm={() => run(pending)}
        />
      ) : null}
    </>
  );
}
