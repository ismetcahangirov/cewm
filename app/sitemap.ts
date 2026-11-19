import type { MetadataRoute } from "next";
import { connection } from "next/server";

import { env } from "@/lib/env";
import { getCorpus } from "@/lib/seo/corpus";
import { buildSitemap } from "@/lib/seo/sitemap";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  return buildSitemap(await getCorpus(), env.NEXT_PUBLIC_SITE_URL);
}
