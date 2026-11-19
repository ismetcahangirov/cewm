"use client";

import type { Locale } from "@/lib/i18n/config";
import { useT } from "@/lib/admin/i18n/use-t";

import { FormSection } from "./form";
import { LocaleTabs } from "./locale-tabs";
import { SeoFields } from "./seo-fields";

type LocalizedDraft = Partial<Record<Locale, string | null | undefined>> | null | undefined;

export function SeoSection({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
  fallbackTitle,
  fallbackDescription,
  path,
  errors,
}: {
  title: LocalizedDraft;
  description: LocalizedDraft;
  onTitleChange: (locale: Locale, value: string) => void;
  onDescriptionChange: (locale: Locale, value: string) => void;
  fallbackTitle: (locale: Locale) => string;
  fallbackDescription: (locale: Locale) => string;
  path: (locale: Locale) => string;
  errors: (locale: Locale) => { title?: string; description?: string };
}) {
  const t = useT();
  return (
    <FormSection title={t("Axtarış sistemləri")}>
      <LocaleTabs
        filled={{
          ru: Boolean(title?.ru || description?.ru),
          en: Boolean(title?.en || description?.en),
        }}
      >
        {(locale) => (
          <SeoFields
            locale={locale}
            title={title?.[locale] ?? ""}
            description={description?.[locale] ?? ""}
            onTitleChange={(next) => onTitleChange(locale, next)}
            onDescriptionChange={(next) => onDescriptionChange(locale, next)}
            fallbackTitle={fallbackTitle(locale)}
            fallbackDescription={fallbackDescription(locale)}
            path={path(locale)}
            errors={errors(locale)}
          />
        )}
      </LocaleTabs>
    </FormSection>
  );
}
