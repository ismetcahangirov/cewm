"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { LocaleTabs } from "@/components/admin/locale-tabs";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { useUnsavedChangesGuard } from "@/components/admin/unsaved-changes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { MessageKey } from "@/lib/admin/i18n";
import { useT } from "@/lib/admin/i18n/use-t";
import { useGetSiteTextsQuery, useUpdateSiteTextsMutation } from "@/lib/api/site-texts";
import { apiErrorMessage, isApiError } from "@/lib/api/types";
import { locales, type Locale } from "@/lib/i18n/config";
import { siteTextMaxLength, type SiteTextsDto } from "@/lib/validation/site-texts";

type Defaults = Record<Locale, Record<string, string>>;

type Values = Record<string, Record<Locale, string>>;

const groupLabels: Record<string, MessageKey> = {
  meta: "Sayt adı və əsas təsvir",
  common: "Ümumi düymələr və etiketlər",
  contact: "Əlaqə səhifəsi",
  footer: "Səhifənin alt hissəsi",
  home: "Ana səhifə bölmə başlıqları",
  catalog: "Kataloq",
  product: "Məhsul səhifəsi",
  blog: "Bloq",
  brands: "Brendlər səhifəsi",
  clients: "Müştərilər səhifəsi",
  consultation: "Konsultasiya forması",
  notFound: "404 səhifəsi",
  error: "Xəta səhifəsi",
};

const emptyRow: Record<Locale, string> = { az: "", ru: "", en: "", de: "" };

function toValues(saved: SiteTextsDto["texts"]): Values {
  return Object.fromEntries(
    Object.entries(saved).map(([key, row]) => [
      key,
      { az: row.az ?? "", ru: row.ru ?? "", en: row.en ?? "", de: row.de ?? "" },
    ]),
  );
}

function compact(values: Values): Values {
  return Object.fromEntries(
    Object.entries(values).filter(([, row]) => locales.some((locale) => row[locale]?.trim())),
  );
}

function TextRow({
  textKey,
  locale,
  defaults,
  value,
  error,
  onChange,
}: {
  textKey: string;
  locale: Locale;
  defaults: Defaults;
  value: string;
  error: string | undefined;
  onChange: (value: string) => void;
}) {
  const t = useT();
  const inputId = `${textKey}-${locale}`;
  const fallback = defaults[locale][textKey] ?? "";
  const long = (defaults.az[textKey] ?? "").length > 70;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-meta font-medium text-muted-foreground">
        {textKey}
      </label>
      {long ? (
        <Textarea
          id={inputId}
          lang={locale}
          rows={2}
          value={value}
          placeholder={fallback}
          maxLength={siteTextMaxLength}
          aria-invalid={Boolean(error)}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          id={inputId}
          lang={locale}
          value={value}
          placeholder={fallback}
          maxLength={siteTextMaxLength}
          aria-invalid={Boolean(error)}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {error ? <p className="text-meta text-destructive">{t.message(error)}</p> : null}
    </div>
  );
}

function SiteTextsForm({
  saved,
  defaults,
  keys,
}: {
  saved: SiteTextsDto;
  defaults: Defaults;
  keys: string[];
}) {
  const t = useT();
  const [values, setValues] = useState<Values>(() => toValues(saved.texts));
  const [baseline, setBaseline] = useState(() => JSON.stringify(compact(toValues(saved.texts))));
  const [search, setSearch] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [update, { isLoading }] = useUpdateSiteTextsMutation();
  const dirty = JSON.stringify(compact(values)) !== baseline;
  const guard = useUnsavedChangesGuard(dirty);

  const groups = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const matching = keys.filter(
      (key) =>
        !needle ||
        key.toLowerCase().includes(needle) ||
        locales.some((locale) => defaults[locale][key]?.toLowerCase().includes(needle)),
    );
    const byGroup = new Map<string, string[]>();
    for (const key of matching) {
      const group = key.split(".")[0] ?? key;
      byGroup.set(group, [...(byGroup.get(group) ?? []), key]);
    }
    return [...byGroup.entries()];
  }, [defaults, keys, search]);

  function change(key: string, locale: Locale, value: string) {
    setValues((current) => ({
      ...current,
      [key]: { ...emptyRow, ...current[key], [locale]: value },
    }));
    setErrors((current) => {
      const rest = { ...current };
      delete rest[`texts.${key}.${locale}`];
      return rest;
    });
  }

  async function save() {
    try {
      const result = await update({ texts: compact(values) }).unwrap();
      const next = toValues(result.texts);
      setValues(next);
      setBaseline(JSON.stringify(compact(next)));
      setErrors({});
      toast.success(t("Mətnlər saxlanıldı."));
    } catch (error) {
      if (isApiError(error) && error.data.fields) setErrors(error.data.fields);
      toast.error(apiErrorMessage(error, "Saxlamaq alınmadı. Yenidən cəhd edin."));
    }
  }

  return (
    <>
      {guard.dialog}
      <PageHeader
        title={t("Sayt mətnləri")}
        description={t(
          "Saytın hazır mətnlərini (düymələr, forma, 404 və s.) dəyişin. Boş qalan sahədə standart mətn göstərilir.",
        )}
        actions={
          <Button onClick={save} disabled={!dirty || isLoading}>
            {isLoading ? t("Saxlanılır") : t("Saxla")}
          </Button>
        }
      />
      <div className="relative mb-6 max-w-xl">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          strokeWidth={1.5}
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("Mətn üzrə axtar")}
          aria-label={t("Mətn üzrə axtar")}
          className="pl-9"
        />
      </div>
      <LocaleTabs required={false}>
        {(locale) =>
          groups.length ? (
            <div className="flex flex-col gap-8">
              {groups.map(([group, groupKeys]) => (
                <section
                  key={group}
                  className="rounded-sm border border-border bg-white p-4 md:p-6"
                >
                  <h2 className="mb-4 text-card font-normal text-heading">
                    {groupLabels[group] ? t(groupLabels[group]) : group}
                  </h2>
                  <div className="flex flex-col gap-5">
                    {groupKeys.map((key) => (
                      <TextRow
                        key={key}
                        textKey={key}
                        locale={locale}
                        defaults={defaults}
                        value={values[key]?.[locale] ?? ""}
                        error={errors[`texts.${key}.${locale}`]}
                        onChange={(value) => change(key, locale, value)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <EmptyState>{t("Heç nə tapılmadı.")}</EmptyState>
          )
        }
      </LocaleTabs>
    </>
  );
}

export function SiteTextsEditor({ defaults, keys }: { defaults: Defaults; keys: string[] }) {
  const t = useT();
  const { data, isLoading, isError, refetch } = useGetSiteTextsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <EmptyState
        action={
          <Button variant="outline" onClick={() => refetch()}>
            {t("Yenidən yüklə")}
          </Button>
        }
      >
        {t("Mətnlər yüklənmədi.")}
      </EmptyState>
    );
  }
  return (
    <SiteTextsForm key={data.updatedAt ?? "new"} saved={data} defaults={defaults} keys={keys} />
  );
}
