import type { MetadataRoute } from "next";
import { connection } from "next/server";

import { env } from "@/lib/env";
import { buildSitemap, getSitemapSource } from "@/lib/seo/sitemap";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  return buildSitemap(await getSitemapSource(), env.NEXT_PUBLIC_SITE_URL);
}
