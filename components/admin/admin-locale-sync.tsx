"use client";

import { useEffect } from "react";

import { setCurrentAdminLocale } from "@/lib/admin/i18n/current";
import { useContentLocale } from "@/lib/store/hooks";

export function AdminLocaleSync() {
  const locale = useContentLocale();
  setCurrentAdminLocale(locale);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
