import "server-only";

import { count, desc, eq, gte } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { pages, posts, products, projects, quoteRequests } from "@/lib/db/schema";
import { countVisitors, type VisitorCounts } from "@/lib/visits";

import { requestProductCount } from "./quote-requests";

const week = 7 * 24 * 60 * 60 * 1000;

export type DashboardSummary = {
  visitors: VisitorCounts;
  newRequestsThisWeek: number;
  unreadRequests: number;
  products: { total: number; published: number; draft: number };
  projects: number;
  drafts: number;
  latestRequests: {
    id: string;
    name: string;
    phone: string;
    company: string | null;
    status: (typeof quoteRequests.$inferSelect)["status"];
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
    [projectTotal],
    [projectDrafts],
    [pageDrafts],
    [postDrafts],
    latestRequests,
    visitors,
  ] = await Promise.all([
    db.select({ value: count() }).from(quoteRequests).where(gte(quoteRequests.createdAt, since)),
    db.select({ value: count() }).from(quoteRequests).where(eq(quoteRequests.status, "new")),
    db.select({ status: products.status, value: count() }).from(products).groupBy(products.status),
    db.select({ value: count() }).from(projects),
    db.select({ value: count() }).from(projects).where(eq(projects.status, "draft")),
    db.select({ value: count() }).from(pages).where(eq(pages.status, "draft")),
    db.select({ value: count() }).from(posts).where(eq(posts.status, "draft")),
    db
      .select({
        id: quoteRequests.id,
        name: quoteRequests.name,
        phone: quoteRequests.phone,
        company: quoteRequests.company,
        status: quoteRequests.status,
        createdAt: quoteRequests.createdAt,
        productCount: requestProductCount,
      })
      .from(quoteRequests)
      .orderBy(desc(quoteRequests.createdAt))
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
    projects: projectTotal?.value ?? 0,
    drafts:
      productDrafts +
      (projectDrafts?.value ?? 0) +
      (pageDrafts?.value ?? 0) +
      (postDrafts?.value ?? 0),
    latestRequests,
  };
}

export async function countUnreadRequests(): Promise<number> {
  const [row] = await getDb()
    .select({ value: count() })
    .from(quoteRequests)
    .where(eq(quoteRequests.status, "new"));
  return row?.value ?? 0;
}
