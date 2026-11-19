import { env } from "@/lib/env";

import { buildSitemapUrls } from "./sitemap";
import type { Corpus } from "./model";

export const indexNowEndpoint = "https://api.indexnow.org/indexnow";

const recentWindowMs = 15 * 60 * 1000;

export function isPublicHost(siteUrl: string): boolean {
  const { hostname } = new URL(siteUrl);
  return hostname.includes(".") && hostname !== "localhost" && !/^[\d.]+$/.test(hostname);
}

export function snapshotOf(corpus: Corpus, siteUrl: string): Map<string, string> {
  return new Map(buildSitemapUrls(corpus, siteUrl).map((url) => [url.loc, url.lastModified ?? ""]));
}

export function changedUrls(
  previous: Map<string, string> | null,
  next: Map<string, string>,
  now = Date.now(),
): string[] {
  const changed: string[] = [];
  for (const [url, modified] of next) {
    if (previous) {
      if (previous.get(url) !== modified) changed.push(url);
    } else if (modified && now - Date.parse(modified) < recentWindowMs) {
      changed.push(url);
    }
  }
  if (previous) for (const url of previous.keys()) if (!next.has(url)) changed.push(url);
  return changed;
}

export function indexNowBody(urls: string[], key: string, siteUrl: string) {
  const { host, origin } = new URL(siteUrl);
  return { host, key, keyLocation: `${origin}/${key}.txt`, urlList: urls.slice(0, 10_000) };
}

let snapshot: Map<string, string> | null = null;

export async function notifyIndexNow(corpus: Corpus, siteUrl = env.NEXT_PUBLIC_SITE_URL) {
  const key = corpus.settings.seo.indexNowKey;
  if (!key || !corpus.settings.searchIndexing || !isPublicHost(siteUrl)) return { sent: 0 };
  const next = snapshotOf(corpus, siteUrl);
  const urls = changedUrls(snapshot, next);
  snapshot = next;
  if (!urls.length) return { sent: 0 };
  const response = await fetch(indexNowEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(indexNowBody(urls, key, siteUrl)),
  });
  return { sent: urls.length, status: response.status };
}

export function resetIndexNowSnapshot(): void {
  snapshot = null;
}
