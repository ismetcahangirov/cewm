import { eq, like, or } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Page } from "@/lib/api/types";
import { getDb } from "@/lib/db";
import { redirects } from "@/lib/db/schema";
import type { RedirectDto, RedirectSaveResult } from "@/lib/validation/redirects";
import { proxy } from "@/proxy";

import { call, createUser, removeUsers, sessionCookie, testRun } from "./support/admin";

const { run, domain, password } = testRun();
const base = `/test-${run}`;

let owner = "";
let editor = "";

async function json<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function create(body: unknown, cookie = owner) {
  return call("/api/admin/redirects", "POST", { cookie, body });
}

function update(id: string, body: unknown) {
  return call("/api/admin/redirects/[id]", "PUT", { cookie: owner, body, params: { id } });
}

function remove(id: string) {
  return call("/api/admin/redirects/[id]", "DELETE", { cookie: owner, params: { id } });
}

function list(query: Record<string, string>) {
  const params = new URLSearchParams(query);
  return call("/api/admin/redirects", "GET", {
    cookie: owner,
    path: `/api/admin/redirects?${params}`,
  });
}

async function targetOf(fromPath: string): Promise<string | undefined> {
  const [row] = await getDb()
    .select({ toPath: redirects.toPath })
    .from(redirects)
    .where(eq(redirects.fromPath, fromPath));
  return row?.toPath;
}

beforeAll(async () => {
  const ownerUser = await createUser("owner", domain, password);
  const editorUser = await createUser("editor", domain, password);
  owner = await sessionCookie(ownerUser.email, password);
  editor = await sessionCookie(editorUser.email, password);
});

afterAll(async () => {
  await getDb()
    .delete(redirects)
    .where(or(like(redirects.fromPath, `%${run}%`), like(redirects.toPath, `%${run}%`)));
  await removeUsers(domain);
});

describe("admin redirects API", () => {
  let id = "";

  it("creates a redirect and normalises a pasted WordPress URL", async () => {
    const response = await create({
      fromPath: `https://cewm.az${base}-r%c9%99hb%c9%99r-d%c9%99stl%c9%99ri/`,
      toPath: `/mehsullar/${run}/`,
      statusCode: 301,
    });
    expect(response.status).toBe(201);
    const result = await json<RedirectSaveResult>(response);
    id = result.id;
    expect(result.retargeted).toBe(0);
    expect(await targetOf(`${base}-rəhbər-dəstləri`)).toBe(`/mehsullar/${run}`);
  });

  it("serves the new redirect from the proxy straight away", async () => {
    const response = await proxy(
      new NextRequest(
        new URL(`${base}-${encodeURIComponent("rəhbər-dəstləri")}/`, "http://localhost:3000"),
      ),
    );
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(`http://localhost:3000/mehsullar/${run}`);
  });

  it("keeps editors out of the redirects and lets the owner create them", async () => {
    const refused = await create(
      { fromPath: `${base}-refused`, toPath: "/mehsullar", statusCode: 302 },
      editor,
    );
    expect(refused.status).toBe(403);
    const response = await create({
      fromPath: `${base}-editor`,
      toPath: "/mehsullar",
      statusCode: 302,
    });
    expect(response.status).toBe(201);
  });

  it("lists, searches with an encoded path and pages on the server", async () => {
    const found = await json<Page<RedirectDto>>(
      await list({ search: `${base}-r%C9%99hb%C9%99r`, kind: "pages" }),
    );
    expect(found.rowCount).toBe(1);
    expect(found.rows[0]).toMatchObject({ id, statusCode: 301, toPath: `/mehsullar/${run}` });

    const files = await json<Page<RedirectDto>>(await list({ search: base, kind: "files" }));
    expect(files.rowCount).toBe(0);

    const paged = await json<Page<RedirectDto>>(
      await list({ search: base, pageSize: "10", page: "0", sort: "fromPath", order: "desc" }),
    );
    expect(paged.rowCount).toBe(2);
    expect(paged.rows.map((row) => row.fromPath)).toEqual([
      `${base}-rəhbər-dəstləri`,
      `${base}-editor`,
    ]);
  });

  it.each([
    [{ fromPath: "kohne", toPath: "/mehsullar", statusCode: 301 }, "fromPath"],
    [{ fromPath: "/", toPath: "/mehsullar", statusCode: 301 }, "fromPath"],
    [{ fromPath: "/admin/users", toPath: "/mehsullar", statusCode: 301 }, "fromPath"],
    [{ fromPath: `${base}-a`, toPath: "https://evil.example", statusCode: 301 }, "toPath"],
    [{ fromPath: `${base}-a`, toPath: "//evil.example", statusCode: 301 }, "toPath"],
    [{ fromPath: `${base}-a`, toPath: `${base}-a/`, statusCode: 301 }, "toPath"],
    [{ fromPath: `${base}-a`, toPath: "/mehsullar", statusCode: 303 }, "statusCode"],
  ])("rejects %j on %s", async (body, field) => {
    const response = await create(body);
    expect(response.status).toBe(400);
    expect((await json<{ fields: Record<string, string> }>(response)).fields).toHaveProperty(field);
  });

  it("rejects a second redirect for the same old address", async () => {
    const response = await create({
      fromPath: `${base}-rəhbər-dəstləri/`,
      toPath: "/layiheler",
      statusCode: 301,
    });
    expect(response.status).toBe(409);
    expect((await json<{ fields: Record<string, string> }>(response)).fields).toHaveProperty(
      "fromPath",
    );
  });

  it("rejects loops and chains: the target must not be redirected itself", async () => {
    const loop = await create({
      fromPath: `/mehsullar/${run}`,
      toPath: `${base}-rəhbər-dəstləri`,
      statusCode: 301,
    });
    expect(loop.status).toBe(400);
    const message = (await json<{ fields: Record<string, string> }>(loop)).fields.toPath;
    expect(message).toContain(`/mehsullar/${run}`);

    const chain = await create({
      fromPath: `${base}-zencir`,
      toPath: `${base}-editor`,
      statusCode: 301,
    });
    expect(chain.status).toBe(400);
  });

  it("points older redirects at the new target instead of building a chain", async () => {
    const response = await create({
      fromPath: `/mehsullar/${run}`,
      toPath: "/mehsullar",
      statusCode: 301,
    });
    expect(response.status).toBe(201);
    expect((await json<RedirectSaveResult>(response)).retargeted).toBe(1);
    expect(await targetOf(`${base}-rəhbər-dəstləri`)).toBe("/mehsullar");
  });

  it("updates a redirect and keeps its own old address valid", async () => {
    const response = await update(id, {
      fromPath: `${base}-rəhbər-dəstləri`,
      toPath: "/layiheler?tab=ofis",
      statusCode: 308,
    });
    expect(response.status).toBe(200);
    expect(await targetOf(`${base}-rəhbər-dəstləri`)).toBe("/layiheler?tab=ofis");
  });

  it("answers 404 for an unknown id", async () => {
    const response = await update("00000000-0000-4000-8000-000000000000", {
      fromPath: `${base}-yox`,
      toPath: "/mehsullar",
      statusCode: 301,
    });
    expect(response.status).toBe(404);
  });

  it("deletes a redirect once", async () => {
    expect((await remove(id)).status).toBe(204);
    expect((await remove(id)).status).toBe(404);
    expect(await targetOf(`${base}-rəhbər-dəstləri`)).toBeUndefined();
  });
});
