import { locales, type Locale } from "../../lib/i18n/config";
import type { EntityRef, Flag, FlagKind, Plan } from "./plan-types";
import type { RedirectResolution } from "./redirects";

export type DbFacts = {
  tableCounts: Record<string, number>;
  mediaRows: number;
  mediaWithAllAlts: number;
  mediaAltPerLocale: Record<Locale, number>;
  documentRows: number;
  ids: Map<string, string>;
  mediaKeys: Map<string, string>;
};

const kindTitles: Record<FlagKind, string> = {
  "missing-translation": "Missing translations",
  "wrong-language": "Text in the wrong language (not imported)",
  "mixed-script": "Corrupted text mixing two alphabets (not imported)",
  "low-resolution": "Low-resolution photos (kept)",
  "dead-link": "Dead external links (skipped)",
  "missing-image": "Images missing on the old site (skipped)",
  "spec-mismatch": "Spec rows that differ between languages",
  "gallery-mismatch": "Galleries that differ between languages",
  "benefit-mismatch": "Benefits that differ between languages",
  derived: "Derived values",
  "duplicate-dropped": "Duplicates dropped",
  "corrupted-heading": "Corrupted headings in the source",
  placeholder: "Placeholders to replace",
  cleaned: "Cleaned while importing",
  "not-imported": "Not imported",
};

const kindOrder: FlagKind[] = [
  "missing-translation",
  "wrong-language",
  "mixed-script",
  "spec-mismatch",
  "benefit-mismatch",
  "gallery-mismatch",
  "low-resolution",
  "missing-image",
  "dead-link",
  "placeholder",
  "duplicate-dropped",
  "corrupted-heading",
  "derived",
  "cleaned",
  "not-imported",
];

function adminPath(entity: EntityRef, facts: DbFacts | null): string {
  const id = facts?.ids.get(entity.key);
  switch (entity.type) {
    case "product":
      return id ? `/admin/products/${id}` : "/admin/products";
    case "category":
      return id ? `/admin/categories/${id}` : "/admin/categories";
    case "page":
      return id ? `/admin/pages/${id}` : "/admin/pages";
    case "brand":
      return "/admin/brands";
    case "client":
      return "/admin/clients";
    case "person":
      return "/admin/contacts";
    case "settings":
      return "/admin/settings";
    case "home":
      return "/admin/home-sections";
    case "media":
      return "/admin/media";
    case "redirect":
      return "/admin/redirects";
  }
}

function cell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}

function table(header: string[], rows: string[][]): string[] {
  return [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`),
    "",
  ];
}

function filled(values: Record<Locale, unknown>[]): Record<Locale, number> {
  const counts = { az: 0, ru: 0, en: 0, de: 0 };
  for (const value of values) for (const locale of locales) if (value[locale]) counts[locale] += 1;
  return counts;
}

function localeRow(label: string, total: number, counts: Record<Locale, number>): string[] {
  return [label, String(total), ...locales.map((locale) => String(counts[locale]))];
}

export function renderReport(
  plan: Plan,
  redirects: RedirectResolution,
  facts: DbFacts | null,
  source: { crawledAt: string; database: string },
): string {
  const out: string[] = [];
  out.push("# WordPress import report", "");
  out.push(
    `Source: crawl of the old WordPress site taken ${source.crawledAt}. Written by \`pnpm migrate:wp\`; the same input always gives the same report. Admin links are relative to the admin origin and depend on the database named below (rerun the importer on another database to get its links).`,
    "",
    `Database: ${source.database}`,
    "",
  );

  out.push("## 1. Imported content per language", "");
  out.push(
    ...table(
      ["Type", "Records", ...locales.map((locale) => `Filled ${locale}`)],
      [
        localeRow(
          "Products (name)",
          plan.products.length,
          filled(plan.products.map((p) => p.name)),
        ),
        localeRow(
          "Products (short description)",
          plan.products.length,
          filled(plan.products.map((p) => p.shortDescription)),
        ),
        localeRow(
          "Products (description)",
          plan.products.length,
          filled(plan.products.map((p) => p.description)),
        ),
        localeRow(
          "Products (at least one benefit)",
          plan.products.length,
          filled(
            plan.products.map((p) =>
              Object.fromEntries(locales.map((l) => [l, p.benefits.some((row) => row[l])])),
            ) as Record<Locale, unknown>[],
          ),
        ),
        localeRow(
          "Products (at least one spec row)",
          plan.products.length,
          filled(
            plan.products.map((p) =>
              Object.fromEntries(locales.map((l) => [l, p.specs.some((row) => row.value[l])])),
            ) as Record<Locale, unknown>[],
          ),
        ),
        localeRow(
          "Categories (name)",
          plan.categories.length,
          filled(plan.categories.map((c) => c.name)),
        ),
        localeRow(
          "Categories (description)",
          plan.categories.length,
          filled(plan.categories.map((c) => c.description)),
        ),
        localeRow("Pages (title)", plan.pages.length, filled(plan.pages.map((p) => p.title))),
        localeRow("Pages (content)", plan.pages.length, filled(plan.pages.map((p) => p.content))),
        localeRow(
          "Brands (description)",
          plan.brands.length,
          filled(plan.brands.map((b) => b.description)),
        ),
        localeRow(
          "Contact persons (name)",
          plan.persons.length,
          filled(plan.persons.map((p) => p.name)),
        ),
        localeRow("Home (hero headline, 1 record)", 1, filled([plan.home.heroHeadline])),
      ],
    ),
  );
  out.push(
    `Other imported records: ${plan.clients.length} client logos, ${plan.settings.phones.length} phone numbers, ${plan.media.size} media files, ${plan.products.reduce((sum, p) => sum + p.documents.length, 0)} product document links, ${redirects.entries.length} redirects.`,
    "",
  );

  if (facts) {
    out.push("## 2. Rows in the database after the import", "");
    out.push(
      ...table(
        ["Table", "Rows"],
        Object.entries(facts.tableCounts).map(([name, count]) => [name, String(count)]),
      ),
    );
    out.push(
      `Media: ${facts.mediaRows} rows, one per distinct file (${plan.media.size} images and ${facts.documentRows} PDF brochures); ${facts.mediaWithAllAlts} of the images carry alt text in all four languages. Alt texts per language: ${locales.map((l) => `${l} ${facts.mediaAltPerLocale[l]}`).join(", ")}. Alt text comes from the old gallery captions; images without a caption use the product or category name as the Azerbaijani alt text.`,
      "",
    );
  }

  out.push("## 3. Things the owner must fix or decide", "");
  out.push(
    "Each row names the record, the language, what is missing or wrong, and the admin page where it is fixed.",
    "",
  );
  const grouped = new Map<FlagKind, Flag[]>();
  for (const flag of plan.flags) {
    if (!grouped.has(flag.kind)) grouped.set(flag.kind, []);
    grouped.get(flag.kind)?.push(flag);
  }
  for (const kind of kindOrder) {
    const flags = grouped.get(kind);
    if (!flags?.length) continue;
    out.push(`### ${kindTitles[kind]} (${flags.length})`, "");
    out.push(
      ...table(
        ["Record", "Language", "Field", "Detail", "Admin"],
        flags.map((flag) => [
          flag.entity.label,
          flag.locale ?? "",
          flag.field ?? "",
          flag.detail,
          adminPath(flag.entity, facts),
        ]),
      ),
    );
  }

  out.push("## 4. Slugs, old to new", "");
  out.push(
    "A category slug is kept when the old one was clean (the Russian ones); every other slug was derived from the name, because the old slugs carried a language suffix or were Cyrillic. The old addresses redirect to the new ones (section 6).",
    "",
  );
  out.push(
    ...table(
      ["Type", "Record", ...locales.map((locale) => `${locale}: old -> new`)],
      [
        ...plan.categories.map((c) => [
          "category",
          c.name.az ?? c.key,
          ...locales.map((l) => `${c.oldSlug[l] ?? "-"} -> ${c.slug[l] ?? "-"}`),
        ]),
        ...plan.products.map((p) => [
          "product",
          p.name.az ?? p.group,
          ...locales.map((l) => `${p.oldSlug[l] ?? "-"} -> ${p.slug[l] ?? "-"}`),
        ]),
      ],
    ),
  );

  out.push("## 5. Notes", "");
  for (const note of plan.notes) out.push(`- ${note}`);
  out.push("");

  out.push("## 6. Redirects", "");
  out.push(
    `${redirects.entries.length} old addresses get a 301 (the table also answers the same address with a trailing slash). Old Russian addresses without a language prefix go to \`/ru/...\`, Azerbaijani ones lose the old \`/az\` prefix.`,
    "",
  );
  if (redirects.served.length) {
    out.push("Not redirected:", "");
    for (const item of redirects.served) out.push(`- \`${item.path}\`: ${item.reason}`);
    out.push("");
  }
  out.push(
    ...table(
      ["Old address", "New address", "Rule"],
      redirects.entries.map((entry) => [
        `\`${entry.fromPath}\``,
        `\`${entry.toPath}\``,
        entry.reason,
      ]),
    ),
  );
  return `${out.join("\n")}\n`;
}
