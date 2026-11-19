"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { buildCategoryTree, categoryLabel, flattenTree } from "@/lib/admin/category-tree";
import { cn } from "@/lib/utils";
import type { CategoryNodeDto } from "@/lib/validation/categories";
import { useContentText } from "@/lib/store/hooks";
import { useT } from "@/lib/admin/i18n/use-t";

export function CategoryMultiSelect({
  categories,
  value,
  onChange,
  id,
  invalid,
  describedBy,
}: {
  categories: CategoryNodeDto[];
  value: string[];
  onChange: (value: string[]) => void;
  id?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const text = useContentText();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const flat = useMemo(() => flattenTree(buildCategoryTree(categories)), [categories]);
  const term = search.trim().toLocaleLowerCase("az");
  const visible = term
    ? flat.filter((node) => text(node.name).toLocaleLowerCase("az").includes(term))
    : flat;
  const selected = value
    .map((categoryId) => categories.find((node) => node.id === categoryId))
    .filter((node): node is CategoryNodeDto => Boolean(node));

  function toggle(categoryId: string) {
    onChange(
      value.includes(categoryId)
        ? value.filter((item) => item !== categoryId)
        : [...value, categoryId],
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-invalid={invalid}
            aria-describedby={describedBy}
            className="w-full justify-between rounded-sm border-input font-normal hover:bg-secondary hover:text-fg"
          >
            <span className="truncate">
              {selected.length
                ? t("{count} kateqoriya seçilib", { count: selected.length })
                : t("Kateqoriya seçin")}
            </span>
            <ChevronDown strokeWidth={1.5} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0">
          <div className="border-b border-border p-2">
            <label className="relative block">
              <span className="sr-only">{t("Kateqoriya axtar")}</span>
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                strokeWidth={1.5}
              />
              <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("Axtar")}
                className="pl-9"
              />
            </label>
          </div>
          <ul className="max-h-72 overflow-y-auto p-1" aria-label={t("Kateqoriyalar")}>
            {visible.map((node) => (
              <li key={node.id}>
                <label
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-3 rounded-sm px-2 text-meta hover:bg-secondary lg:min-h-9",
                    node.depth && !term ? "pl-8" : null,
                  )}
                >
                  <Checkbox
                    checked={value.includes(node.id)}
                    onCheckedChange={() => toggle(node.id)}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {term ? categoryLabel(node, categories, text) : text(node.name)}
                  </span>
                  {node.isActive ? null : (
                    <span className="shrink-0 text-muted-foreground">gizli</span>
                  )}
                </label>
              </li>
            ))}
            {visible.length === 0 ? (
              <li className="px-2 py-3 text-meta text-muted-foreground">
                {t("Heç nə tapılmadı.")}
              </li>
            ) : null}
          </ul>
        </PopoverContent>
      </Popover>
      {selected.length ? (
        <ul className="flex flex-wrap gap-2" aria-label={t("Seçilmiş kateqoriyalar")}>
          {selected.map((node) => (
            <li
              key={node.id}
              className="flex items-center gap-1 rounded-sm bg-secondary py-0.5 pr-0.5 pl-2 text-meta"
            >
              {categoryLabel(node, categories, text)}
              <button
                type="button"
                onClick={() => toggle(node.id)}
                aria-label={t("{name} kateqoriyasını çıxar", { name: text(node.name) })}
                className="-my-2 flex size-11 items-center justify-center rounded-sm hover:bg-chip lg:my-0 lg:size-8"
              >
                <X className="size-4" strokeWidth={1.5} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
