import { describe, expect, it } from "vitest";

import { frameBudget } from "@/lib/motion/frame-budget";

function feed(budget: ReturnType<typeof frameBudget>, intervals: number[]) {
  for (const dt of intervals) budget.record(dt);
  return budget.rich;
}

describe("frameBudget", () => {
  it("keeps the rich mode on a fast screen with occasional long frames", () => {
    const budget = frameBudget();
    const frames = Array.from({ length: 600 }, (_, index) => (index % 40 === 0 ? 50 : 4.2));
    expect(feed(budget, frames)).toBe(true);
    expect(budget.switches).toBe(0);
  });

  it("drops the rich mode when long frames are sustained", () => {
    const budget = frameBudget();
    const frames = Array.from({ length: 32 }, (_, index) => (index % 3 === 0 ? 33 : 16.7));
    expect(feed(budget, frames)).toBe(false);
    expect(budget.switches).toBe(1);
  });

  it("does not decide before the sample window is full", () => {
    const budget = frameBudget();
    expect(
      feed(
        budget,
        Array.from({ length: 31 }, () => 50),
      ),
    ).toBe(true);
    expect(budget.record(50)).toBe(false);
  });

  it("restores the rich mode only after a calm stretch, and waits longer each time", () => {
    const budget = frameBudget({ restoreFrames: 40 });
    feed(
      budget,
      Array.from({ length: 32 }, () => 40),
    );
    expect(budget.rich).toBe(false);
    feed(
      budget,
      Array.from({ length: 31 + 39 }, () => 16.7),
    );
    expect(budget.rich).toBe(false);
    expect(budget.record(16.7)).toBe(true);
    feed(
      budget,
      Array.from({ length: 32 }, () => 40),
    );
    expect(budget.rich).toBe(false);
    feed(
      budget,
      Array.from({ length: 31 + 79 }, () => 16.7),
    );
    expect(budget.rich).toBe(false);
    expect(budget.record(16.7)).toBe(true);
    expect(budget.switches).toBe(4);
  });
});
