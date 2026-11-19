"use client";

import { useState, type ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";
import { useAppSelector } from "@/lib/store/hooks";
import { useT } from "@/lib/admin/i18n/use-t";

import { localeLabels } from "./content-locale-switch";

export function LocaleTabs({
  children,
  filled,
  invalid,
  required = true,
  emptyNote = "Boş qalan sahələr saytda azərbaycanca göstəriləcək.",
}: {
  children: (locale: Locale) => ReactNode;
  filled?: Partial<Record<Locale, boolean>>;
  invalid?: Partial<Record<Locale, boolean>>;
  required?: boolean;
  emptyNote?: string;
}) {
  const contentLocale = useAppSelector((state) => state.editor.contentLocale);
  const t = useT();
  const [active, setActive] = useState<Locale>(contentLocale);
  const [followed, setFollowed] = useState<Locale>(contentLocale);
  if (followed !== contentLocale) {
    setFollowed(contentLocale);
    setActive(contentLocale);
  }

  return (
    <Tabs value={active} onValueChange={(value) => setActive(value as Locale)}>
      <TabsList aria-label={t("Məzmun dili")}>
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
          </TabsTrigger>
        ))}
      </TabsList>
      {locales.map((locale) => (
        <TabsContent key={locale} value={locale} className="mt-4 flex flex-col gap-5">
          {locale !== defaultLocale && filled && !filled[locale] ? (
            <p className="text-meta text-muted-foreground">{t.message(emptyNote)}</p>
          ) : null}
          {children(locale)}
        </TabsContent>
      ))}
    </Tabs>
  );
}
