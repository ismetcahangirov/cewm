import { randomUUID } from "node:crypto";
import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";

import { hashPassword } from "better-auth/crypto";
import { like } from "drizzle-orm";
import { NextRequest } from "next/server";
import { expect } from "vitest";

import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { accounts, users } from "@/lib/db/schema";

export const origin = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export type Handler = (request: NextRequest, context: unknown) => Promise<Response>;

export type RouteModule = Partial<Record<"GET" | "POST" | "PATCH" | "PUT" | "DELETE", Handler>>;

const routesRoot = join(process.cwd(), "app", "api", "admin");

function routeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return routeFiles(path);
    return entry.name === "route.ts" ? [path] : [];
  });
}

export const adminRoutes = routeFiles(routesRoot).map((file) => ({
  file,
  path: `/api/admin/${relative(routesRoot, file).split(sep).slice(0, -1).join("/")}`.replace(
    /\/$/,
    "",
  ),
}));

export function request(
  path: string,
  init: { method?: string; cookie?: string; body?: unknown } = {},
): NextRequest {
  const headers = new Headers();
  if (init.cookie) headers.set("cookie", init.cookie);
  if (init.body !== undefined) headers.set("content-type", "application/json");
  headers.set("origin", origin);
  return new NextRequest(new URL(path, origin), {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

export async function loadRoute(path: string): Promise<RouteModule> {
  const route = adminRoutes.find((entry) => entry.path === path);
  if (!route) throw new Error(`No route file for ${path}`);
  return (await import(pathToFileURL(route.file).href)) as RouteModule;
}

export async function call(
  template: string,
  method: keyof RouteModule,
  init: { path?: string; cookie?: string; body?: unknown; params?: Record<string, string> } = {},
): Promise<Response> {
  const handler = (await loadRoute(template))[method];
  if (!handler) throw new Error(`${method} ${template} is not exported`);
  return handler(request(init.path ?? template, { method, cookie: init.cookie, body: init.body }), {
    params: Promise.resolve(init.params ?? {}),
  });
}

export function testRun() {
  const run = randomUUID().slice(0, 8);
  return { run, domain: `${run}.cewm.test`, password: `Test-password-${run}` };
}

export async function createUser(
  role: "owner" | "editor",
  domain: string,
  password: string,
): Promise<{ id: string; email: string }> {
  const id = randomUUID();
  const email = `${role}@${domain}`;
  await getDb()
    .insert(users)
    .values({ id, name: `Test ${role}`, email, role, emailVerified: true });
  await getDb()
    .insert(accounts)
    .values({
      id: randomUUID(),
      accountId: id,
      providerId: "credential",
      userId: id,
      password: await hashPassword(password),
    });
  return { id, email };
}

export async function signIn(email: string, secret: string, ip: string): Promise<Response> {
  return getAuth().handler(
    new Request(`${origin}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "content-type": "application/json", origin, "x-forwarded-for": ip },
      body: JSON.stringify({ email, password: secret }),
    }),
  );
}

export async function sessionCookie(email: string, password: string): Promise<string> {
  const response = await signIn(
    email,
    password,
    `10.${Math.floor(Math.random() * 250) + 1}.0.${Math.floor(Math.random() * 250) + 1}`,
  );
  expect(response.status).toBe(200);
  const cookie = response.headers.getSetCookie().find((value) => value.includes("session_token"));
  if (!cookie) throw new Error("No session cookie");
  return cookie.split(";")[0] ?? "";
}

export async function removeUsers(domain: string): Promise<void> {
  await getDb()
    .delete(users)
    .where(like(users.email, `%@${domain}`));
}
