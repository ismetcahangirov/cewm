export type RedirectTarget = { toPath: string; statusCode: number };

export type RedirectMap = ReadonlyMap<string, RedirectTarget>;

export type RedirectStore = {
  lookup(path: string): Promise<RedirectTarget | null>;
  invalidate(): void;
};

export type RedirectStoreOptions = {
  maxAge: number;
  retryAfter: number;
  timeout: number;
  now?: () => number;
};

async function settleWithin(promise: Promise<void>, ms: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    promise,
    new Promise<void>((resolve) => {
      timer = setTimeout(resolve, ms);
    }),
  ]);
  clearTimeout(timer);
}

export function createRedirectStore(
  load: () => Promise<RedirectMap>,
  { maxAge, retryAfter, timeout, now = Date.now }: RedirectStoreOptions,
): RedirectStore {
  let map: RedirectMap | null = null;
  let loadedAt = 0;
  let failedAt = Number.NEGATIVE_INFINITY;
  let invalidated = false;
  let pending: Promise<void> | null = null;

  function refresh(): Promise<void> {
    if (pending) return pending;
    const started = now();
    pending = Promise.resolve()
      .then(load)
      .then(
        (next) => {
          map = next;
          loadedAt = started;
          invalidated = false;
        },
        () => {
          failedAt = now();
        },
      )
      .finally(() => {
        pending = null;
      });
    return pending;
  }

  return {
    async lookup(path) {
      try {
        const time = now();
        const mayRetry = time - failedAt >= retryAfter;
        if (map === null || invalidated) {
          if (mayRetry || pending) await settleWithin(refresh(), timeout);
        } else if (time - loadedAt >= maxAge && mayRetry) {
          void refresh();
        }
        return map?.get(path) ?? null;
      } catch {
        return null;
      }
    },
    invalidate() {
      invalidated = true;
      failedAt = Number.NEGATIVE_INFINITY;
    },
  };
}
