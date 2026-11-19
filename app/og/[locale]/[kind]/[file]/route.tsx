import { notFound } from "next/navigation";
import { connection } from "next/server";

import { env } from "@/lib/env";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ogKinds, type OgKind } from "@/lib/seo/config";
import { getCorpus } from "@/lib/seo/corpus";
import { resolveOgCard } from "@/lib/seo/og-card";
import { renderOgImage } from "@/lib/seo/og-image";

function isKind(value: string): value is OgKind {
  return (ogKinds as readonly string[]).includes(value);
}

export async function GET(
  _request: Request,
  { params }: RouteContext<"/og/[locale]/[kind]/[file]">,
): Promise<Response> {
  await connection();
  const { locale, kind, file } = await params;
  if (!isLocale(locale) || !isKind(kind) || !file.endsWith(".png")) notFound();
  const slug = decodeURIComponent(file.slice(0, -4));
  const [corpus, dict] = await Promise.all([getCorpus(), getDictionary(locale)]);
  const card = resolveOgCard(corpus, dict, locale, kind, slug);
  if (!card) notFound();
  return renderOgImage(card, new URL(env.NEXT_PUBLIC_SITE_URL).host);
}
