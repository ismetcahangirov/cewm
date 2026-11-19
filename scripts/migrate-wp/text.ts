import type { Locale } from "../../lib/i18n/config";

const cyrillicLetter = /[Ѐ-ӿ]/;
const latinLetter = /[A-Za-zÀ-ɏƏə]/;

const cyrillicToLatin: Record<string, string> = {
  а: "a",
  е: "e",
  о: "o",
  р: "p",
  с: "c",
  у: "y",
  х: "x",
  к: "k",
  В: "B",
  Н: "H",
  К: "K",
  М: "M",
  Т: "T",
  А: "A",
  Е: "E",
  О: "O",
  Р: "P",
  С: "C",
  Х: "X",
};

const latinToCyrillic: Record<string, string> = {
  a: "а",
  e: "е",
  o: "о",
  p: "р",
  c: "с",
  y: "у",
  x: "х",
  A: "А",
  B: "В",
  E: "Е",
  H: "Н",
  K: "К",
  M: "М",
  O: "О",
  P: "Р",
  C: "С",
  T: "Т",
  X: "Х",
};

export function cleanText(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/­/g, "")
    .replace(/[   ]/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export function letterCounts(text: string): { cyrillic: number; latin: number } {
  let cyrillic = 0;
  let latin = 0;
  for (const char of text) {
    if (cyrillicLetter.test(char)) cyrillic += 1;
    else if (latinLetter.test(char)) latin += 1;
  }
  return { cyrillic, latin };
}

export type LanguageProblem = "cyrillic-in-latin-language" | "latin-in-russian" | null;

export function languageProblem(text: string, locale: Locale): LanguageProblem {
  const { cyrillic, latin } = letterCounts(text);
  if (locale === "ru") {
    return latin >= 20 && cyrillic / (cyrillic + latin) < 0.1 ? "latin-in-russian" : null;
  }
  return cyrillic >= 3 && cyrillic / (cyrillic + latin) > 0.3 ? "cyrillic-in-latin-language" : null;
}

function isMixedWord(word: string): boolean {
  return cyrillicLetter.test(word) && latinLetter.test(word);
}

function mapLetters(word: string, table: Record<string, string>): string {
  return [...word].map((char) => table[char] ?? char).join("");
}

export function repairMixedScript(text: string, locale: Locale): string {
  return text.replace(/[\p{L}\p{M}]+/gu, (word) => {
    if (!isMixedWord(word)) return word;
    const { cyrillic, latin } = letterCounts(word);
    if (locale === "ru" || cyrillic > latin) {
      const repaired = mapLetters(word, latinToCyrillic);
      return isMixedWord(repaired) ? word : repaired;
    }
    const repaired = mapLetters(word, cyrillicToLatin);
    return isMixedWord(repaired) ? word : repaired;
  });
}

export function hasMixedScriptWord(text: string): boolean {
  return (text.match(/[\p{L}\p{M}]+/gu) ?? []).some(isMixedWord);
}

export type Verdict = { text: string | null; problem: string | null };

export function judgeText(value: string | null | undefined, locale: Locale): Verdict {
  const repaired = repairMixedScript(cleanText(value), locale);
  if (!repaired) return { text: null, problem: null };
  if (hasMixedScriptWord(repaired)) return { text: null, problem: "mixed-script" };
  const problem = languageProblem(repaired, locale);
  return problem ? { text: null, problem } : { text: repaired, problem: null };
}

export function sentenceCaseIfShouting(text: string, locale: Locale): string {
  const letters = text.replace(/[^\p{L}]/gu, "");
  if (letters.length < 6 || locale === "de") return text;
  if (letters !== letters.toLocaleUpperCase(locale)) return text;
  const lower = text.toLocaleLowerCase(locale === "az" ? "az" : locale);
  return lower.charAt(0).toLocaleUpperCase(locale === "az" ? "az" : locale) + lower.slice(1);
}

export function isShouting(text: string): boolean {
  const letters = text.replace(/[^\p{L}]/gu, "");
  return letters.length >= 6 && letters === letters.toLocaleUpperCase();
}

export function trimTo(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return (space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:–-]+$/, "");
}
