import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

export function buildRobots(searchIndexing: boolean): MetadataRoute.Robots {
  return {
    rules: searchIndexing
      ? [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api"] }]
      : [{ userAgent: "*", disallow: "/" }],
    sitemap: new URL("/sitemap.xml", env.NEXT_PUBLIC_SITE_URL).toString(),
  };
}
