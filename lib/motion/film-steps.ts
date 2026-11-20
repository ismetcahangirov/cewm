export function dissolve(width: number, fraction: number): number {
  if (width >= 1) return fraction;
  if (width <= 0) return fraction < 0.5 ? 0 : 1;
  return Math.min(Math.max((fraction - (0.5 - width / 2)) / width, 0), 1);
}

export type FilmSettleOptions = {
  count: number;
  restDelay?: number;
  snapNear?: number;
  moved?: number;
};

export type FilmSettle = {
  goal: (target: number, now: number) => number;
  readonly resting: number | null;
};

export function filmSettle({
  count,
  restDelay = 140,
  snapNear = 0.12,
  moved = 1e-4,
}: FilmSettleOptions): FilmSettle {
  let last = Number.NaN;
  let movedAt = Number.NEGATIVE_INFINITY;
  let direction = 1;
  let resting: number | null = null;

  function restFor(target: number) {
    const base = Math.floor(target);
    const fraction = target - base;
    let frame = direction >= 0 ? base + 1 : base;
    if (fraction < snapNear) frame = base;
    else if (fraction > 1 - snapNear) frame = base + 1;
    return Math.min(Math.max(frame, 0), count - 1);
  }

  function goal(target: number, now: number) {
    if (Number.isNaN(last) || Math.abs(target - last) > moved) {
      if (!Number.isNaN(last)) direction = target > last ? 1 : -1;
      last = target;
      movedAt = now;
      if (resting !== null) {
        const ahead = direction > 0 ? target < resting : target > resting;
        if (ahead) return resting;
        resting = null;
      }
      return target;
    }
    if (resting === null && now - movedAt >= restDelay) resting = restFor(target);
    return resting ?? target;
  }

  return {
    goal,
    get resting() {
      return resting;
    },
  };
}
