"use client";

import { Languages } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MessageKey } from "@/lib/admin/i18n";
import { isLocale, locales, type Locale } from "@/lib/i18n/config";
import { contentLocaleCookie, setContentLocale } from "@/lib/store/editor-slice";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { useT } from "@/lib/admin/i18n/use-t";

export const localeLabels: Record<Locale, MessageKey> = {
  az: "Azərbaycanca",
  ru: "Rusca",
  en: "İngiliscə",
};

const nativeLocaleNames: Record<Locale, string> = {
  az: "Azərbaycanca",
  ru: "Русский",
  en: "English",
};

export function ContentLocaleSwitch() {
  const locale = useAppSelector((state) => state.editor.contentLocale);
  const dispatch = useAppDispatch();
  const t = useT();

  return (
    <Select
      value={locale}
      onValueChange={(value) => {
        if (!isLocale(value)) return;
        dispatch(setContentLocale(value));
        document.cookie = `${contentLocaleCookie}=${value}; path=/admin; max-age=31536000; samesite=lax`;
      }}
    >
      <SelectTrigger size="sm" aria-label={t("Dil")} className="gap-2">
        <Languages className="size-4" strokeWidth={1.5} />
        <SelectValue>{locale.toUpperCase()}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {locales.map((value) => (
          <SelectItem key={value} value={value}>
            <span lang={value}>
              {value.toUpperCase()} · {nativeLocaleNames[value]}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
