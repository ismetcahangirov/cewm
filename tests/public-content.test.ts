import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

import { toPublicImage } from "@/lib/public/images";

const root = join(__dirname, "..");
const scanned = ["app", "components", "lib", "scripts"];
const extensions = /\.(ts|tsx|mts|json|css|md)$/;
const emoji = /(?![\u00a9\u00ae\u2122])\p{Extended_Pictographic}|\u{FE0F}/u;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return extensions.test(name) ? [path] : [];
  });
}

describe("public content", () => {
  it("ships no emoji in source, dictionaries or styles", () => {
    const offenders = scanned
      .flatMap((dir) => files(join(root, dir)))
      .flatMap((path) =>
        readFileSync(path, "utf8")
          .split("\n")
          .flatMap((line, index) =>
            emoji.test(line) ? [`${relative(root, path)}:${index + 1}`] : [],
          ),
      );
    expect(offenders).toEqual([]);
  });

  it("does not treat legal marks as emoji", () => {
    expect(emoji.test("\u00a9 2026 CEWM")).toBe(false);
    expect(emoji.test("Ofis \u{1F4BC}")).toBe(true);
  });

  it("builds image props with a locale alt and a fallback", () => {
    const row = {
      key: "wp/a.jpg",
      width: 1600,
      height: 1200,
      alt: { az: "Masa", en: "Desk" },
      lqip: null,
    };
    expect(toPublicImage(row, "en", "x")).toMatchObject({ src: "/media/wp/a.jpg", alt: "Desk" });
    expect(toPublicImage(row, "ru", "x")?.alt).toBe("x");
    expect(toPublicImage(row, "ru", "")?.alt).toBe("Masa");
    expect(toPublicImage({ ...row, alt: null }, "az", "Fallback")?.alt).toBe("Fallback");
    expect(toPublicImage({ ...row, width: null }, "az", "x")).toBeNull();
  });
});
