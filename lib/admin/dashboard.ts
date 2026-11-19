import "server-only";

import { count, desc, eq, gte } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { brands, consultationRequests, pages, posts, products } from "@/lib/db/schema";
import { countVisitors, type VisitorCounts } from "@/lib/visits";

import { requestProductCount } from "./consultation-requests";

const week = 7 * 24 * 60 * 60 * 1000;

export type DashboardSummary = {
  visitors: VisitorCounts;
  newRequestsThisWeek: number;
  unreadRequests: number;
  products: { total: number; published: number; draft: number };
  brands: number;
  drafts: number;
  latestRequests: {
    id: string;
    name: string;
    phone: string;
    company: string | null;
    status: (typeof consultationRequests.$inferSelect)["status"];
    productCount: number;
    createdAt: Date;
  }[];
};

export async function getDashboardSummary(now = new Date()): Promise<DashboardSummary> {
  const db = getDb();
  const since = new Date(now.getTime() - week);

  const [
    [thisWeek],
    [unread],
    productRows,
    [brandTotal],
    [pageDrafts],
    [postDrafts],
    latestRequests,
    visitors,
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(consultationRequests)
      .where(gte(consultationRequests.createdAt, since)),
    db
      .select({ value: count() })
      .from(consultationRequests)
      .where(eq(consultationRequests.status, "new")),
    db.select({ status: products.status, value: count() }).from(products).groupBy(products.status),
    db.select({ value: count() }).from(brands),
    db.select({ value: count() }).from(pages).where(eq(pages.status, "draft")),
    db.select({ value: count() }).from(posts).where(eq(posts.status, "draft")),
    db
      .select({
        id: consultationRequests.id,
        name: consultationRequests.name,
        phone: consultationRequests.phone,
        company: consultationRequests.company,
        status: consultationRequests.status,
        createdAt: consultationRequests.createdAt,
        productCount: requestProductCount,
      })
      .from(consultationRequests)
      .orderBy(desc(consultationRequests.createdAt))
      .limit(5),
    countVisitors(now),
  ]);

  const published = productRows.find((row) => row.status === "published")?.value ?? 0;
  const productDrafts = productRows.find((row) => row.status === "draft")?.value ?? 0;

  return {
    visitors,
    newRequestsThisWeek: thisWeek?.value ?? 0,
    unreadRequests: unread?.value ?? 0,
    products: { total: published + productDrafts, published, draft: productDrafts },
    brands: brandTotal?.value ?? 0,
    drafts: productDrafts + (pageDrafts?.value ?? 0) + (postDrafts?.value ?? 0),
    latestRequests,
  };
}

export async function countUnreadRequests(): Promise<number> {
  const [row] = await getDb()
    .select({ value: count() })
    .from(consultationRequests)
    .where(eq(consultationRequests.status, "new"));
  return row?.value ?? 0;
}
