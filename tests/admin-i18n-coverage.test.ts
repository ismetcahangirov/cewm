import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { de, en, ru } from "@/lib/admin/i18n";

const azLetters = /[əğıöüşçƏĞİÖÜŞÇ]/;

const roots = ["app/admin", "components/admin"];

const extraFiles = [
  "components/ui/sidebar.tsx",
  "components/ui/sheet.tsx",
  "components/ui/dialog.tsx",
];

const allowed = new Set(["Azərbaycanca", "CEWM: konsultasiya sorğunuz"]);

const azOnlyLetters = /[əğışçƏĞİŞÇ]/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)(?:\|[^}]*)?\}/g)].map((match) => match[1] ?? "").sort();
}

function literals(source: string): string[] {
  const found: string[] = [];
  for (const match of source.matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'/g)) {
    found.push(match[1] ?? match[2] ?? "");
  }
  for (const match of source.matchAll(/`((?:[^`\\]|\\.)*)`/g)) {
    const text = match[1] ?? "";
    if (!/\bt\(/.test(text)) found.push(text.replace(/\$\{[^}]*\}/g, "{x}"));
  }
  for (const match of source.matchAll(/(?<![=-])>([^<>{}]+)(?=[<{])/g)) {
    const text = (match[1] ?? "").trim();
    if (!/["'`]|\bt\(/.test(text)) found.push(text);
  }
  return found;
}

describe("admin interface translations", () => {
  const keys = new Set(Object.keys(ru).flatMap((key) => [key, key.replace(/#\w+$/, "")]));
  const templates = [...keys].map((key) => key.replace(/\{\w+\}/g, "{x}"));
  const known = new Set([...keys, ...templates]);

  it("has no Azerbaijani text outside the dictionaries", () => {
    const files = [...roots.flatMap(sourceFiles), ...extraFiles];
    const missing = files.flatMap((file) =>
      literals(readFileSync(file, "utf8"))
        .filter((text) => azLetters.test(text) && !known.has(text) && !allowed.has(text))
        .map((text) => `${file}: ${text}`),
    );
    expect(missing).toEqual([]);
  });

  it("translates every key into Russian, English and German", () => {
    const untranslated = Object.entries({ ru, en, de }).flatMap(([locale, messages]) =>
      Object.entries(messages)
        .filter(([, value]) => !value.trim() || azOnlyLetters.test(value))
        .map(([key]) => `${locale}: ${key}`),
    );
    expect(untranslated).toEqual([]);
  });

  it("has a German dictionary of its own, not a copy of the English one", () => {
    const keys = Object.keys(de) as (keyof typeof de)[];
    const copied = keys.filter((key) => de[key] === en[key]);
    expect(copied.length / keys.length).toBeLessThan(0.05);
  });

  it("keeps the placeholders of every key", () => {
    const broken = Object.entries({ ru, en, de }).flatMap(([locale, messages]) =>
      Object.entries(messages)
        .filter(([key, value]) => {
          const expected = [...new Set(placeholders(key))];
          const actual = [...new Set(placeholders(value))];
          return expected.join() !== actual.join();
        })
        .map(([key, value]) => `${locale}: ${key} -> ${value}`),
    );
    expect(broken).toEqual([]);
  });
});
