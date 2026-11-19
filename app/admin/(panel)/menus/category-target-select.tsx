"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/lib/admin/i18n/use-t";
import type { Localized } from "@/lib/i18n/localized";
import { cn } from "@/lib/utils";
import type { MenuCategoryOption } from "@/lib/validation/menus";
import { useContentText } from "@/lib/store/hooks";

type Option = MenuCategoryOption & { depth: number; path: string };

function orderCategories(
  categories: MenuCategoryOption[],
  text: (value: Localized) => string,
): Option[] {
  const known = new Set(categories.map((category) => category.id));
  const byParent = new Map<string | null, MenuCategoryOption[]>();
  for (const category of categories) {
    const parent = category.parentId && known.has(category.parentId) ? category.parentId : null;
    byParent.set(parent, [...(byParent.get(parent) ?? []), category]);
  }
  const walk = (parentId: string | null, depth: number, prefix: string): Option[] =>
    (byParent.get(parentId) ?? []).flatMap((category) => {
      const path = prefix ? `${prefix} / ${text(category.title)}` : text(category.title);
      return [{ ...category, depth, path }, ...walk(category.id, depth + 1, path)];
    });
  return walk(null, 0, "");
}

export function CategoryTargetSelect({
  categories,
  value,
  onChange,
  id,
  invalid,
  describedBy,
}: {
  categories: MenuCategoryOption[];
  value: string | null;
  onChange: (category: MenuCategoryOption) => void;
  id?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const t = useT();
  const text = useContentText();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const options = useMemo(() => orderCategories(categories, text), [categories, text]);
  const term = search.trim().toLocaleLowerCase("az");
  const visible = term
    ? options.filter((option) => option.path.toLocaleLowerCase("az").includes(term))
    : options;
  const selected = options.find((option) => option.id === value);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className="w-full justify-between rounded-sm border-input px-3 font-normal hover:bg-secondary hover:text-fg"
        >
          <span className="truncate">{selected ? selected.path : t("Kateqoriya seçin")}</span>
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
          {visible.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                aria-pressed={option.id === value}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                  setSearch("");
                }}
                className={cn(
                  "flex min-h-11 w-full items-center gap-3 rounded-sm px-2 text-left text-meta hover:bg-secondary lg:min-h-9",
                  option.depth && !term ? "pl-8" : null,
                )}
              >
                <Check
                  className={cn(
                    "size-4 shrink-0",
                    option.id === value ? "opacity-100" : "opacity-0",
                  )}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate">
                  {term ? option.path : text(option.title)}
                </span>
                {option.isActive ? null : (
                  <span className="shrink-0 text-muted-foreground">{t("gizli")}</span>
                )}
              </button>
            </li>
          ))}
          {visible.length === 0 ? (
            <li className="px-2 py-3 text-meta text-muted-foreground">{t("Heç nə tapılmadı.")}</li>
          ) : null}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
