import "server-only";

import { getDb } from "@/lib/db";
import { redirects } from "@/lib/db/schema";

import { createRedirectStore, type RedirectMap, type RedirectStore } from "./store";

async function loadRedirects(): Promise<RedirectMap> {
  const rows = await getDb()
    .select({
      fromPath: redirects.fromPath,
      toPath: redirects.toPath,
      statusCode: redirects.statusCode,
    })
    .from(redirects);
  return new Map(
    rows.map((row) => [row.fromPath, { toPath: row.toPath, statusCode: row.statusCode }]),
  );
}

const holder = globalThis as unknown as { legacyRedirects?: RedirectStore };

export function legacyRedirects(): RedirectStore {
  holder.legacyRedirects ??= createRedirectStore(loadRedirects, {
    maxAge: 60_000,
    retryAfter: 10_000,
    timeout: 3_000,
  });
  return holder.legacyRedirects;
}

export function invalidateLegacyRedirects(): void {
  legacyRedirects().invalidate();
}
