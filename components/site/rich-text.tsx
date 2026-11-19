import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import type { RichTextDoc, RichTextMark, RichTextNode } from "@/lib/content/rich-text";
import { cx } from "@/lib/cx";

type Options = {
  imageSizes: string;
  headingOffset: number;
  imageAlt: string;
  headingIds: boolean;
};

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function isInternal(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

function withMarks(content: ReactNode, marks: RichTextMark[] | undefined, key: string): ReactNode {
  return (marks ?? []).reduce<ReactNode>((child, mark, index) => {
    const markKey = `${key}-m${index}`;
    switch (mark.type) {
      case "bold":
        return <strong key={markKey}>{child}</strong>;
      case "italic":
        return <em key={markKey}>{child}</em>;
      case "link": {
        const href = text(mark.attrs?.href);
        if (!href) return child;
        if (isInternal(href)) {
          return (
            <Link key={markKey} href={href}>
              {child}
            </Link>
          );
        }
        return (
          <a key={markKey} href={href} target="_blank" rel="noopener noreferrer">
            {child}
          </a>
        );
      }
      default:
        return child;
    }
  }, content);
}

function renderImage(node: RichTextNode, key: string, options: Options): ReactNode {
  const src = text(node.attrs?.src);
  if (!src) return null;
  const caption = text(node.attrs?.title);
  const alt = text(node.attrs?.alt) ?? caption ?? options.imageAlt;
  const width = number(node.attrs?.width);
  const height = number(node.attrs?.height);
  return (
    <figure key={key}>
      {width && height ? (
        <Image src={src} alt={alt} width={width} height={height} sizes={options.imageSizes} />
      ) : (
        <span className="relative block aspect-video">
          <Image src={src} alt={alt} fill sizes={options.imageSizes} className="object-contain" />
        </span>
      )}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

function renderNodes(
  nodes: RichTextNode[] | undefined,
  key: string,
  options: Options,
): ReactNode[] {
  return (nodes ?? []).map((node, index) => renderNode(node, `${key}-${index}`, options));
}

function renderNode(node: RichTextNode, key: string, options: Options): ReactNode {
  const children = () => renderNodes(node.content, key, options);
  switch (node.type) {
    case "text":
      return withMarks(node.text ?? "", node.marks, key);
    case "hardBreak":
      return <br key={key} />;
    case "paragraph":
      return node.content?.length ? <p key={key}>{children()}</p> : null;
    case "heading": {
      const level = Math.min(
        6,
        Math.max(2, (number(node.attrs?.level) ?? 2) + options.headingOffset),
      );
      const Tag = `h${level}` as "h2" | "h3" | "h4" | "h5" | "h6";
      const id = options.headingIds && level === 2 ? headingId(key) : undefined;
      return (
        <Tag key={key} id={id}>
          {children()}
        </Tag>
      );
    }
    case "bulletList":
      return <ul key={key}>{children()}</ul>;
    case "orderedList":
      return <ol key={key}>{children()}</ol>;
    case "listItem":
      return <li key={key}>{children()}</li>;
    case "blockquote":
      return <blockquote key={key}>{children()}</blockquote>;
    case "horizontalRule":
      return <hr key={key} />;
    case "image":
      return renderImage(node, key, options);
    case "table":
      return (
        <div key={key} className="rich-table">
          <table>
            <tbody>{children()}</tbody>
          </table>
        </div>
      );
    case "tableRow":
      return <tr key={key}>{children()}</tr>;
    case "tableHeader":
      return (
        <th key={key} scope="col">
          {children()}
        </th>
      );
    case "tableCell":
      return <td key={key}>{children()}</td>;
    default:
      return node.content ? <span key={key}>{children()}</span> : null;
  }
}

function headingId(key: string): string {
  return `section-${key.slice(2)}`;
}

function plainText(node: RichTextNode): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(plainText).join("");
}

export function richTextHeadings(
  doc: RichTextDoc | null | undefined,
  headingOffset = 0,
): { id: string; text: string }[] {
  return (doc?.content ?? []).flatMap((node, index) => {
    if (node.type !== "heading") return [];
    const level = Math.max(2, (number(node.attrs?.level) ?? 2) + headingOffset);
    const text = plainText(node).trim();
    return level === 2 && text ? [{ id: headingId(`n-${index}`), text }] : [];
  });
}

export function RichText({
  doc,
  className,
  imageSizes = "(min-width: 768px) 48rem, 100vw",
  headingOffset = 0,
  imageAlt = "",
  headingIds = false,
}: {
  doc: RichTextDoc | null | undefined;
  className?: string;
  imageSizes?: string;
  headingOffset?: number;
  imageAlt?: string;
  headingIds?: boolean;
}) {
  if (!doc?.content?.length) return null;
  return (
    <div className={cx("rich-text", className)}>
      {renderNodes(doc.content, "n", { imageSizes, headingOffset, imageAlt, headingIds })}
    </div>
  );
}
