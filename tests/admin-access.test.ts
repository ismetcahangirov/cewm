import { inArray } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

import {
  adminRoutes as routes,
  call,
  createUser as createTestUser,
  loadRoute,
  removeUsers,
  request,
  sessionCookie as login,
  signIn,
  testRun,
  type Handler,
  type RouteModule,
} from "./support/admin";

vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));

const mailpit = process.env.MAILPIT_URL ?? "http://localhost:8025";
const { domain: testDomain, password } = testRun();

const context = { params: Promise.resolve({ id: "missing-user" }) };

const createUser = (role: "owner" | "editor") => createTestUser(role, testDomain, password);
const sessionCookie = (email: string) => login(email, password);

let owner: { id: string; email: string; cookie: string };
let editor: { id: string; email: string; cookie: string };

beforeAll(async () => {
  const ownerUser = await createUser("owner");
  const editorUser = await createUser("editor");
  owner = { ...ownerUser, cookie: await sessionCookie(ownerUser.email) };
  editor = { ...editorUser, cookie: await sessionCookie(editorUser.email) };
});

afterAll(async () => {
  await removeUsers(testDomain);
});

describe("every /api/admin route handler", () => {
  it("is discovered", () => {
    expect(routes.length).toBeGreaterThanOrEqual(5);
  });

  for (const route of routes) {
    it(`${route.path} rejects anonymous and forged sessions`, async () => {
      const handlers = (await import(pathToFileURL(route.file).href)) as RouteModule;
      const methods = Object.entries(handlers).filter(([, value]) => typeof value === "function");
      expect(methods.length).toBeGreaterThan(0);
      for (const [method, handler] of methods) {
        const anonymous = await (handler as Handler)(request(route.path, { method }), context);
        expect(anonymous.status, `${method} ${route.path} anonymous`).toBe(401);
        const forged = await (handler as Handler)(
          request(route.path, { method, cookie: "better-auth.session_token=forged.value" }),
          context,
        );
        expect(forged.status, `${method} ${route.path} forged`).toBe(401);
      }
    });
  }
});

describe("roles", () => {
  it("lets an editor read the unread request count", async () => {
    const response = await call("/api/admin/consultation-requests/unread-count", "GET", {
      cookie: editor.cookie,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ count: expect.any(Number) });
  });

  it("keeps editors out of user management", async () => {
    const list = await call("/api/admin/users", "GET", { cookie: editor.cookie });
    expect(list.status).toBe(403);
    const update = await call("/api/admin/users/[id]", "PATCH", {
      cookie: editor.cookie,
      body: { role: "editor" },
      params: { id: owner.id },
    });
    expect(update.status).toBe(403);
  });

  it("lets the owner search users", async () => {
    const response = await call("/api/admin/users", "GET", {
      path: `/api/admin/users?search=${testDomain}&sort=email`,
      cookie: owner.cookie,
    });
    expect(response.status).toBe(200);
    const page = (await response.json()) as { rows: { email: string }[]; rowCount: number };
    expect(page.rowCount).toBe(2);
    expect(page.rows.map((row) => row.email)).toEqual([editor.email, owner.email]);
  });
});

const ownerOnlyRoutes = [
  "/api/admin/settings",
  "/api/admin/site-texts",
  "/api/admin/redirects",
  "/api/admin/redirects/[id]",
  "/api/admin/users",
  "/api/admin/users/[id]",
  "/api/admin/users/[id]/invite",
];

describe("owner-only areas", () => {
  for (const path of ownerOnlyRoutes) {
    it(`${path} answers 403 to an editor on every method`, async () => {
      const handlers = await loadRoute(path);
      const methods = Object.entries(handlers).filter(([, value]) => typeof value === "function");
      expect(methods.length).toBeGreaterThan(0);
      for (const [method, handler] of methods) {
        const response = await (handler as Handler)(
          request(path, { method, cookie: editor.cookie, body: method === "GET" ? undefined : {} }),
          { params: Promise.resolve({ id: "missing" }) },
        );
        expect(response.status, `${method} ${path}`).toBe(403);
      }
    });
  }

  it("lets the owner read the settings and the site texts", async () => {
    for (const path of ["/api/admin/settings", "/api/admin/site-texts"]) {
      const response = await call(path, "GET", { cookie: owner.cookie });
      expect(response.status, path).toBe(200);
    }
  });
});

describe("admin route handlers", () => {
  it("validate every request body with zod and never read it unchecked", () => {
    const unchecked = routes.filter((route) => {
      const source = readFileSync(route.file, "utf8");
      const takesBody = /export const (POST|PUT|PATCH)/.test(source);
      const readsRaw = /request\.json\(|\.formData\(/.test(source);
      return readsRaw || (takesBody && !/readJson\(/.test(source) && !bodyless.has(route.path));
    });
    expect(unchecked.map((route) => route.path)).toEqual([]);
  });

  it("let a signed-in user remember the interface language", async () => {
    const saved = await call("/api/admin/profile", "PATCH", {
      cookie: editor.cookie,
      body: { adminLocale: "de" },
    });
    expect(saved.status).toBe(200);
    const [row] = await getDb()
      .select({ adminLocale: users.adminLocale })
      .from(users)
      .where(inArray(users.id, [editor.id]));
    expect(row?.adminLocale).toBe("de");
    const rejected = await call("/api/admin/profile", "PATCH", {
      cookie: editor.cookie,
      body: { adminLocale: "fr" },
    });
    expect(rejected.status).toBe(400);
  });
});

const bodyless = new Set(["/api/admin/products/[id]/duplicate", "/api/admin/users/[id]/invite"]);

describe("users API validation", () => {
  it("rejects an invalid invite with field messages", async () => {
    const response = await call("/api/admin/users", "POST", {
      cookie: owner.cookie,
      body: { name: "A", email: "not-an-email", role: "admin" },
    });
    expect(response.status).toBe(400);
    const body = (await response.json()) as { fields: Record<string, string> };
    expect(Object.keys(body.fields).sort()).toEqual(["email", "name", "role"]);
  });

  it("rejects an unknown sort field", async () => {
    const response = await call("/api/admin/users", "GET", {
      path: "/api/admin/users?sort=password",
      cookie: owner.cookie,
    });
    expect(response.status).toBe(400);
  });

  it("refuses to let the owner change their own access", async () => {
    const response = await call("/api/admin/users/[id]", "PATCH", {
      cookie: owner.cookie,
      body: { active: false },
      params: { id: owner.id },
    });
    expect(response.status).toBe(409);
  });
});

describe("invite and deactivate", () => {
  it("invites a user and emails a password link", async () => {
    const email = `invited@${testDomain}`;
    const response = await call("/api/admin/users", "POST", {
      cookie: owner.cookie,
      body: { name: "Invited Person", email, role: "editor" },
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ email, role: "editor", invitePending: true });

    const duplicate = await call("/api/admin/users", "POST", {
      cookie: owner.cookie,
      body: { name: "Invited Person", email, role: "editor" },
    });
    expect(duplicate.status).toBe(409);

    const search = await fetch(
      `${mailpit}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
    );
    const found = (await search.json()) as { messages: { Subject: string }[] };
    expect(found.messages.map((message) => message.Subject)).toContain("CEWM idarə panelinə dəvət");
  });

  it("deactivating a user ends their session and blocks sign-in", async () => {
    const response = await call("/api/admin/users/[id]", "PATCH", {
      cookie: owner.cookie,
      body: { active: false },
      params: { id: editor.id },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ active: false });

    const afterBan = await call("/api/admin/consultation-requests/unread-count", "GET", {
      cookie: editor.cookie,
    });
    expect(afterBan.status).toBe(401);

    const again = await signIn(editor.email, password, "10.99.99.1");
    expect(again.status).toBe(403);

    const banned = await getDb()
      .select({ banned: users.banned })
      .from(users)
      .where(inArray(users.id, [editor.id]));
    expect(banned[0]?.banned).toBe(true);
  });
});

describe("sign-in rate limit", () => {
  it("answers 429 after five failed attempts from one address", async () => {
    const ip = `10.250.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      statuses.push((await signIn(owner.email, "wrong-password", ip)).status);
    }
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(statuses[5]).toBe(429);
  });
});
