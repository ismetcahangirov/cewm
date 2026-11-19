"use client";

import {
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnHelper,
  type ColumnVisibilityState,
  type PaginationState,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Search,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { pageSizes, type ListArgs } from "@/lib/validation/list";
import { useT } from "@/lib/admin/i18n/use-t";

export type DataTableColumnMeta = {
  label: string;
  mobile?: "title" | "detail" | "hidden";
  className?: string;
};

export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  columnVisibilityFeature,
  columnMeta: {} as DataTableColumnMeta,
});

export type DataTableFeatures = typeof dataTableFeatures;

export type DataTableColumn<Row extends RowData> = ReturnType<
  ColumnHelper<DataTableFeatures, Row>["columns"]
>[number];

function useDebounced<Value>(value: Value, delay: number): Value {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function useDelayedFlag(flag: boolean, delay: number): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!flag) return;
    const timer = setTimeout(() => setShown(true), delay);
    return () => {
      clearTimeout(timer);
      setShown(false);
    };
  }, [flag, delay]);
  return flag && shown;
}

export type ListState<Sort extends string> = {
  args: ListArgs<Sort>;
  search: string;
  setSearch: (value: string) => void;
  sorting: SortingState;
  setSorting: (updater: SortingState | ((old: SortingState) => SortingState)) => void;
  pagination: PaginationState;
  setPagination: (updater: PaginationState | ((old: PaginationState) => PaginationState)) => void;
};

export function useListState<Sort extends string>(defaults: {
  sort: Sort;
  order?: "asc" | "desc";
  pageSize?: number;
}): ListState<Sort> {
  const [search, setSearchValue] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: defaults.sort, desc: defaults.order === "desc" },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: defaults.pageSize ?? 20,
  });
  const debouncedSearch = useDebounced(search.trim(), 300);
  const sort = (sorting[0]?.id as Sort | undefined) ?? defaults.sort;

  return {
    args: {
      search: debouncedSearch,
      sort,
      order: sorting[0] ? (sorting[0].desc ? "desc" : "asc") : (defaults.order ?? "asc"),
      page: pagination.pageIndex,
      pageSize: pagination.pageSize,
    },
    search,
    setSearch(value) {
      setSearchValue(value);
      setPagination((old) => ({ ...old, pageIndex: 0 }));
    },
    sorting,
    setSorting(updater) {
      setSorting(updater);
      setPagination((old) => ({ ...old, pageIndex: 0 }));
    },
    pagination,
    setPagination,
  };
}

function SortIcon({ direction }: { direction: false | "asc" | "desc" }) {
  if (direction === "asc") return <ArrowUp className="size-4" strokeWidth={1.5} />;
  if (direction === "desc") return <ArrowDown className="size-4" strokeWidth={1.5} />;
  return <ArrowUpDown className="size-4 text-muted-foreground" strokeWidth={1.5} />;
}

export type RowSelection = {
  selected: ReadonlySet<string>;
  onChange: (next: Set<string>) => void;
  label: (id: string) => string;
};

export function DataTable<Row extends RowData, Sort extends string>({
  columns,
  rows,
  rowCount,
  getRowId,
  list,
  loading,
  fetching,
  searchPlaceholder = "Axtar",
  toolbar,
  rowActions,
  selection,
  selectionBar,
  empty,
}: {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  rowCount: number;
  getRowId: (row: Row) => string;
  list: ListState<Sort>;
  loading: boolean;
  fetching?: boolean;
  searchPlaceholder?: string;
  toolbar?: ReactNode;
  rowActions?: (row: Row) => ReactNode;
  selection?: RowSelection;
  selectionBar?: ReactNode;
  empty: ReactNode;
}) {
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});
  const t = useT();
  const showSkeleton = useDelayedFlag(loading, 300);

  const table = useTable({
    features: dataTableFeatures,
    columns,
    data: rows,
    getRowId,
    rowCount,
    manualPagination: true,
    manualSorting: true,
    enableSortingRemoval: false,
    state: {
      sorting: list.sorting,
      pagination: list.pagination,
      columnVisibility,
    },
    onSortingChange: list.setSorting,
    onPaginationChange: list.setPagination,
    onColumnVisibilityChange: setColumnVisibility,
  });

  const hideableColumns = table.getAllLeafColumns().filter((column) => column.getCanHide());
  const visibleColumns = table.getVisibleLeafColumns();
  const pageCount = Math.max(1, table.getPageCount());
  const { pageIndex, pageSize } = list.pagination;
  const from = rowCount === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min(rowCount, (pageIndex + 1) * pageSize);
  const tableRows = table.getRowModel().rows;
  const pageIds = rows.map(getRowId);
  const selectedOnPage = selection ? pageIds.filter((id) => selection.selected.has(id)) : [];
  const allSelected = pageIds.length > 0 && selectedOnPage.length === pageIds.length;

  function togglePage(checked: boolean) {
    if (!selection) return;
    const next = new Set(selection.selected);
    for (const id of pageIds) {
      if (checked) next.add(id);
      else next.delete(id);
    }
    selection.onChange(next);
  }

  function toggleRow(id: string, checked: boolean) {
    if (!selection) return;
    const next = new Set(selection.selected);
    if (checked) next.add(id);
    else next.delete(id);
    selection.onChange(next);
  }

  function selectBox(id: string) {
    if (!selection) return null;
    return (
      <Checkbox
        checked={selection.selected.has(id)}
        onCheckedChange={(checked) => toggleRow(id, checked === true)}
        aria-label={t("Seç: {name}", { name: selection.label(id) })}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 basis-60">
          <span className="sr-only">{t.message(searchPlaceholder)}</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.5}
          />
          <Input
            type="search"
            value={list.search}
            onChange={(event) => list.setSearch(event.target.value)}
            placeholder={t.message(searchPlaceholder)}
            className="pl-9"
          />
        </label>
        {hideableColumns.length ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="max-md:hidden">
                <Columns3 strokeWidth={1.5} />
                {t("Sütunlar")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              <DropdownMenuLabel className="text-muted-foreground">
                {t("Görünən sütunlar")}
              </DropdownMenuLabel>
              {hideableColumns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(checked) => column.toggleVisibility(checked)}
                  onSelect={(event) => event.preventDefault()}
                >
                  {column.columnDef.meta?.label ?? column.id}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        {toolbar}
      </div>

      {selection && selection.selected.size > 0 ? selectionBar : null}

      {!loading && rowCount === 0 ? (
        empty
      ) : (
        <div
          className={cn(
            "border border-border bg-white transition-opacity",
            fetching && !loading ? "opacity-60" : "opacity-100",
          )}
          aria-busy={loading || fetching}
        >
          <table className="w-full border-collapse text-meta max-md:hidden">
            <thead className="sticky top-14 z-10 bg-white">
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id} className="border-b border-border">
                  {selection ? (
                    <th scope="col" className="w-12 px-3 align-middle">
                      <Checkbox
                        className="flex"
                        checked={
                          allSelected ? true : selectedOnPage.length ? "indeterminate" : false
                        }
                        onCheckedChange={(checked) => togglePage(checked === true)}
                        aria-label={t("Bu səhifədəki hamısını seç")}
                      />
                    </th>
                  ) : null}
                  {group.headers.map((header) => {
                    const meta = header.column.columnDef.meta;
                    const sorted = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        scope="col"
                        aria-sort={
                          sorted === "asc"
                            ? "ascending"
                            : sorted === "desc"
                              ? "descending"
                              : undefined
                        }
                        className={cn(
                          "h-12 px-3 text-left align-middle font-medium text-heading",
                          meta?.className,
                        )}
                      >
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="-mx-2 inline-flex h-10 items-center gap-2 rounded-sm px-2 hover:bg-secondary"
                          >
                            <table.FlexRender header={header} />
                            <SortIcon direction={sorted} />
                          </button>
                        ) : (
                          <table.FlexRender header={header} />
                        )}
                      </th>
                    );
                  })}
                  {rowActions ? (
                    <th scope="col" className="w-14 px-3">
                      <span className="sr-only">{t("Əməliyyatlar")}</span>
                    </th>
                  ) : null}
                </tr>
              ))}
            </thead>
            <tbody>
              {showSkeleton && loading
                ? Array.from({ length: 5 }, (_, index) => (
                    <tr key={index} className="border-b border-border last:border-0">
                      {selection ? <td className="px-3" /> : null}
                      {visibleColumns.map((column) => (
                        <td key={column.id} className="h-12 px-3 py-2">
                          <Skeleton className="h-4 w-3/4" />
                        </td>
                      ))}
                      {rowActions ? <td className="px-3" /> : null}
                    </tr>
                  ))
                : tableRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border last:border-0 hover:bg-secondary"
                      data-selected={selection?.selected.has(row.id) || undefined}
                    >
                      {selection ? (
                        <td className="w-12 px-3 align-middle">
                          <div className="flex items-center">{selectBox(row.id)}</div>
                        </td>
                      ) : null}
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={cn(
                            "h-12 px-3 py-2 align-middle",
                            cell.column.columnDef.meta?.className,
                          )}
                        >
                          <table.FlexRender cell={cell} />
                        </td>
                      ))}
                      {rowActions ? (
                        <td className="px-3 py-1 text-right">{rowActions(row.original)}</td>
                      ) : null}
                    </tr>
                  ))}
            </tbody>
          </table>

          <ul className="divide-y divide-border md:hidden">
            {selection && !loading ? (
              <li className="flex min-h-11 items-center gap-3 px-4 py-2 text-meta">
                <Checkbox
                  id="data-table-select-page"
                  checked={allSelected ? true : selectedOnPage.length ? "indeterminate" : false}
                  onCheckedChange={(checked) => togglePage(checked === true)}
                />
                <label htmlFor="data-table-select-page" className="text-muted-foreground">
                  {t("Bu səhifədəki hamısını seç")}
                </label>
              </li>
            ) : null}
            {showSkeleton && loading
              ? Array.from({ length: 4 }, (_, index) => (
                  <li key={index} className="flex flex-col gap-2 p-4">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                  </li>
                ))
              : tableRows.map((row) => {
                  const cells = row.getAllCells();
                  const title = cells.filter(
                    (cell) => cell.column.columnDef.meta?.mobile === "title",
                  );
                  const details = cells.filter(
                    (cell) => cell.column.columnDef.meta?.mobile === "detail",
                  );
                  return (
                    <li key={row.id} className="flex items-start gap-3 p-4 text-meta">
                      {selection ? (
                        <div className="flex h-6 shrink-0 items-center">{selectBox(row.id)}</div>
                      ) : null}
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        {title.map((cell) => (
                          <div key={cell.id} className="min-w-0">
                            <table.FlexRender cell={cell} />
                          </div>
                        ))}
                        {details.length ? (
                          <dl className="mt-1 flex flex-col gap-1">
                            {details.map((cell) => (
                              <div key={cell.id} className="flex flex-wrap gap-x-2">
                                <dt className="text-muted-foreground">
                                  {cell.column.columnDef.meta?.label}
                                </dt>
                                <dd className="min-w-0">
                                  <table.FlexRender cell={cell} />
                                </dd>
                              </div>
                            ))}
                          </dl>
                        ) : null}
                      </div>
                      {rowActions ? (
                        <div className="shrink-0">{rowActions(row.original)}</div>
                      ) : null}
                    </li>
                  );
                })}
          </ul>
        </div>
      )}

      {rowCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-meta">
          <p className="text-muted-foreground" aria-live="polite">
            {from}–{to} / {rowCount}
          </p>
          <div className="flex items-center gap-2">
            <Select
              value={String(pageSize)}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger size="sm" aria-label={t("Səhifədə sətir sayı")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {pageSizes.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {t("{count} sətir", { count: size })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              aria-label={t("Əvvəlki səhifə")}
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              <ChevronLeft strokeWidth={1.5} />
            </Button>
            <span className="min-w-14 text-center tabular-nums">
              {pageIndex + 1} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label={t("Növbəti səhifə")}
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              <ChevronRight strokeWidth={1.5} />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
