"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCheckSlugQuery } from "@/lib/api/admin";
import { localePath, type Locale } from "@/lib/i18n/config";
import { slugify } from "@/lib/slug";
import { slugPattern } from "@/lib/validation/fields";
import type { SlugEntity } from "@/lib/validation/slugs";
import { useT } from "@/lib/admin/i18n/use-t";

export function SlugInput({
  value,
  onChange,
  onBlur,
  entity,
  locale,
  excludeId,
  source,
  pathFor,
  id,
  invalid,
  describedBy,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  entity: SlugEntity;
  locale: Locale;
  excludeId?: string;
  source: string;
  pathFor: (slug: string) => string;
  id?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [debounced, setDebounced] = useState(value);
  const t = useT();
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), 400);
    return () => clearTimeout(timer);
  }, [value]);

  const valid = slugPattern.test(debounced);
  const { data, isFetching } = useCheckSlugQuery(
    { entity, locale, slug: debounced, excludeId: excludeId ?? "" },
    { skip: !valid },
  );
  const settled = debounced === value && !isFetching;
  const taken = settled && valid && data && !data.available && data.suggestion !== value;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          aria-invalid={invalid || Boolean(taken)}
          aria-describedby={describedBy}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="font-normal"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t("Addan yarat")}
          title={t("Addan yarat")}
          disabled={!source.trim()}
          onClick={() => onChange(slugify(source))}
        >
          <RefreshCw strokeWidth={1.5} />
        </Button>
      </div>
      <p className="text-meta break-all text-muted-foreground" aria-live="polite">
        {taken && data ? (
          <span className="text-destructive">
            {t("Bu ünvan artıq istifadə olunur.")}{" "}
            <button
              type="button"
              className="text-graphite underline underline-offset-4 hover:no-underline"
              onClick={() => onChange(data.suggestion)}
            >
              {t("«{slug}» istifadə et", { slug: data.suggestion })}
            </button>
          </span>
        ) : value ? (
          t("Ünvan: {path}", { path: localePath(locale, pathFor(value)) })
        ) : (
          t("Ünvan addan avtomatik yaranır.")
        )}
      </p>
    </div>
  );
}
