import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "components/home/hero-film-player.tsx"), "utf8");

describe("hero film remount", () => {
  it("starts every chapter in an unknown state so the first tick writes it", () => {
    expect(source).toContain("active: null as boolean | null");
    expect(source).not.toContain("active: false,\n  }));");
  });

  it("clears the scroll-linked inline state when the film stops", () => {
    const stop = source.slice(source.indexOf("function stop()"));
    expect(stop).toContain('chapter.element.removeAttribute("data-active")');
    expect(stop).toContain('cta?.style.removeProperty("opacity")');
    expect(stop).toContain('group?.style.removeProperty("transform")');
  });
});
