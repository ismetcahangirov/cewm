import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { sql } from "drizzle-orm";
import { format, resolveConfig } from "prettier";

import { describeRevalidation, requestPublicRevalidation } from "../../lib/cache/remote-revalidate";
import { getDb } from "../../lib/db";
import { locales, type Locale } from "../../lib/i18n/config";
import { loadCrawl } from "./crawl";
import { buildPlan } from "./plan";
import { persist, type Counter } from "./persist";
import { renderReport, type DbFacts } from "./report";
import { resolveRedirects } from "./redirects";

const tables = [
  "products",
  "categories",
  "product_categories",
  "product_images",
  "product_documents",
  "brands",
  "media",
  "pages",
  "client_logos",
  "contact_persons",
  "settings",
  "redirects",
];

async function collectFacts(
  ids: Map<string, string>,
  mediaKeys: Map<string, string>,
): Promise<DbFacts> {
  const db = getDb();
  const tableCounts: Record<string, number> = {};
  for (const table of tables) {
    const [row] = await db.execute<{ count: string }>(
      sql`select count(*)::text as count from ${sql.identifier(table)}`,
    );
    tableCounts[table] = Number(row?.count ?? 0);
  }
  const [mediaStats] = await db.execute<{
    images: string;
    documents: string;
    all_alts: string;
    az: string;
    ru: string;
    en: string;
    de: string;
  }>(sql`select
    count(*) filter (where mime_type like 'image/%')::text as images,
    count(*) filter (where mime_type = 'application/pdf')::text as documents,
    count(*) filter (where coalesce(alt->>'az','') <> '' and coalesce(alt->>'ru','') <> '' and coalesce(alt->>'en','') <> '' and coalesce(alt->>'de','') <> '')::text as all_alts,
    count(*) filter (where coalesce(alt->>'az','') <> '')::text as az,
    count(*) filter (where coalesce(alt->>'ru','') <> '')::text as ru,
    count(*) filter (where coalesce(alt->>'en','') <> '')::text as en,
    count(*) filter (where coalesce(alt->>'de','') <> '')::text as de
    from media where mime_type like 'image/%'`);
  const [documentStats] = await db.execute<{ documents: string }>(
    sql`select count(*)::text as documents from media where mime_type = 'application/pdf'`,
  );
  return {
    tableCounts,
    mediaRows: Number(tableCounts.media),
    mediaWithAllAlts: Number(mediaStats?.all_alts ?? 0),
    mediaAltPerLocale: Object.fromEntries(
      locales.map((locale) => [locale, Number(mediaStats?.[locale] ?? 0)]),
    ) as Record<Locale, number>,
    documentRows: Number(documentStats?.documents ?? 0),
    ids,
    mediaKeys,
  };
}

function describe(name: string, value: Counter): string {
  return `${name.padEnd(10)} created ${value.created}, adopted ${value.adopted}, updated ${value.updated}, unchanged ${value.unchanged}`;
}

export async function main(argv: string[]): Promise<void> {
  const { values } = parseArgs({
    args: argv,
    options: {
      from: { type: "string" },
      "dry-run": { type: "boolean", default: false },
      update: { type: "boolean", default: false },
      "skip-documents": { type: "boolean", default: false },
      report: { type: "string", default: "reports/import-report.md" },
    },
  });
  if (!values.from) {
    console.error(
      "Usage: pnpm migrate:wp --from <crawl folder> [--dry-run] [--update] [--skip-documents] [--report <file>]",
    );
    process.exit(1);
  }

  const crawl = loadCrawl(path.resolve(values.from));
  const plan = buildPlan(crawl);
  const resolution = resolveRedirects(crawl.redirectPaths, plan);
  if (resolution.unresolved.length) {
    for (const item of resolution.unresolved)
      console.error(`unresolved ${item.path}: ${item.reason}`);
    throw new Error(`${resolution.unresolved.length} old addresses have no target`);
  }

  const flagCounts: Record<string, number> = {};
  for (const flag of plan.flags) flagCounts[flag.kind] = (flagCounts[flag.kind] ?? 0) + 1;
  console.log(
    `plan: ${plan.products.length} products, ${plan.categories.length} categories, ${plan.brands.length} brands, ${plan.pages.length} pages, ${plan.persons.length} persons, ${plan.clients.length} client logos, ${plan.media.size} media files, ${resolution.entries.length} redirects`,
  );
  console.log(`flags: ${JSON.stringify(flagCounts)}`);

  if (values["dry-run"]) {
    console.log("dry run: nothing was written");
    return;
  }

  const result = await persist(plan, resolution.entries, {
    update: values.update ?? false,
    skipDocuments: values["skip-documents"] ?? false,
    log: (line) => console.log(line),
  });
  for (const [name, counter] of Object.entries(result.summary))
    console.log(describe(name, counter));
  console.log(describeRevalidation(await requestPublicRevalidation()));

  for (const url of result.failedDocuments) {
    for (const product of plan.products.filter((item) =>
      item.documents.some((doc) => doc.url === url),
    )) {
      plan.flags.push({
        kind: "dead-link",
        entity: {
          type: "product",
          key: product.legacyKey,
          label: product.name.az ?? product.legacyKey,
        },
        field: "documents",
        detail: `brochure could not be downloaded, not attached: ${url}`,
      });
    }
  }
  const facts = await collectFacts(result.ids, result.mediaKeys);
  const database = new URL(process.env.DATABASE_URL ?? "postgres://local/db").pathname.slice(1);
  const meta = (crawl.content as unknown as { meta?: { crawled_at?: string } }).meta;
  const report = renderReport(plan, resolution, facts, {
    crawledAt: meta?.crawled_at?.slice(0, 10) ?? "unknown date",
    database,
  });
  const target = path.resolve(values.report);
  mkdirSync(path.dirname(target), { recursive: true });
  const options = (await resolveConfig(target)) ?? {};
  writeFileSync(target, await format(report, { ...options, parser: "markdown" }), "utf8");
  console.log(`report written to ${target}`);
}
