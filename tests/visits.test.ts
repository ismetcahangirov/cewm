import { randomUUID } from "node:crypto";

import { and, eq, gte } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST as visitRoute } from "@/app/api/visits/route";
import { getDb } from "@/lib/db";
import { siteVisits } from "@/lib/db/schema";
import { hashClientIp } from "@/lib/consultation-requests/submit";
import { countVisitors, isAutomatedAgent, recordVisit, siteDay } from "@/lib/visits";

import { createUser, origin, removeUsers, sessionCookie, testRun } from "./support/admin";

const browser = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15";
const testYear = new Date("2099-01-01T00:00:00Z");
const { domain, password } = testRun();

let cookie = "";

function visitor(ip: string, userAgent = browser): Headers {
  return new Headers({ "user-agent": userAgent, "x-real-ip": ip });
}

function at(isoDay: string): Date {
  return new Date(`${isoDay}T12:00:00+04:00`);
}

function beacon(headers: Headers): Promise<Response> {
  return visitRoute(new NextRequest(new URL("/api/visits", origin), { method: "POST", headers }));
}

async function storedToday(ip: string): Promise<number> {
  const rows = await getDb()
    .select()
    .from(siteVisits)
    .where(
      and(
        eq(siteVisits.day, siteDay(new Date())),
        eq(siteVisits.visitorHash, hashClientIp(`${ip}\n${browser}`)),
      ),
    );
  return rows.length;
}

beforeAll(async () => {
  const user = await createUser("owner", domain, password);
  cookie = await sessionCookie(user.email, password);
});

afterAll(async () => {
  await getDb()
    .delete(siteVisits)
    .where(gte(siteVisits.day, siteDay(testYear)));
  await removeUsers(domain);
});

describe("site visits", () => {
  it("uses the Baku calendar day", () => {
    expect(siteDay(new Date("2099-03-01T19:59:00Z"))).toBe("2099-03-01");
    expect(siteDay(new Date("2099-03-01T20:00:00Z"))).toBe("2099-03-02");
  });

  it("treats crawlers, audits and missing agents as automated", () => {
    expect(isAutomatedAgent(null)).toBe(true);
    expect(isAutomatedAgent("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isAutomatedAgent("Mozilla/5.0 Chrome-Lighthouse")).toBe(true);
    expect(isAutomatedAgent(browser)).toBe(false);
  });

  it("counts each visitor once per day across the 1, 7 and 30 day windows", async () => {
    const a = `198.51.100.${Math.floor(Math.random() * 200) + 1}-${randomUUID()}`;
    const b = `${a}-b`;
    const c = `${a}-c`;

    await recordVisit(visitor(a), at("2099-06-30"));
    await recordVisit(visitor(a), at("2099-06-30"));
    await recordVisit(visitor(a), at("2099-06-28"));
    await recordVisit(visitor(b), at("2099-06-25"));
    await recordVisit(visitor(c), at("2099-06-10"));
    await recordVisit(visitor(c), at("2099-05-01"));
    expect(await recordVisit(visitor(c, "curl/8.0"), at("2099-06-30"))).toBe(false);

    expect(await countVisitors(at("2099-06-30"))).toEqual({ today: 1, week: 2, month: 3 });
    expect(await countVisitors(at("2099-07-01"))).toEqual({ today: 0, week: 2, month: 3 });
  });

  it("records anonymous beacons and skips signed-in users", async () => {
    const anonymous = `203.0.113.7-${randomUUID()}`;
    const signedIn = `203.0.113.8-${randomUUID()}`;

    expect((await beacon(visitor(anonymous))).status).toBe(204);
    const withSession = visitor(signedIn);
    withSession.set("cookie", cookie);
    expect((await beacon(withSession)).status).toBe(204);

    expect(await storedToday(anonymous)).toBe(1);
    expect(await storedToday(signedIn)).toBe(0);

    const today = siteDay(new Date());
    await getDb()
      .delete(siteVisits)
      .where(
        and(
          eq(siteVisits.day, today),
          eq(siteVisits.visitorHash, hashClientIp(`${anonymous}\n${browser}`)),
        ),
      );
  });
});
