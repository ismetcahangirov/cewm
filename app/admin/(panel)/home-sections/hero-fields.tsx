"use client";

import Link from "next/link";
import { useFormContext, useWatch } from "react-hook-form";

import { FormField } from "@/components/admin/form";
import { LocaleTabs } from "@/components/admin/locale-tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { hasLocaleError } from "@/lib/admin/form-values";
import { useT } from "@/lib/admin/i18n/use-t";
import { locales, type Locale } from "@/lib/i18n/config";
import type { HeroFilmOptionDto } from "@/lib/validation/hero-films";
import type { HomeSectionsInput } from "@/lib/validation/home-sections";

const noFilm = "none";

export function HeroFields({ films }: { films: HeroFilmOptionDto[] }) {
  const t = useT();
  const form = useFormContext<HomeSectionsInput>();
  const hero = useWatch({ control: form.control, name: "hero" });
  const errors = form.formState.errors.hero;

  const invalid = Object.fromEntries(
    locales.map((locale) => [
      locale,
      hasLocaleError(errors?.headline, locale) ||
        hasLocaleError(errors?.subline, locale) ||
        hasLocaleError(errors?.ctaLabel, locale),
    ]),
  ) as Partial<Record<Locale, boolean>>;

  const filled = (locale: "ru" | "en" | "de") =>
    Boolean(hero?.headline?.[locale] || hero?.subline?.[locale] || hero?.ctaLabel?.[locale]);

  return (
    <div className="flex flex-col gap-5">
      <LocaleTabs
        invalid={invalid}
        filled={{ ru: filled("ru"), en: filled("en"), de: filled("de") }}
      >
        {(locale) => (
          <>
            <FormField
              control={form.control}
              name={`hero.headline.${locale}`}
              label={t("Başlıq ({locale})", { locale: locale.toUpperCase() })}
              required={locale === "az"}
              render={({ field, id, invalid: fieldInvalid, describedBy }) => (
                <Input
                  {...field}
                  value={field.value ?? ""}
                  id={id}
                  maxLength={120}
                  aria-invalid={fieldInvalid}
                  aria-describedby={describedBy}
                />
              )}
            />
            <FormField
              control={form.control}
              name={`hero.subline.${locale}`}
              label={t("Alt mətn ({locale})", { locale: locale.toUpperCase() })}
              description={locale === "az" ? t("İstəyə bağlıdır, bir-iki cümlə.") : undefined}
              render={({ field, id, invalid: fieldInvalid, describedBy }) => (
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  id={id}
                  rows={2}
                  maxLength={300}
                  aria-invalid={fieldInvalid}
                  aria-describedby={describedBy}
                />
              )}
            />
            <FormField
              control={form.control}
              name={`hero.ctaLabel.${locale}`}
              label={t("Düymənin mətni ({locale})", { locale: locale.toUpperCase() })}
              render={({ field, id, invalid: fieldInvalid, describedBy }) => (
                <Input
                  {...field}
                  value={field.value ?? ""}
                  id={id}
                  maxLength={40}
                  aria-invalid={fieldInvalid}
                  aria-describedby={describedBy}
                />
              )}
            />
          </>
        )}
      </LocaleTabs>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="hero.ctaHref"
          label={t("Düymənin linki")}
          description={t(
            "Saytdakı ünvan, məsələn /mehsullar, və ya https:// ilə tam link. Bütün dillərdə eynidir.",
          )}
          render={({ field, id, invalid: fieldInvalid, describedBy }) => (
            <Input
              {...field}
              value={field.value ?? ""}
              id={id}
              inputMode="url"
              autoComplete="off"
              maxLength={500}
              placeholder="/mehsullar"
              aria-invalid={fieldInvalid}
              aria-describedby={describedBy}
            />
          )}
        />
        <FormField
          control={form.control}
          name="hero.filmId"
          label={t("Hero filmi")}
          description={
            <>
              {t("Bütün dillərdə eyni film göstərilir.")}{" "}
              <Link href="/admin/hero-films" className="underline underline-offset-4">
                {t("Filmləri idarə et")}
              </Link>
            </>
          }
          render={({ field, id, invalid: fieldInvalid, describedBy }) => (
            <Select
              value={field.value || noFilm}
              onValueChange={(value) => field.onChange(value === noFilm ? "" : value)}
            >
              <SelectTrigger
                id={id}
                className="w-full"
                aria-invalid={fieldInvalid}
                aria-describedby={describedBy}
                onBlur={field.onBlur}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={noFilm}>{t("Filmsiz")}</SelectItem>
                {films.map((film) => (
                  <SelectItem key={film.id} value={film.id}>
                    {t("{name} · {count} kadr", { name: film.name, count: film.frameCount })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
    </div>
  );
}
