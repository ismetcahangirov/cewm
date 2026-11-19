export type FrameBudgetOptions = {
  slowFrameMs?: number;
  sampleSize?: number;
  dropShare?: number;
  restoreShare?: number;
  restoreFrames?: number;
};

export type FrameBudget = {
  record: (dt: number) => boolean;
  readonly rich: boolean;
  readonly switches: number;
};

export function frameBudget({
  slowFrameMs = 24,
  sampleSize = 32,
  dropShare = 0.25,
  restoreShare = 0.03,
  restoreFrames = 120,
}: FrameBudgetOptions = {}): FrameBudget {
  const samples = new Uint8Array(sampleSize);
  let next = 0;
  let filled = 0;
  let slow = 0;
  let calm = 0;
  let calmNeeded = restoreFrames;
  let rich = true;
  let switches = 0;

  function record(dt: number) {
    const isSlow = dt > slowFrameMs ? 1 : 0;
    if (filled === sampleSize) slow -= samples[next] ?? 0;
    else filled += 1;
    samples[next] = isSlow;
    slow += isSlow;
    next = (next + 1) % sampleSize;
    if (filled < sampleSize) return rich;
    const share = slow / sampleSize;
    if (rich && share > dropShare) {
      rich = false;
      switches += 1;
      calm = 0;
    } else if (!rich) {
      calm = share <= restoreShare ? calm + 1 : 0;
      if (calm >= calmNeeded) {
        rich = true;
        switches += 1;
        calmNeeded *= 2;
      }
    }
    return rich;
  }

  return {
    record,
    get rich() {
      return rich;
    },
    get switches() {
      return switches;
    },
  };
}
