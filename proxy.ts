import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { adminPaths, publicAdminPaths } from "@/lib/auth/paths";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";
import { localeHeader } from "@/lib/i18n/request-locale";
import { isLegacySitemap, normalizeLegacyPath, sitemapPath } from "@/lib/legacy-redirects";
import { publicPathExists } from "@/lib/public/exists";
import { legacyRedirects } from "@/lib/redirects/legacy";

const unmatchedPath = "/_/not-found";

const prefixed = locales.filter((locale) => locale !== defaultLocale);

function isUnder(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

function guardAdmin(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const signedIn = getSessionCookie(request) !== null;

  if (isUnder(pathname, "/api/admin")) {
    if (signedIn) return NextResponse.next();
    return NextResponse.json(
      { error: "unauthorized", message: "Daxil olmaq lazımdır." },
      { status: 401 },
    );
  }

  if (publicAdminPaths.some((path) => isUnder(pathname, path)) || signedIn) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = adminPaths.login;
  url.search = pathname === adminPaths.home ? "" : `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

async function routeLocale(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const [, first] = pathname.split("/");

  if (first === defaultLocale) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(defaultLocale.length + 1) || "/";
    return NextResponse.redirect(url, 308);
  }

  const prefixedLocale = (prefixed as string[]).includes(first) ? (first as Locale) : null;
  const locale = prefixedLocale ?? defaultLocale;
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .slice(prefixedLocale ? 1 : 0);
  const headers = new Headers(request.headers);
  headers.set(localeHeader, locale);

  const url = request.nextUrl.clone();
  if (!prefixedLocale) url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
  if (!(await publicPathExists(locale, segments))) {
    const missing = request.nextUrl.clone();
    missing.pathname = `/${locale}${unmatchedPath}`;
    return NextResponse.rewrite(missing, { status: 404, request: { headers } });
  }
  if (prefixedLocale) return NextResponse.next({ request: { headers } });
  return NextResponse.rewrite(url, { request: { headers } });
}

const internalPrefixes = ["/admin", "/api", "/_next", "/media"];

function redirectTo(request: NextRequest, target: string, search: string, status: number) {
  const url = new URL(target.replace(/^[/\\]+/, "/"), request.nextUrl.origin);
  if (search) url.search = search;
  return NextResponse.redirect(url, status);
}

async function legacyRedirect(request: NextRequest): Promise<NextResponse | null> {
  const { pathname, search } = request.nextUrl;
  if (internalPrefixes.some((prefix) => isUnder(pathname, prefix))) return null;
  const path = normalizeLegacyPath(pathname);
  if (isLegacySitemap(path)) return redirectTo(request, sitemapPath, "", 301);
  const target = await legacyRedirects().lookup(path);
  if (!target) return null;
  const keepQuery = !path.includes(".") && !/[?#]/.test(target.toPath);
  return redirectTo(request, target.toPath, keepQuery ? search : "", target.statusCode);
}

function removeTrailingSlash(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  return redirectTo(request, pathname.replace(/\/+$/, "") || "/", search, 308);
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const legacy = await legacyRedirect(request);
  if (legacy) return legacy;

  const { pathname } = request.nextUrl;
  if (pathname.length > 1 && pathname.endsWith("/")) return removeTrailingSlash(request);
  if (isUnder(pathname, "/admin") || isUnder(pathname, "/api/admin")) return guardAdmin(request);
  if (isUnder(pathname, "/api") || pathname.includes(".")) return NextResponse.next();
  return routeLocale(request);
}

export const config = {
  matcher: ["/((?!_next/|media/).*)"],
};
