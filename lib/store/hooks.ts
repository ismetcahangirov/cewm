import { useCallback } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";

import { pickLocale, type Localized } from "@/lib/i18n/localized";

import type { AppDispatch, AppStore, RootState } from "./index";

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppStore = useStore.withTypes<AppStore>();

export function useContentLocale() {
  return useAppSelector((state) => state.editor.contentLocale);
}

export function useContentText() {
  const locale = useContentLocale();
  return useCallback((value: Localized) => pickLocale(value, locale), [locale]);
}
