import type { MetadataRoute } from "next";

import type { AiCrawlerPolicy } from "@/lib/db/schema/settings";
import { env } from "@/lib/env";

export const answerEngineCrawlers = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Applebot",
  "DuckAssistBot",
  "MistralAI-User",
  "meta-externalfetcher",
] as const;

export const trainingCrawlers = [
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "Applebot-Extended",
  "meta-externalagent",
  "CCBot",
  "Bytespider",
  "Amazonbot",
  "cohere-ai",
] as const;

export const privatePaths = ["/admin", "/api", "/md/"] as const;

export function buildRobots(
  searchIndexing: boolean,
  aiCrawlers: AiCrawlerPolicy = "open",
): MetadataRoute.Robots {
  const sitemap = new URL("/sitemap.xml", env.NEXT_PUBLIC_SITE_URL).toString();
  if (!searchIndexing) return { rules: [{ userAgent: "*", disallow: "/" }], sitemap };

  const open = { allow: "/", disallow: [...privatePaths] };
  const closed = { disallow: "/" };
  const answers = aiCrawlers === "closed" ? closed : open;
  const training = aiCrawlers === "open" ? open : closed;

  return {
    rules: [
      { userAgent: "*", ...open },
      { userAgent: [...answerEngineCrawlers], ...answers },
      { userAgent: [...trainingCrawlers], ...training },
    ],
    sitemap,
  };
}
