"use client";

import { useId } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { env } from "@/lib/env";
import { localePath, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/admin/i18n/use-t";

export const seoLimits = { title: 60, description: 160 } as const;

function Counter({ length, limit, id }: { length: number; limit: number; id: string }) {
  return (
    <span
      id={id}
      className={cn(
        "text-meta tabular-nums",
        length > limit ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {length} / {limit}
    </span>
  );
}

export function SeoFields({
  locale,
  title,
  description,
  onTitleChange,
  onDescriptionChange,
  fallbackTitle,
  fallbackDescription,
  path,
  errors,
}: {
  locale: Locale;
  title: string;
  description: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  fallbackTitle: string;
  fallbackDescription: string;
  path: string;
  errors?: { title?: string; description?: string };
}) {
  const id = useId();
  const t = useT();
  const shownTitle = title.trim() || fallbackTitle || t("Səhifənin adı");
  const shownDescription = description.trim() || fallbackDescription;
  const url = new URL(localePath(locale, path), env.NEXT_PUBLIC_SITE_URL);
  const crumbs = [url.host, ...url.pathname.split("/").filter(Boolean)];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor={`${id}-title`} className="text-meta font-medium">
            {t("SEO başlığı")}
          </Label>
          <Counter length={title.trim().length} limit={seoLimits.title} id={`${id}-title-count`} />
        </div>
        <Input
          id={`${id}-title`}
          value={title}
          maxLength={120}
          placeholder={fallbackTitle}
          aria-describedby={`${id}-title-count`}
          aria-invalid={Boolean(errors?.title)}
          onChange={(event) => onTitleChange(event.target.value)}
        />
        {errors?.title ? (
          <p className="text-meta text-destructive">{t.message(errors.title)}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor={`${id}-description`} className="text-meta font-medium">
            {t("SEO təsviri")}
          </Label>
          <Counter
            length={description.trim().length}
            limit={seoLimits.description}
            id={`${id}-description-count`}
          />
        </div>
        <Textarea
          id={`${id}-description`}
          value={description}
          maxLength={320}
          rows={3}
          placeholder={fallbackDescription}
          aria-describedby={`${id}-description-count`}
          aria-invalid={Boolean(errors?.description)}
          onChange={(event) => onDescriptionChange(event.target.value)}
        />
        {errors?.description ? (
          <p className="text-meta text-destructive">{t.message(errors.description)}</p>
        ) : null}
      </div>
      <figure className="flex flex-col gap-2">
        <figcaption className="text-meta font-medium">{t("Axtarışda belə görünəcək")}</figcaption>
        <div className="flex flex-col gap-1 border border-border bg-white p-4">
          <p className="truncate text-meta text-muted-foreground">{crumbs.join(" › ")}</p>
          <p className="line-clamp-1 text-lead text-graphite">{shownTitle}</p>
          <p className="line-clamp-2 text-meta">
            {shownDescription || t("Təsvir boşdur: axtarış sistemi mətni səhifədən özü seçəcək.")}
          </p>
        </div>
      </figure>
    </div>
  );
}
