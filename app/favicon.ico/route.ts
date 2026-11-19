import { connection } from "next/server";

import { getSiteSettings } from "@/lib/public/settings";

export async function GET(request: Request) {
  await connection();
  const { favicon } = await getSiteSettings();
  if (!favicon) {
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  }
  return Response.redirect(new URL(favicon.src, request.url), 307);
}
