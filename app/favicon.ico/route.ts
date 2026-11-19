import { connection } from "next/server";

import { getSiteSettings } from "@/lib/public/settings";

export async function GET() {
  await connection();
  const { favicon } = await getSiteSettings();
  if (!favicon) {
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  }
  return new Response(null, {
    status: 307,
    headers: { Location: favicon.src, "Cache-Control": "public, max-age=3600" },
  });
}
