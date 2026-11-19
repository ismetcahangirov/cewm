import { inArray } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getDb } from "@/lib/db";
import { redirects } from "@/lib/db/schema";
import { invalidateLegacyRedirects } from "@/lib/redirects/legacy";
import { config, proxy } from "@/proxy";

import { testRun } from "./support/admin";

const origin = "http://localhost:3000";
const sessionCookie = "better-auth.session_token=anything.signed";
const { run } = testRun();

function send(path: string, cookie?: string) {
  return proxy(new NextRequest(`${origin}${path}`, { headers: cookie ? { cookie } : undefined }));
}

function passedThrough(response: Response) {
  expect(response.headers.get("location")).toBeNull();
  expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  expect(response.headers.get("x-middleware-next")).toBe("1");
}

const legacy = {
  page: { fromPath: `/test-${run}-rəhbər-dəstləri`, toPath: `/mehsullar/test-${run}` },
  product: { fromPath: `/product/test-${run}`, toPath: `/mehsul/test-${run}` },
  upload: {
    fromPath: `/wp-content/uploads/2023/test-${run}/Photo-300x200.jpg`,
    toPath: `/media/wp/2023/test-${run}/photo.jpg`,
  },
  temporary: { fromPath: `/test-${run}-kampaniya`, toPath: "/mehsullar", statusCode: 302 },
};

const encodedPage = `/test-${run}-${encodeURIComponent("rəhbər-dəstləri")}`;

beforeAll(async () => {
  await getDb().insert(redirects).values(Object.values(legacy));
  invalidateLegacyRedirects();
});

afterAll(async () => {
  await getDb()
    .delete(redirects)
    .where(
      inArray(
        redirects.fromPath,
        Object.values(legacy).map((row) => row.fromPath),
      ),
    );
  invalidateLegacyRedirects();
});

describe("proxy: admin pages", () => {
  it("sends an anonymous visitor of /admin to the login page", async () => {
    const response = await send("/admin");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`${origin}/admin/login`);
  });

  it("keeps the requested admin page as ?next", async () => {
    const response = await send("/admin/users?page=2");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/admin/login?next=${encodeURIComponent("/admin/users?page=2")}`,
    );
  });

  it.each(["/admin/login", "/admin/forgot-password", "/admin/reset-password?token=x"])(
    "lets %s through without a session",
    async (path) => {
      passedThrough(await send(path));
    },
  );

  it("lets a request with a session cookie reach the page, which checks it again", async () => {
    const response = await send("/admin/users", sessionCookie);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("removes a trailing slash before guarding", async () => {
    const response = await send("/admin/users/");
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(`${origin}/admin/users`);
  });

  it("does not treat /administrator as part of the admin panel", async () => {
    const response = await send("/administrator");
    expect(response.status).toBe(404);
    expect(response.headers.get("x-middleware-rewrite")).toBe(`${origin}/az/_/not-found`);
  });
});

describe("proxy: admin API", () => {
  it.each(["/api/admin/users", "/api/admin/users/abc", "/api/admin/media?page=1"])(
    "answers %s with 401 JSON when there is no session",
    async (path) => {
      const response = await send(path);
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({ error: "unauthorized" });
    },
  );

  it("leaves the public auth endpoints alone", async () => {
    passedThrough(await send("/api/auth/sign-in/email"));
  });
});

describe("proxy: legacy redirects", () => {
  it("answers a percent-encoded Azerbaijani slug with a trailing slash in one hop", async () => {
    const response = await send(`${encodedPage}/`);
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(`${origin}${legacy.page.toPath}`);
  });

  it("matches lower-case percent escapes as WordPress writes them", async () => {
    const response = await send(`${encodedPage.toLowerCase()}/`);
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(`${origin}${legacy.page.toPath}`);
  });

  it("keeps the query string for pages", async () => {
    const response = await send(`${legacy.product.fromPath}/?utm_source=google`);
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(
      `${origin}${legacy.product.toPath}?utm_source=google`,
    );
  });

  it("redirects an uploads path to the media route without the query string", async () => {
    const response = await send(`${legacy.upload.fromPath}?ver=2`);
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(`${origin}${legacy.upload.toPath}`);
  });

  it("uses the status code stored on the row", async () => {
    const response = await send(`${legacy.temporary.fromPath}/`);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(`${origin}/mehsullar`);
  });

  it.each([
    "/wp-sitemap.xml",
    "/wp-sitemap-posts-product-1.xml",
    "/wp-sitemap-taxonomies-product_cat-1.xml",
    "/sitemap_index.xml",
    "/page-sitemap.xml",
    "/product_cat-sitemap2.xml",
  ])("sends the old sitemap %s to /sitemap.xml", async (path) => {
    const response = await send(path);
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(`${origin}/sitemap.xml`);
  });

  it("drops a row from the map once it is deleted", async () => {
    const row = { fromPath: `/test-${run}-silinen`, toPath: "/mehsullar" };
    await getDb().insert(redirects).values(row);
    invalidateLegacyRedirects();
    expect((await send(row.fromPath)).status).toBe(301);
    await getDb()
      .delete(redirects)
      .where(inArray(redirects.fromPath, [row.fromPath]));
    invalidateLegacyRedirects();
    const after = await send(row.fromPath);
    expect(after.status).toBe(404);
    expect(after.headers.get("x-middleware-rewrite")).toBe(`${origin}/az/_/not-found`);
  });
});

describe("proxy: public site", () => {
  it("still rewrites unprefixed paths to the default locale", async () => {
    const response = await send("/mehsullar");
    expect(response.headers.get("x-middleware-rewrite")).toBe(`${origin}/az/mehsullar`);
  });

  it("rewrites the home page to the default locale", async () => {
    const response = await send("/");
    expect(response.headers.get("x-middleware-rewrite")).toBe(`${origin}/az`);
  });

  it("removes a trailing slash with a 308 and keeps the query string", async () => {
    const response = await send("/mehsullar/?page=2");
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(`${origin}/mehsullar?page=2`);
  });

  it.each(["//evil.example/", "/\\evil.example/"])(
    "keeps the trailing-slash redirect for %s on this origin",
    async (path) => {
      const response = await send(path);
      expect(response.status).toBe(308);
      expect(new URL(response.headers.get("location") ?? "").origin).toBe(origin);
    },
  );

  it.each([
    "/sitemap.xml",
    "/robots.txt",
    "/icon.svg",
    "/wp-content/uploads/2023/01/missing.jpg",
    "/ru/sitemap.xml",
  ])("passes the dotted path %s through untouched", async (path) => {
    passedThrough(await send(path));
  });

  it.each(["/api/health", "/media/wp/2023/01/photo.jpg"])(
    "passes %s through untouched",
    async (path) => {
      passedThrough(await send(path));
    },
  );
});

describe("proxy: matcher", () => {
  const matcher = new RegExp(`^${config.matcher[0]}$`);

  it.each(["/_next/static/chunks/app.js", "/_next/image", "/media/wp/2023/01/photo.jpg"])(
    "skips %s",
    (path) => {
      expect(matcher.test(path)).toBe(false);
    },
  );

  it.each([
    "/",
    "/wp-content/uploads/2023/01/photo.jpg",
    "/sitemap.xml",
    "/api/admin/users",
    "/product/x/",
  ])("runs on %s", (path) => {
    expect(matcher.test(path)).toBe(true);
  });
});
