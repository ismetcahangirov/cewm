"use client";

import { Copy } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";
import { useAppSelector } from "@/lib/store/hooks";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/admin/i18n/use-t";

import { localeLabels } from "./content-locale-switch";

export function LocaleDot({ filled }: { filled: boolean }) {
  const t = useT();
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "size-2 shrink-0 rounded-full border",
          filled ? "border-cyan bg-cyan" : "border-muted-foreground bg-transparent",
        )}
      />
      <span className="sr-only">{filled ? t("dolu") : t("boş")}</span>
    </>
  );
}

export function LocaleTabs({
  children,
  filled,
  invalid,
  required = true,
  emptyNote = "Boş qalan sahələr saytda azərbaycanca göstəriləcək.",
  onCopyFromDefault,
}: {
  children: (locale: Locale) => ReactNode;
  filled?: Partial<Record<Locale, boolean>>;
  invalid?: Partial<Record<Locale, boolean>>;
  required?: boolean;
  emptyNote?: string;
  onCopyFromDefault?: (locale: Locale) => void;
}) {
  const contentLocale = useAppSelector((state) => state.editor.contentLocale);
  const t = useT();
  const [active, setActive] = useState<Locale>(contentLocale);
  const [followed, setFollowed] = useState<Locale>(contentLocale);
  if (followed !== contentLocale) {
    setFollowed(contentLocale);
    setActive(contentLocale);
  }
  const isFilled = (locale: Locale) =>
    locale === defaultLocale ? true : Boolean(filled?.[locale]);

  return (
    <Tabs value={active} onValueChange={(value) => setActive(value as Locale)}>
      <TabsList aria-label={t("Məzmun dili")} className="max-w-full overflow-x-auto">
        {locales.map((locale) => (
          <TabsTrigger
            key={locale}
            value={locale}
            title={t(localeLabels[locale])}
            className={
              invalid?.[locale] ? "text-destructive data-active:text-destructive" : undefined
            }
          >
            {locale.toUpperCase()}
            {required && locale === defaultLocale ? (
              <span aria-hidden="true" className="text-destructive">
                *
              </span>
            ) : null}
            {required && locale === defaultLocale ? (
              <span className="sr-only">{t("(məcburi)")}</span>
            ) : null}
            {filled ? <LocaleDot filled={isFilled(locale)} /> : null}
          </TabsTrigger>
        ))}
      </TabsList>
      {locales.map((locale) => (
        <TabsContent key={locale} value={locale} className="mt-4 flex flex-col gap-5">
          {locale !== defaultLocale && filled && !filled[locale] ? (
            <div
              role="status"
              className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border bg-light px-3 py-2 text-meta text-fg"
            >
              <span>{t.message(emptyNote)}</span>
              {onCopyFromDefault ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto min-h-11 max-w-full text-left whitespace-normal md:min-h-8"
                  onClick={() => onCopyFromDefault(locale)}
                >
                  <Copy strokeWidth={1.5} />
                  {t("Boş sahələri azərbaycancadan kopyala")}
                </Button>
              ) : null}
            </div>
          ) : null}
          {children(locale)}
        </TabsContent>
      ))}
    </Tabs>
  );
}

export function LocaleCompleteness({
  filled,
}: {
  filled: Partial<Record<Locale, boolean>> | null | undefined;
}) {
  const t = useT();
  return (
    <ul className="flex gap-1" aria-label={t("Doldurulmuş dillər")}>
      {locales.map((locale) => {
        const on = locale === defaultLocale || Boolean(filled?.[locale]);
        return (
          <li
            key={locale}
            title={`${t(localeLabels[locale])}: ${on ? t("dolu") : t("boş")}`}
            className={cn(
              "rounded-sm border px-1.5 py-0.5 text-meta leading-none",
              on ? "border-navy bg-navy text-white" : "border-border text-muted-foreground",
            )}
          >
            {locale.toUpperCase()}
            <span className="sr-only"> {on ? t("dolu") : t("boş")}</span>
          </li>
        );
      })}
    </ul>
  );
}
