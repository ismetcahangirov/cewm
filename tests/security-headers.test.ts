import { describe, expect, it } from "vitest";

import nextConfig from "@/next.config";

async function headersFor(source: string): Promise<Record<string, string>> {
  const rules = (await nextConfig.headers?.()) ?? [];
  const rule = rules.find((entry) => entry.source === source);
  return Object.fromEntries((rule?.headers ?? []).map(({ key, value }) => [key, value]));
}

describe("security headers", () => {
  it("forbids framing by other sites on every path, so the admin cannot be clickjacked", async () => {
    const headers = await headersFor("/:path*");
    expect(headers["X-Frame-Options"]).toBe("SAMEORIGIN");
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'self'");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
  });
});
