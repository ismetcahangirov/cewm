"use client";

import { Plus, Search, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useGetProductsQuery } from "@/lib/api/admin";
import { cn } from "@/lib/utils";
import type { ProductOptionDto } from "@/lib/validation/products";
import { useContentText } from "@/lib/store/hooks";
import { useT } from "@/lib/admin/i18n/use-t";

import { arrayMove, DragHandle, SortableList } from "./sortable";

function ProductThumb({ product }: { product: ProductOptionDto }) {
  return (
    <span className="relative size-10 shrink-0 border border-border bg-surface">
      {product.thumbnail ? (
        <Image src={product.thumbnail.src} alt="" fill sizes="40px" className="object-contain" />
      ) : null}
    </span>
  );
}

export function ProductPicker({
  value,
  onChange,
  excludeId,
  max = 12,
  id,
  invalid,
  describedBy,
}: {
  value: ProductOptionDto[];
  onChange: (value: ProductOptionDto[]) => void;
  excludeId?: string;
  max?: number;
  id?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const text = useContentText();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isFetching } = useGetProductsQuery(
    {
      search: query,
      sort: "name",
      order: "asc",
      page: 0,
      pageSize: 20,
      status: "all",
      excludeId: excludeId ?? "",
    },
    { skip: !open },
  );
  const chosen = new Set(value.map((product) => product.id));
  const full = value.length >= max;

  return (
    <div className="flex flex-col gap-3">
      {value.length ? (
        <SortableList
          items={value}
          getId={(product) => product.id}
          getLabel={(product) => text(product.name)}
          onReorder={(from, to) => onChange(arrayMove(value, from, to))}
          className="flex flex-col border border-border"
          itemClassName="border-b border-border bg-white last:border-0"
        >
          {(product, _index, { handle }) => (
            <div className="flex items-center gap-2 py-1 pr-1 pl-1">
              <DragHandle
                label={t("{name}: yerini dəyiş", { name: text(product.name) })}
                {...handle}
              />
              <ProductThumb product={product} />
              <span className="min-w-0 flex-1 text-meta">
                <span className="block truncate">{text(product.name)}</span>
                {product.sku ? (
                  <span className="block truncate text-muted-foreground">{product.sku}</span>
                ) : null}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("{name}: çıxar", { name: text(product.name) })}
                onClick={() => onChange(value.filter((item) => item.id !== product.id))}
              >
                <X strokeWidth={1.5} />
              </Button>
            </div>
          )}
        </SortableList>
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            size="sm"
            disabled={full}
            aria-invalid={invalid}
            aria-describedby={describedBy}
            className="self-start"
          >
            <Plus strokeWidth={1.5} />
            {full ? t("Ən çox {count} məhsul", { count: max }) : t("Məhsul əlavə et")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0">
          <div className="border-b border-border p-2">
            <label className="relative block">
              <span className="sr-only">{t("Məhsul axtar")}</span>
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                strokeWidth={1.5}
              />
              <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("Ad və ya artikul")}
                className="pl-9"
                autoFocus
              />
            </label>
          </div>
          <ul
            className={cn("max-h-72 overflow-y-auto p-1", isFetching ? "opacity-60" : null)}
            aria-label={t("Məhsullar")}
          >
            {(data?.rows ?? []).map((product) => {
              const added = chosen.has(product.id);
              return (
                <li key={product.id}>
                  <button
                    type="button"
                    disabled={added || full}
                    onClick={() => {
                      onChange([
                        ...value,
                        {
                          id: product.id,
                          name: product.name,
                          sku: product.sku,
                          thumbnail: product.thumbnail,
                        },
                      ]);
                    }}
                    className="flex min-h-11 w-full items-center gap-3 rounded-sm px-2 py-1 text-left text-meta hover:bg-secondary disabled:opacity-50"
                  >
                    <ProductThumb product={product} />
                    <span className="min-w-0 flex-1 truncate">{text(product.name)}</span>
                    {added ? (
                      <span className="text-muted-foreground">{t("əlavə olunub")}</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
            {data && data.rows.length === 0 ? (
              <li className="px-2 py-3 text-meta text-muted-foreground">
                {t("Heç nə tapılmadı.")}
              </li>
            ) : null}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}
