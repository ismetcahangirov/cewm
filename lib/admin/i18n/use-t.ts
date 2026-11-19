import { useMemo } from "react";

import { useContentLocale } from "@/lib/store/hooks";

import type { MessageParams } from "./translate";

import { translate, translateMessage, type MessageKey } from ".";

export type Translate = ((key: MessageKey, params?: MessageParams) => string) & {
  locale: ReturnType<typeof useContentLocale>;
  message: (text: string) => string;
};

export function useT(): Translate {
  const locale = useContentLocale();
  return useMemo(
    () =>
      Object.assign((key: MessageKey, params?: MessageParams) => translate(locale, key, params), {
        locale,
        message: (text: string) => translateMessage(locale, text),
      }),
    [locale],
  );
}
