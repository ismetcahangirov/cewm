import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import { revalidateTag } from "next/cache";
import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/revalidate/route";
import {
  describeRevalidation,
  requestPublicRevalidation,
  revalidationToken,
} from "@/lib/cache/remote-revalidate";

vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));

const secret = process.env.BETTER_AUTH_SECRET ?? "";

function post(authorization?: string): Promise<Response> {
  return POST(
    new Request("http://localhost/api/revalidate", {
      method: "POST",
      headers: authorization ? { authorization } : {},
    }),
  );
}

let server: Server | undefined;

afterEach(() => {
  server?.close();
  server = undefined;
  vi.mocked(revalidateTag).mockClear();
});

async function listen(handler: Parameters<typeof createServer>[1]): Promise<string> {
  server = createServer(handler);
  await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server?.address() as AddressInfo).port}`;
}

describe("public cache refresh from command line scripts", () => {
  it("refuses a request without the token or with a wrong one", async () => {
    expect((await post()).status).toBe(401);
    expect((await post(`Bearer ${revalidationToken("another-secret")}`)).status).toBe(401);
    expect(vi.mocked(revalidateTag)).not.toHaveBeenCalled();
  });

  it("expires every public tag for the right token", async () => {
    const response = await post(`Bearer ${revalidationToken(secret)}`);
    expect(response.status).toBe(204);
    const tags = vi.mocked(revalidateTag).mock.calls.map(([tag]) => tag);
    expect(tags.sort()).toEqual(["catalog", "content", "menus", "settings"]);
  });

  it("calls the running site with the token derived from the shared secret", async () => {
    let seen: { path?: string; authorization?: string } = {};
    const origin = await listen((request, response) => {
      seen = { path: request.url, authorization: request.headers.authorization };
      response.statusCode = 204;
      response.end();
    });
    const result = await requestPublicRevalidation({
      BETTER_AUTH_URL: `${origin}/`,
      BETTER_AUTH_SECRET: secret,
    });
    expect(result).toEqual({ status: "done", origin });
    expect(seen).toEqual({
      path: "/api/revalidate",
      authorization: `Bearer ${revalidationToken(secret)}`,
    });
  });

  it("explains how to refresh when the site does not answer", async () => {
    const origin = await listen((_request, response) => response.end());
    server?.close();
    const result = await requestPublicRevalidation(
      { BETTER_AUTH_URL: origin, BETTER_AUTH_SECRET: secret },
      2000,
    );
    expect(result.status).toBe("failed");
    expect(describeRevalidation(result)).toContain("restart it");

    const skipped = await requestPublicRevalidation({});
    expect(skipped.status).toBe("skipped");
  });
});
