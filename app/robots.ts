import type { MetadataRoute } from "next";
import { connection } from "next/server";

import { getSiteSettings } from "@/lib/public/settings";
import { buildRobots } from "@/lib/seo/robots";

export default async function robots(): Promise<MetadataRoute.Robots> {
  await connection();
  const { searchIndexing } = await getSiteSettings();
  return buildRobots(searchIndexing);
}
