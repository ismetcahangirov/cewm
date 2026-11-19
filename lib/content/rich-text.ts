export type RichTextMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

export type RichTextNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: RichTextNode[];
  marks?: RichTextMark[];
  text?: string;
};

export type RichTextDoc = {
  type: "doc";
  content?: RichTextNode[];
};

export function isEmptyRichText(doc: RichTextDoc | null | undefined): boolean {
  if (!doc?.content?.length) return true;
  return doc.content.every(
    (node) => node.type === "paragraph" && !node.content?.some((child) => child.text?.trim()),
  );
}

const blockTypes = new Set([
  "paragraph",
  "heading",
  "listItem",
  "blockquote",
  "tableCell",
  "tableHeader",
]);

export function richTextToPlain(doc: RichTextDoc | null | undefined): string {
  const parts: string[] = [];
  const walk = (nodes: RichTextNode[] | undefined) => {
    for (const node of nodes ?? []) {
      if (node.text) parts.push(node.text);
      else if (node.type === "hardBreak") parts.push(" ");
      walk(node.content);
      if (blockTypes.has(node.type)) parts.push(" ");
    }
  };
  walk(doc?.content);
  return parts.join("").replace(/\s+/g, " ").trim();
}

export function pickRichText(
  field: { az: RichTextDoc; ru?: RichTextDoc | null; en?: RichTextDoc | null } | null | undefined,
  locale: "az" | "ru" | "en",
): RichTextDoc | null {
  if (!field) return null;
  const value = field[locale];
  if (value && !isEmptyRichText(value)) return value;
  return isEmptyRichText(field.az) ? null : field.az;
}

export function summarize(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,.;:–-]+$/, "")}…`;
}
