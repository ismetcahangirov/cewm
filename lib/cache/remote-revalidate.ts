import { createHmac, timingSafeEqual } from "node:crypto";

export const revalidateEndpoint = "/api/revalidate";

const purpose = "cewm-public-revalidate";

export function revalidationToken(secret: string): string {
  return createHmac("sha256", secret).update(purpose).digest("hex");
}

export function isRevalidationToken(header: string | null, secret: string): boolean {
  const presented = Buffer.from(header?.replace(/^Bearer\s+/i, "") ?? "");
  const expected = Buffer.from(revalidationToken(secret));
  return presented.length === expected.length && timingSafeEqual(presented, expected);
}

export type RemoteRevalidation =
  | { status: "done"; origin: string }
  | { status: "skipped" | "failed"; origin: string | null; reason: string };

export async function requestPublicRevalidation(
  env: Record<string, string | undefined> = process.env,
  timeoutMs = 5000,
): Promise<RemoteRevalidation> {
  const origin = env.BETTER_AUTH_URL?.replace(/\/+$/, "") || null;
  if (!origin || !env.BETTER_AUTH_SECRET) {
    return {
      status: "skipped",
      origin,
      reason: "BETTER_AUTH_URL or BETTER_AUTH_SECRET is not set",
    };
  }
  try {
    const response = await fetch(`${origin}${revalidateEndpoint}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${revalidationToken(env.BETTER_AUTH_SECRET)}` },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.ok) return { status: "done", origin };
    return { status: "failed", origin, reason: `the site answered ${response.status}` };
  } catch (error) {
    return {
      status: "failed",
      origin,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

export function describeRevalidation(result: RemoteRevalidation): string {
  if (result.status === "done") return `Public cache refreshed on ${result.origin}.`;
  return [
    `The public cache was not refreshed (${result.origin ?? "no site address"}: ${result.reason}).`,
    "If the site is running, restart it; otherwise cached pages show the change within an hour.",
  ].join(" ");
}
