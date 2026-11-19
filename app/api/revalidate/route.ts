import { jsonError } from "@/lib/api/server";
import { isRevalidationToken } from "@/lib/cache/remote-revalidate";
import { revalidatePublic } from "@/lib/cache/revalidate";
import { serverEnv } from "@/lib/env.server";
import { invalidateLegacyRedirects } from "@/lib/redirects/legacy";

export async function POST(request: Request): Promise<Response> {
  if (!isRevalidationToken(request.headers.get("authorization"), serverEnv().BETTER_AUTH_SECRET)) {
    return jsonError(401, "unauthorized", "Daxil olmaq lazımdır.");
  }
  revalidatePublic("catalog", "content", "menus", "settings");
  invalidateLegacyRedirects();
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
