import { describe, expect, it, vi } from "vitest";

import { createRedirectStore, type RedirectMap } from "@/lib/redirects/store";

const options = { maxAge: 60_000, retryAfter: 10_000, timeout: 50 };

function mapOf(toPath: string): RedirectMap {
  return new Map([["/old", { toPath, statusCode: 301 }]]);
}

function clock(start = 1_000_000) {
  let time = start;
  return { now: () => time, advance: (ms: number) => (time += ms) };
}

describe("legacy redirect store", () => {
  it("loads the map on the first lookup and serves it from memory afterwards", async () => {
    const load = vi.fn(async () => mapOf("/new"));
    const store = createRedirectStore(load, options);
    expect(await store.lookup("/old")).toEqual({ toPath: "/new", statusCode: 301 });
    expect(await store.lookup("/missing")).toBeNull();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("serves the stale map and refreshes it in the background after maxAge", async () => {
    const time = clock();
    const load = vi
      .fn()
      .mockResolvedValueOnce(mapOf("/first"))
      .mockResolvedValueOnce(mapOf("/second"));
    const store = createRedirectStore(load, { ...options, now: time.now });
    await store.lookup("/old");
    time.advance(61_000);
    expect(await store.lookup("/old")).toEqual({ toPath: "/first", statusCode: 301 });
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    await vi.waitFor(async () =>
      expect(await store.lookup("/old")).toEqual({ toPath: "/second", statusCode: 301 }),
    );
  });

  it("waits for a fresh map after it is invalidated", async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce(mapOf("/first"))
      .mockResolvedValueOnce(mapOf("/second"));
    const store = createRedirectStore(load, options);
    await store.lookup("/old");
    store.invalidate();
    expect(await store.lookup("/old")).toEqual({ toPath: "/second", statusCode: 301 });
  });

  it("fails open when the database is unreachable and retries later", async () => {
    const time = clock();
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error("connect ECONNREFUSED"))
      .mockResolvedValueOnce(mapOf("/new"));
    const store = createRedirectStore(load, { ...options, now: time.now });
    expect(await store.lookup("/old")).toBeNull();
    expect(await store.lookup("/old")).toBeNull();
    expect(load).toHaveBeenCalledTimes(1);
    time.advance(11_000);
    expect(await store.lookup("/old")).toEqual({ toPath: "/new", statusCode: 301 });
  });

  it("keeps the last good map when a refresh fails", async () => {
    const time = clock();
    const load = vi
      .fn()
      .mockResolvedValueOnce(mapOf("/new"))
      .mockRejectedValueOnce(new Error("timeout"));
    const store = createRedirectStore(load, { ...options, now: time.now });
    await store.lookup("/old");
    store.invalidate();
    expect(await store.lookup("/old")).toEqual({ toPath: "/new", statusCode: 301 });
  });

  it("does not hold a request longer than the timeout", async () => {
    const load = vi.fn(() => new Promise<RedirectMap>(() => {}));
    const store = createRedirectStore(load, options);
    const started = Date.now();
    expect(await store.lookup("/old")).toBeNull();
    expect(Date.now() - started).toBeLessThan(1_000);
  });
});
