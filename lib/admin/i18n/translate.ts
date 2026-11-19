import type { Locale } from "@/lib/i18n/config";

export type Messages = Record<string, string>;

export type MessageParams = Record<string, string | number>;

export type Dictionaries = { ru: Messages; en: Messages };

const pluralOrder: Record<Intl.LDMLPluralRule, number> = {
  one: 0,
  few: 1,
  many: 2,
  other: 2,
  two: 1,
  zero: 2,
};

function pluralForm(locale: Locale, count: number, forms: string[]): string {
  const rule = new Intl.PluralRules(locale).select(count);
  const index = locale === "ru" ? pluralOrder[rule] : rule === "one" ? 0 : 1;
  return forms[Math.min(index, forms.length - 1)] ?? "";
}

export function interpolate(
  template: string,
  params?: MessageParams,
  locale: Locale = "az",
): string {
  if (!params) return template;
  return template
    .replace(/\{(\w+)\|([^}]*)\}/g, (match, name: string, forms: string) =>
      name in params ? pluralForm(locale, Number(params[name]), forms.split("|")) : match,
    )
    .replace(/\{(\w+)\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match,
    );
}

type Pattern = { regex: RegExp; names: string[]; key: string };

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compile(key: string): Pattern {
  const names: string[] = [];
  const source = key
    .split(/(\{\w+\})/)
    .map((part) => {
      const match = /^\{(\w+)\}$/.exec(part);
      if (!match?.[1]) return escape(part);
      names.push(match[1]);
      return "([\\s\\S]+?)";
    })
    .join("");
  return { regex: new RegExp(`^${source}$`), names, key };
}

function literalLength(key: string): number {
  return key.replace(/\{\w+\}/g, "").length;
}

function pluralParams(template: string): Set<string> {
  return new Set([...template.matchAll(/\{(\w+)\|/g)].map((match) => match[1] ?? ""));
}

export function createTranslator(dictionaries: Dictionaries) {
  let patterns: Pattern[] | null = null;

  function lookup(locale: Locale, key: string): string {
    const text = key.replace(/#\w+$/, "");
    if (locale === "az") return text;
    return dictionaries[locale][key] ?? text;
  }

  function translate(locale: Locale, key: string, params?: MessageParams): string {
    return interpolate(lookup(locale, key), params, locale);
  }

  function translateMessage(locale: Locale, text: string): string {
    if (locale === "az" || !text) return text;
    const exact = dictionaries[locale][text];
    if (exact !== undefined) return exact;
    patterns ??= Object.keys(dictionaries.ru)
      .filter((key) => /\{\w+\}/.test(key))
      .map(compile)
      .sort((a, b) => literalLength(b.key) - literalLength(a.key));
    for (const pattern of patterns) {
      const match = pattern.regex.exec(text);
      if (!match) continue;
      const counted = pluralParams(lookup(locale, pattern.key));
      const numeric = pattern.names.every(
        (name, index) => !counted.has(name) || /^\d+$/.test(match[index + 1] ?? ""),
      );
      if (!numeric) continue;
      const params = Object.fromEntries(
        pattern.names.map((name, index) => [
          name,
          translateMessage(locale, match[index + 1] ?? ""),
        ]),
      );
      return interpolate(lookup(locale, pattern.key), params, locale);
    }
    return text;
  }

  return { translate, translateMessage };
}
