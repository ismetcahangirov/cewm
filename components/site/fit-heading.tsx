import type { CSSProperties } from "react";

import { cx } from "@/lib/cx";

import { ModelText } from "./model-text";

const sizes = {
  h1: { className: "text-h1", fit: "var(--text-h1)" },
  h2: { className: "text-h2", fit: "var(--text-h2)" },
  h3: { className: "text-h3", fit: "var(--text-h3)" },
} as const;

export function longestWord(text: string): number {
  return Math.max(1, ...text.split(/\s+/).map((word) => [...word].length));
}

export function FitHeading({
  as: Tag = "h1",
  text,
  size = "h1",
  id,
  className,
  lang,
}: {
  as?: "h1" | "h2" | "h3";
  text: string;
  size?: keyof typeof sizes;
  id?: string;
  className?: string;
  lang?: string;
}) {
  return (
    <div className="fit-box">
      <Tag
        id={id}
        lang={lang}
        className={cx("fit-title", sizes[size].className, className)}
        style={{ "--fit": sizes[size].fit, "--longest": longestWord(text) } as CSSProperties}
      >
        <ModelText text={text} />
      </Tag>
    </div>
  );
}
