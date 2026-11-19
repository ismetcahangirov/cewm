import { generateJSON } from "@tiptap/html/server";
import { parse, type HTMLElement } from "node-html-parser";

import { richTextExtensions } from "../../lib/content/extensions";
import {
  isEmptyRichText,
  richTextToPlain,
  type RichTextDoc,
  type RichTextNode,
} from "../../lib/content/rich-text";
import { cleanText } from "./text";

const junkSelectors = ["style", "script", "noscript", "form", "iframe", "svg", "object", "embed"];

const allowedTags = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "a",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "h4",
  "blockquote",
  "hr",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
]);

const safeHref = /^(https?:\/\/|mailto:|tel:|\/)/i;

export function sanitizeHtml(html: string): HTMLElement {
  const root = parse(html, { comment: false });
  for (const selector of junkSelectors) {
    for (const node of root.querySelectorAll(selector)) node.remove();
  }
  for (const node of root.querySelectorAll("*")) {
    const tag = node.tagName.toLowerCase();
    if (tag === "img") {
      node.remove();
      continue;
    }
    if (!allowedTags.has(tag)) {
      node.replaceWith(...node.childNodes);
      continue;
    }
    const href = node.getAttribute("href");
    for (const name of Object.keys(node.attributes)) node.removeAttribute(name);
    if (tag === "a" && href && safeHref.test(href.trim())) node.setAttribute("href", href.trim());
    else if (tag === "a") node.replaceWith(...node.childNodes);
  }
  return root;
}

export function htmlToRichText(html: string): RichTextDoc | null {
  const normalized = sanitizeHtml(html).toString().replace(/­/g, "").replace(/ /g, " ");
  const doc = generateJSON(normalized, richTextExtensions) as RichTextDoc;
  return isEmptyRichText(doc) ? null : doc;
}

export function paragraphDoc(text: string | null | undefined): RichTextDoc | null {
  const value = cleanText(text);
  return value
    ? { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: value }] }] }
    : null;
}

export function plainTextOf(doc: RichTextDoc | null | undefined): string {
  return richTextToPlain(doc);
}

export function htmlPlain(html: string): string {
  return cleanText(parse(html.replace(/<br\s*\/?>/gi, " ").replace(/<\/p>/gi, " </p>")).text)
    .replace(/\s+/g, " ")
    .trim();
}

export type DescriptionClean = {
  html: string;
  removedFragments: string[];
  removedLead: boolean;
};

function paragraphs(html: string): string[] {
  return parse(html)
    .querySelectorAll("p")
    .map((node) => node.outerHTML);
}

export function cleanDescription(
  html: string,
  options: { leadToRemove?: string | null } = {},
): DescriptionClean {
  const list = paragraphs(html);
  const removedFragments: string[] = [];
  const wrapped = /^\s*\(([^()]{3,90})\)\s*$/;
  const last = list.at(-1);
  if (last && list.length > 1) {
    const text = htmlPlain(last);
    const match = wrapped.exec(text);
    if (match) {
      removedFragments.push(text);
      list.pop();
      const previous = list.at(-1);
      if (previous) {
        const suffix = new RegExp(`\\s*\\(${escapeRegex(match[1])}\\)\\s*(?=</p>)`);
        list[list.length - 1] = previous.replace(suffix, "");
      }
    }
  }
  let removedLead = false;
  if (options.leadToRemove && list.length > 1) {
    const first = htmlPlain(list[0]);
    if (first === cleanText(options.leadToRemove)) {
      list.shift();
      removedLead = true;
    }
  }
  return { html: list.join("\n"), removedFragments, removedLead };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function leadParagraph(html: string): string | null {
  const first = paragraphs(html)[0];
  return first ? htmlPlain(first) || null : null;
}

export function countNodes(doc: RichTextDoc | RichTextNode | null, type: string): number {
  if (!doc) return 0;
  const own = doc.type === type ? 1 : 0;
  return own + (doc.content ?? []).reduce((sum, child) => sum + countNodes(child, type), 0);
}
