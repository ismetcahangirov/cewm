import type { CSSProperties, ElementType, ReactNode } from "react";

import { cx } from "@/lib/cx";

type TagProps = {
  as?: ElementType;
  id?: string;
  className?: string;
  style?: CSSProperties;
};

function words(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

export function Reveal({
  as: Tag = "div",
  group = false,
  children,
  ...props
}: TagProps & { group?: boolean; children: ReactNode }) {
  return (
    <Tag {...(group ? { "data-reveal-group": "" } : { "data-reveal": "" })} {...props}>
      {children}
    </Tag>
  );
}

export function LineReveal({ as: Tag = "h2", text, ...props }: TagProps & { text: string }) {
  const parts = words(text);
  return (
    <Tag data-line-reveal="" {...props}>
      {parts.map((word, index) => (
        <span key={index}>
          <span className="lr-w">
            <span className="lr-i">{word}</span>
          </span>
          {index < parts.length - 1 ? " " : null}
        </span>
      ))}
    </Tag>
  );
}

export function WordReveal({
  as: Tag = "p",
  text,
  className,
  style,
  ...props
}: TagProps & { text: string }) {
  const parts = words(text);
  return (
    <Tag
      data-word-reveal=""
      className={cx(className)}
      style={{ ...style, "--n": parts.length } as CSSProperties}
      {...props}
    >
      {parts.map((word, index) => (
        <span key={index}>
          <span className="wr" style={{ "--i": index } as CSSProperties}>
            {word}
          </span>
          {index < parts.length - 1 ? " " : null}
        </span>
      ))}
    </Tag>
  );
}
