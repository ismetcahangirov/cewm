function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function normalizeLegacyPath(input: string): string {
  const raw = /^https?:\/\//i.test(input) ? new URL(input).pathname : input;
  let path = safeDecode(raw.split(/[?#]/)[0])
    .normalize("NFC")
    .replace(/\/{2,}/g, "/");
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1) path = path.replace(/\/+$/, "");
  return path;
}

export const sitemapPath = "/sitemap.xml";

const legacySitemap = /^\/(?:wp-sitemap(?:-[\w-]+)?|sitemap_index|[\w-]+-sitemap\d*)\.xml$/i;

export function isLegacySitemap(path: string): boolean {
  return legacySitemap.test(path);
}

export function splitTarget(target: string): { path: string; rest: string } {
  const index = target.search(/[?#]/);
  return index === -1
    ? { path: target, rest: "" }
    : { path: target.slice(0, index), rest: target.slice(index) };
}

export function tryNormalizeLegacyPath(input: string): string | null {
  try {
    return normalizeLegacyPath(input);
  } catch {
    return null;
  }
}
