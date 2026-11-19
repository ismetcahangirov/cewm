import "server-only";

import { notFound } from "next/navigation";
import { connection } from "next/server";

import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { env } from "@/lib/env";

import { getCorpus } from "./corpus";
import { buildLlmsFullTxt, buildLlmsTxt } from "./llms";
import { resolveMarkdown } from "./markdown-route";

const cacheControl = "public, max-age=3600, stale-while-revalidate=86400";

function textResponse(body: string, type: string, extra: HeadersInit = {}): Response {
  return new Response(body, {
    headers: {
      "Content-Type": `${type}; charset=utf-8`,
      "Cache-Control": cacheControl,
      "X-Robots-Tag": "noindex",
      ...extra,
    },
  });
}

export async function llmsResponse(locale: Locale, full: boolean): Promise<Response> {
  await connection();
  const [corpus, dict] = await Promise.all([getCorpus(), getDictionary(locale)]);
  const context = { corpus, locale, dict, siteUrl: env.NEXT_PUBLIC_SITE_URL };
  return textResponse(full ? buildLlmsFullTxt(context) : buildLlmsTxt(context), "text/plain");
}

export async function prefixedLlmsResponse(rawLocale: string, full: boolean): Promise<Response> {
  if (!isLocale(rawLocale) || rawLocale === defaultLocale) notFound();
  return llmsResponse(rawLocale, full);
}

export async function markdownResponse(rawLocale: string, path: string[]): Promise<Response> {
  await connection();
  if (!isLocale(rawLocale)) notFound();
  const [corpus, dict] = await Promise.all([getCorpus(), getDictionary(rawLocale)]);
  const result = resolveMarkdown(
    { corpus, locale: rawLocale, dict, siteUrl: env.NEXT_PUBLIC_SITE_URL },
    path,
  );
  if (!result)
    return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain" } });
  return textResponse(result.body, "text/markdown", {
    Link: `<${result.canonical}>; rel="canonical"`,
  });
}
