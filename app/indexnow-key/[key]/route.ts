import { connection } from "next/server";

import { getSiteSettings } from "@/lib/public/settings";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/indexnow-key/[key]">,
): Promise<Response> {
  await connection();
  const [{ key }, settings] = await Promise.all([params, getSiteSettings()]);
  if (!settings.seo.indexNowKey || settings.seo.indexNowKey !== key) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(key, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex" },
  });
}
