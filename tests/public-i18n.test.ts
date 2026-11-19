import { describe, expect, it } from "vitest";

import az from "@/lib/i18n/dictionaries/az.json";
import de from "@/lib/i18n/dictionaries/de.json";
import en from "@/lib/i18n/dictionaries/en.json";
import ru from "@/lib/i18n/dictionaries/ru.json";
import { locales } from "@/lib/i18n/config";

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  return Object.fromEntries(
    Object.entries(tree).flatMap(([key, value]) =>
      typeof value === "string"
        ? [[`${prefix}${key}`, value]]
        : Object.entries(flatten(value, `${prefix}${key}.`)),
    ),
  );
}

const dictionaries = { az, ru, en, de } as Record<string, Tree>;

function placeholders(text: string): string {
  return [...text.matchAll(/\{(\w+)\}/g)]
    .map((match) => match[1])
    .sort()
    .join();
}

describe("public dictionaries", () => {
  const base = flatten(az);

  it("exist for every locale", () => {
    expect(Object.keys(dictionaries).sort()).toEqual([...locales].sort());
  });

  it("have the same keys and placeholders in every locale", () => {
    for (const locale of locales) {
      const flat = flatten(dictionaries[locale] as Tree);
      expect(Object.keys(flat).sort(), locale).toEqual(Object.keys(base).sort());
      for (const [key, value] of Object.entries(flat)) {
        expect(value.trim(), `${locale}: ${key}`).not.toBe("");
        expect(placeholders(value), `${locale}: ${key}`).toBe(placeholders(base[key] ?? ""));
      }
    }
  });

  it("keep each locale in its own script and free of emoji, shouting and glued suffixes", () => {
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}]/u;
    const azerbaijaniLetters = /[əğışƏĞİŞ]/;
    const cyrillic = /[Ѐ-ӿ]/;
    const shouting = /\p{Lu}{5,}/u;
    for (const locale of locales) {
      for (const [key, value] of Object.entries(flatten(dictionaries[locale] as Tree))) {
        const label = `${locale}: ${key}`;
        expect(emoji.test(value), label).toBe(false);
        expect(shouting.test(value.replace(/CEWM|HOMAG|WhatsApp|PDF/g, "")), label).toBe(false);
        expect(/\{\w+\}-\p{L}/u.test(value), label).toBe(false);
        if (key.startsWith("locales.")) continue;
        if (locale !== "az") expect(azerbaijaniLetters.test(value), label).toBe(false);
        if (locale !== "ru") expect(cyrillic.test(value), label).toBe(false);
      }
    }
  });

  it("translate German on its own rather than copying English", () => {
    const english = flatten(en);
    const german = flatten(de);
    const copied = Object.keys(german).filter(
      (key) =>
        german[key] === english[key] && !key.startsWith("locales.") && key !== "meta.siteName",
    );
    expect(copied.length / Object.keys(german).length).toBeLessThan(0.05);
  });
});
