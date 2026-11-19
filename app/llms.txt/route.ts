import { connection } from "next/server";

import { env } from "@/lib/env";
import { buildLlmsTxt, getLlmsSource } from "@/lib/seo/llms";

export async function GET(): Promise<Response> {
  await connection();
  const body = buildLlmsTxt(await getLlmsSource(), env.NEXT_PUBLIC_SITE_URL);
  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
