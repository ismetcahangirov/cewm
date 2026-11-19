import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

import { StackScale } from "@/components/motion/stack-scale";
import type { PublicImage } from "@/lib/public/images";

export type StackCategory = {
  id: string;
  name: string;
  summary: string | null;
  href: string;
  image: PublicImage | null;
  tags: string[];
};

const singleLineLimit = 14;

function wordLines(name: string): string[] {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length < 2 || name.length <= singleLineLimit) return [name];
  let best = [name];
  let bestLongest = Number.POSITIVE_INFINITY;
  for (let index = 1; index < words.length; index += 1) {
    const lines = [words.slice(0, index).join(" "), words.slice(index).join(" ")];
    const longest = Math.max(...lines.map((line) => line.length));
    if (longest < bestLongest) {
      bestLongest = longest;
      best = lines;
    }
  }
  return best;
}

export function CategoryStack({ items, label }: { items: StackCategory[]; label: string }) {
  return (
    <StackScale>
      <ol data-stack="" aria-label={label} className="stack">
        {items.map((item, index) => {
          const lines = wordLines(item.name);
          return (
            <li
              key={item.id}
              data-stack-card=""
              className="stack-card"
              style={{ "--i": index } as CSSProperties}
            >
              <div className="stack-text">
                <span
                  aria-hidden="true"
                  className="stack-word"
                  style={
                    {
                      "--chars": Math.max(...lines.map((line) => line.length)),
                      "--lines": lines.length,
                    } as CSSProperties
                  }
                >
                  {lines.map((line) => (
                    <span key={line} className="stack-word-line">
                      {line}
                    </span>
                  ))}
                </span>
                <div className="stack-body">
                  <span className="stack-index text-label tabular text-cyan">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-safe text-h3 text-white">
                    <Link href={item.href} className="stack-link">
                      {item.name}
                    </Link>
                  </h3>
                  {item.summary ? (
                    <p className="text-on-navy-muted max-w-xl text-base">{item.summary}</p>
                  ) : null}
                  {item.tags.length ? (
                    <ul className="flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <li
                          key={tag}
                          className="tabular rounded-full border border-white/40 px-3 py-1 text-small text-white"
                        >
                          {tag}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
              <div className="stack-photo">
                {item.image ? (
                  <Image
                    src={item.image.src}
                    alt={item.image.alt}
                    fill
                    sizes="(min-width: 768px) 1500px, 150vw"
                    className="object-cover"
                  />
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </StackScale>
  );
}
