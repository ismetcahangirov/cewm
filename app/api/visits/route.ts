import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";

import { recordVisit } from "@/lib/visits";

export async function POST(request: NextRequest): Promise<Response> {
  if (getSessionCookie(request) === null) await recordVisit(request.headers);
  return new Response(null, { status: 204 });
}
