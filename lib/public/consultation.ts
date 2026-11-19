import "server-only";

import { and, inArray } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { publicTags } from "@/lib/cache/tags";
import { getDb } from "@/lib/db";
import { products } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n/config";

import { productCards, visibleProduct } from "./catalog";

export type ConsultationProduct = {
  id: string;
  name: string;
  image: { src: string; alt: string } | null;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseProductIds(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value.join(",") : (value ?? "");
  return [...new Set(raw.split(",").map((id) => id.trim().toLowerCase()))]
    .filter((id) => uuidPattern.test(id))
    .slice(0, 20);
}

export async function getConsultationProducts(
  ids: string[],
  locale: Locale,
): Promise<ConsultationProduct[]> {
  "use cache";
  cacheTag(publicTags.catalog);
  cacheLife("hours");
  if (!ids.length) return [];
  const rows = await getDb()
    .select({ id: products.id, slug: products.slug, name: products.name })
    .from(products)
    .where(and(visibleProduct, inArray(products.id, ids)));
  const order = new Map(ids.map((id, index) => [id, index]));
  rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  const cards = await productCards(rows, locale);
  return cards.map((card) => ({
    id: card.id,
    name: card.name,
    image: card.image ? { src: card.image.src, alt: card.image.alt } : null,
  }));
}
