import {
  isEmptyRichText,
  pickRichText,
  type RichTextDoc,
  type RichTextNode,
} from "@/lib/content/rich-text";
import { localePath, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { pickLocale } from "@/lib/i18n/localized";
import { routes } from "@/lib/routes";

import {
  categoryFactBlock,
  companyFactBlock,
  companyName,
  factBlockMarkdown,
  factLabels,
  productFactBlock,
  productSpecFacts,
} from "./facts";
import {
  hasLocale,
  localizedText,
  summaryText,
  type Corpus,
  type CorpusCategory,
  type CorpusPage,
  type CorpusPost,
  type CorpusProduct,
} from "./model";

function inline(nodes: RichTextNode[] | undefined): string {
  return (nodes ?? [])
    .map((node) => {
      if (node.type === "hardBreak") return "  \n";
      if (node.type === "image") return String(node.attrs?.alt ?? "");
      let text = node.text ?? inline(node.content);
      if (!text.trim()) return text;
      for (const mark of node.marks ?? []) {
        if (mark.type === "bold") text = `**${text}**`;
        else if (mark.type === "italic") text = `*${text}*`;
        else if (mark.type === "code") text = `\`${text}\``;
        else if (mark.type === "link" && typeof mark.attrs?.href === "string") {
          text = `[${text}](${mark.attrs.href})`;
        }
      }
      return text;
    })
    .join("");
}

function block(node: RichTextNode, depth: number, ordered = false, index = 0): string[] {
  const children = node.content ?? [];
  switch (node.type) {
    case "paragraph": {
      const text = inline(children).trim();
      return text ? [text, ""] : [];
    }
    case "heading": {
      const level = Math.min(6, Math.max(1, Number(node.attrs?.level ?? 2)) + 2);
      return [`${"#".repeat(level)} ${inline(children).trim()}`, ""];
    }
    case "bulletList":
    case "orderedList":
      return [
        ...children.flatMap((item, itemIndex) =>
          block(item, depth, node.type === "orderedList", itemIndex),
        ),
        ...(depth === 0 ? [""] : []),
      ];
    case "listItem": {
      const [first, ...rest] = children;
      const marker = ordered ? `${index + 1}.` : "-";
      const head = first ? inline(first.content).trim() : "";
      const nested = rest.flatMap((child) => block(child, depth + 1).filter(Boolean));
      return [`${"  ".repeat(depth)}${marker} ${head}`, ...nested];
    }
    case "blockquote":
      return [
        ...children
          .flatMap((child) => block(child, depth))
          .filter(Boolean)
          .map((line) => `> ${line}`),
        "",
      ];
    case "horizontalRule":
      return ["---", ""];
    case "codeBlock":
      return ["```", inline(children), "```", ""];
    case "table": {
      const rows = children.map((row) =>
        (row.content ?? []).map((cell) =>
          inline(cell.content?.flatMap((p) => p.content ?? [])).trim(),
        ),
      );
      if (!rows.length) return [];
      const width = Math.max(...rows.map((row) => row.length));
      const pad = (row: string[]) => [...row, ...Array(width - row.length).fill("")];
      const [head = [], ...body] = rows;
      return [
        `| ${pad(head).join(" | ")} |`,
        `| ${Array(width).fill("---").join(" | ")} |`,
        ...body.map((row) => `| ${pad(row).join(" | ")} |`),
        "",
      ];
    }
    default:
      return children.flatMap((child) => block(child, depth));
  }
}

export function richTextToMarkdown(doc: RichTextDoc | null | undefined): string {
  if (isEmptyRichText(doc)) return "";
  return (doc?.content ?? [])
    .flatMap((node) => block(node, 0))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function pickMarkdown(field: Parameters<typeof pickRichText>[0], locale: Locale): string {
  return richTextToMarkdown(pickRichText(field, locale));
}

type Context = { corpus: Corpus; locale: Locale; dict: Dictionary; siteUrl: string };

function url(context: Context, route: string): string {
  return new URL(localePath(context.locale, route), context.siteUrl).toString();
}

export function productUrl(context: Context, product: CorpusProduct): string {
  return url(context, routes.product(pickLocale(product.slug, context.locale)));
}

export function categoryUrl(context: Context, category: CorpusCategory): string {
  return url(context, routes.category(pickLocale(category.slug, context.locale)));
}

export function pageUrl(context: Context, page: CorpusPage): string {
  return url(context, routes.page(pickLocale(page.slug, context.locale)));
}

export function postUrl(context: Context, post: CorpusPost): string {
  return url(context, routes.post(pickLocale(post.slug, context.locale)));
}

export function productMarkdown(
  context: Context,
  product: CorpusProduct,
  options: { level?: number } = {},
): string {
  const { corpus, locale, dict } = context;
  const level = options.level ?? 1;
  const h = (extra: number) => "#".repeat(Math.min(6, level + extra));
  const facts = productFactBlock(corpus, product, locale, dict);
  const specs = productSpecFacts(product, locale);
  const benefits = product.benefits
    .map((benefit) => localizedText(benefit, locale))
    .filter(Boolean);
  const body = pickMarkdown(product.description, locale);
  const lines = [
    `${h(0)} ${localizedText(product.name, locale)}`,
    "",
    `URL: ${productUrl(context, product)}`,
    "",
  ];
  lines.push(factBlockMarkdown(facts), "");
  if (body) lines.push(body, "");
  if (benefits.length) {
    lines.push(`${h(1)} ${dict.product.benefits}`, "", ...benefits.map((item) => `- ${item}`), "");
  }
  if (specs.length) {
    lines.push(
      `${h(1)} ${dict.product.specs}`,
      "",
      `| ${dict.product.parameter} | ${dict.product.value} |`,
      "| --- | --- |",
      ...specs.map((spec) => `| ${spec.label} | ${spec.value} |`),
      "",
    );
  }
  if (product.documents.length) {
    lines.push(
      `${h(1)} ${dict.product.documents}`,
      "",
      ...product.documents.map(
        (document) =>
          `- [${localizedText(document.title, locale)}](${new URL(routes.media(document.key), context.siteUrl).toString()})`,
      ),
      "",
    );
  }
  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function categoryMarkdown(
  context: Context,
  category: CorpusCategory,
  options: { level?: number; listMachines?: boolean } = {},
): string {
  const { corpus, locale, dict } = context;
  const level = options.level ?? 1;
  const heading = "#".repeat(Math.min(6, level));
  const facts = categoryFactBlock(corpus, category, locale, dict);
  const body = pickMarkdown(category.description, locale);
  const lines = [
    `${heading} ${localizedText(category.name, locale)}`,
    "",
    `URL: ${categoryUrl(context, category)}`,
    "",
    factBlockMarkdown(facts),
    "",
  ];
  if (body) lines.push(body, "");
  if (options.listMachines !== false) {
    const members = corpus.products.filter(
      (product) => product.categoryIds.includes(category.id) && hasLocale(product.name, locale),
    );
    if (members.length) {
      lines.push(
        `${"#".repeat(Math.min(6, level + 1))} ${factLabels[locale].machines}`,
        "",
        ...members.map(
          (product) =>
            `- [${localizedText(product.name, locale)}](${productUrl(context, product)})`,
        ),
        "",
      );
    }
  }
  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function pageMarkdown(
  context: Context,
  page: CorpusPage,
  options: { level?: number } = {},
): string {
  const heading = "#".repeat(Math.min(6, options.level ?? 1));
  const body = pickMarkdown(page.content, context.locale);
  const lines = [
    `${heading} ${localizedText(page.title, context.locale)}`,
    "",
    `URL: ${pageUrl(context, page)}`,
    "",
  ];
  if (page.kind === "contact") {
    const company = companyFactBlock(context.corpus, context.locale, context.dict);
    lines.push(...company.facts.map((fact) => `- ${fact.label}: ${fact.value}`), "");
  }
  if (body) lines.push(body, "");
  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function postMarkdown(
  context: Context,
  post: CorpusPost,
  options: { level?: number } = {},
): string {
  const heading = "#".repeat(Math.min(6, options.level ?? 1));
  const body = pickMarkdown(post.content, context.locale);
  const lines = [
    `${heading} ${localizedText(post.title, context.locale)}`,
    "",
    `URL: ${postUrl(context, post)}`,
    `${context.dict.blog.title}: ${post.publishedAt.slice(0, 10)}`,
    "",
  ];
  const excerpt = localizedText(post.excerpt, context.locale);
  if (excerpt) lines.push(excerpt, "");
  if (body) lines.push(body, "");
  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function homeMarkdown(context: Context): string {
  const { corpus, locale, dict } = context;
  const company = companyFactBlock(corpus, locale, dict);
  const lines = [
    `# ${companyName(corpus)}`,
    "",
    `URL: ${url(context, routes.home())}`,
    "",
    factBlockMarkdown(company),
    "",
  ];
  const roots = corpus.categories.filter(
    (category) => !category.parentId && hasLocale(category.name, locale),
  );
  if (roots.length) {
    lines.push(
      `## ${dict.catalog.categories}`,
      "",
      ...roots.map((category) => {
        const summary = summaryText(category.description, null, locale, 140);
        const link = `[${localizedText(category.name, locale)}](${categoryUrl(context, category)})`;
        return summary ? `- ${link}: ${summary}` : `- ${link}`;
      }),
      "",
    );
  }
  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
