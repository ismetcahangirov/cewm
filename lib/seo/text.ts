import type { Locale } from "@/lib/i18n/config";

export const titleLimits: Record<Locale, number> = { az: 60, en: 60, de: 58, ru: 55 };

export const descriptionLimits: Record<Locale, { min: number; max: number }> = {
  az: { min: 90, max: 155 },
  en: { min: 90, max: 155 },
  de: { min: 90, max: 150 },
  ru: { min: 80, max: 140 },
};

function squeeze(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function clampText(text: string, max: number): string {
  const clean = squeeze(text);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  const base = space > max * 0.6 ? cut.slice(0, space) : cut;
  return `${base.replace(/[\s,.;:–—|-]+$/u, "")}…`;
}

const modelTail = /^\S*\d\S*$/u;

export function fitTitle(title: string, locale: Locale, reserved = 0): string {
  const max = titleLimits[locale] - reserved;
  const clean = squeeze(title);
  if (clean.length <= max) return clean;
  const words = clean.split(" ");
  const last = words.at(-1) ?? "";
  if (words.length > 3 && modelTail.test(last)) {
    const tail = `${words.at(-2)} ${last}`;
    const headMax = max - tail.length - 2;
    if (headMax > max * 0.35) {
      const head = clampText(words.slice(0, -2).join(" "), headMax).replace(/…$/u, "");
      return `${head.trimEnd()}… ${tail}`;
    }
  }
  return clampText(clean, max);
}

export function describeEntity(input: {
  locale: Locale;
  name: string;
  admin?: string | null;
  summary?: string | null;
  fallback?: string | null;
}): string {
  const admin = squeeze(input.admin ?? "");
  const summary = squeeze(input.summary ?? "");
  const lead = admin || summary;
  const named =
    lead && !lead.toLowerCase().includes(input.name.toLowerCase())
      ? `${input.name}: ${lead}`
      : lead;
  return fitDescription(
    [named, summary && summary !== lead ? summary : null, input.fallback],
    input.locale,
  );
}

export function fitDescription(parts: (string | null | undefined)[], locale: Locale): string {
  const { min, max } = descriptionLimits[locale];
  const chosen: string[] = [];
  let length = 0;
  for (const part of parts) {
    const clean = squeeze(part ?? "");
    if (!clean) continue;
    chosen.push(/[.!?…]$/u.test(clean) ? clean : `${clean}.`);
    length = chosen.join(" ").length;
    if (length >= min) break;
  }
  return clampText(chosen.join(" "), max);
}

export function firstSentences(text: string, max: number): string {
  const clean = squeeze(text);
  if (clean.length <= max) return clean;
  const sentences = clean.match(/[^.!?]+[.!?]+(?=\s|$)/gu) ?? [];
  let result = "";
  for (const sentence of sentences) {
    const next = `${result} ${sentence.trim()}`.trim();
    if (next.length > max) break;
    result = next;
  }
  return result || clampText(clean, max);
}
