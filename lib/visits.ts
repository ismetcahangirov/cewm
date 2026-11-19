import "server-only";

import { sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { siteVisits } from "@/lib/db/schema";
import { clientIp, hashClientIp } from "@/lib/consultation-requests/submit";

const siteTimeZone = "Asia/Baku";

const automatedAgent =
  /bot|crawl|spider|slurp|lighthouse|headless|preview|facebookexternalhit|curl|wget|python|httpclient|okhttp|axios/i;

export function siteDay(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: siteTimeZone }).format(now);
}

export function isAutomatedAgent(userAgent: string | null): boolean {
  return !userAgent || automatedAgent.test(userAgent);
}

export async function recordVisit(headers: Headers, now = new Date()): Promise<boolean> {
  const userAgent = headers.get("user-agent");
  if (isAutomatedAgent(userAgent)) return false;
  const visitorHash = hashClientIp(`${clientIp(headers) ?? "unknown"}\n${userAgent}`);
  await getDb()
    .insert(siteVisits)
    .values({ visitorHash, day: siteDay(now) })
    .onConflictDoNothing();
  return true;
}

export type VisitorCounts = { today: number; week: number; month: number };

export async function countVisitors(now = new Date()): Promise<VisitorCounts> {
  const today = siteDay(now);
  const [row] = await getDb()
    .select({
      today:
        sql<number>`count(distinct ${siteVisits.visitorHash}) filter (where ${siteVisits.day} = ${today}::date)`.mapWith(
          Number,
        ),
      week: sql<number>`count(distinct ${siteVisits.visitorHash}) filter (where ${siteVisits.day} > ${today}::date - 7)`.mapWith(
        Number,
      ),
      month: sql<number>`count(distinct ${siteVisits.visitorHash})`.mapWith(Number),
    })
    .from(siteVisits)
    .where(sql`${siteVisits.day} > ${today}::date - 30 and ${siteVisits.day} <= ${today}::date`);
  return { today: row?.today ?? 0, week: row?.week ?? 0, month: row?.month ?? 0 };
}
