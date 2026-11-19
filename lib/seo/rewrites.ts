import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";

import { markdownSuffix, reservedRootTextFiles } from "./config";

const prefixedLocales = locales.filter((locale) => locale !== defaultLocale);

export function markdownHref(htmlPath: string): string {
  const [path] = htmlPath.split(/[?#]/);
  const clean = (path ?? "").replace(/\/+$/, "");
  const isHome = clean === "" || prefixedLocales.some((locale) => clean === `/${locale}`);
  return isHome ? `${clean}/index${markdownSuffix}` : `${clean}${markdownSuffix}`;
}

export function markdownRewrite(pathname: string): string | null {
  if (!pathname.endsWith(markdownSuffix)) return null;
  const segments = pathname.slice(0, -markdownSuffix.length).split("/").filter(Boolean);
  const first = segments[0];
  const locale: Locale = (prefixedLocales as string[]).includes(first ?? "")
    ? (first as Locale)
    : defaultLocale;
  const rest = locale === defaultLocale ? segments : segments.slice(1);
  if (rest.length === 1 && rest[0] === "index") rest.pop();
  return `/md/${locale}${rest.length ? `/${rest.join("/")}` : ""}`;
}

export function indexNowKeyFromPath(pathname: string): string | null {
  const match = /^\/([A-Za-z0-9-]{8,128})\.txt$/.exec(pathname);
  if (!match?.[1] || reservedRootTextFiles.has(match[1])) return null;
  return match[1];
}

export function seoRewrite(pathname: string): string | null {
  const markdown = markdownRewrite(pathname);
  if (markdown) return markdown;
  const key = indexNowKeyFromPath(pathname);
  return key ? `/indexnow-key/${key}` : null;
}

export function normalizePathname(pathname: string, lowercase: boolean): string {
  let path = pathname.replace(/\/{2,}/g, "/");
  if (path.length > 1) path = path.replace(/\/+$/, "") || "/";
  if (lowercase && !path.endsWith(".txt")) {
    path = path.replace(/%[0-9A-Fa-f]{2}|[A-Z]/g, (match) =>
      match.startsWith("%") ? match : match.toLowerCase(),
    );
  }
  return path;
}
