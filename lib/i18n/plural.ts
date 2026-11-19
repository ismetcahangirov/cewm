import type { Locale } from "./config";

export type PluralForms = { zero?: string; other: string } & Partial<
  Record<Intl.LDMLPluralRule, string>
>;

export function plural(locale: Locale, count: number, forms: PluralForms): string {
  const form =
    count === 0 && forms.zero
      ? forms.zero
      : (forms[new Intl.PluralRules(locale).select(count)] ?? forms.other);
  return form.replaceAll("{count}", String(count));
}
