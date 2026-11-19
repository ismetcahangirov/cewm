import { readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    base: { type: "string", default: "http://localhost:3041" },
    from: { type: "string" },
    concurrency: { type: "string", default: "8" },
  },
});

if (!values.from) {
  console.error("Usage: pnpm check:redirects --base <url> --from <crawl folder>");
  process.exit(1);
}

type OldPath = { path: string; path_encoded?: string; aliases: string[] };

const base = new URL(values.base ?? "http://localhost:3041");
const entries = JSON.parse(
  readFileSync(path.join(values.from, "redirect-paths.json"), "utf8"),
) as OldPath[];

const sources = new Map<string, string>();
for (const entry of entries) {
  for (const raw of [entry.path_encoded ?? encodeURI(entry.path), ...entry.aliases]) {
    const withSlash = raw.endsWith("/") ? raw : `${raw}/`;
    sources.set(withSlash, withSlash);
    if (withSlash !== "/")
      sources.set(withSlash.replace(/\/+$/, ""), withSlash.replace(/\/+$/, ""));
  }
}

type Outcome = { source: string; ok: boolean; detail: string };

async function hop(url: URL): Promise<Response> {
  return fetch(url, { redirect: "manual", headers: { "user-agent": "cewm-redirect-check" } });
}

async function check(source: string): Promise<Outcome> {
  const first = await hop(new URL(source, base));
  if (source === "/") {
    return first.status === 200
      ? { source, ok: true, detail: "200 (the old Russian home is now the Azerbaijani home)" }
      : { source, ok: false, detail: `expected 200, got ${first.status}` };
  }
  if (first.status !== 301) return { source, ok: false, detail: `first response ${first.status}` };
  const location = first.headers.get("location");
  if (!location) return { source, ok: false, detail: "301 without Location" };
  const target = new URL(location, base);
  const second = await hop(new URL(`${target.pathname}${target.search}`, base));
  if (second.status !== 200) {
    return { source, ok: false, detail: `${target.pathname} answered ${second.status}` };
  }
  return { source, ok: true, detail: `301 -> ${target.pathname} 200` };
}

const queue = [...new Set(sources.values())];
const results: Outcome[] = [];
const workers = Array.from({ length: Math.max(1, Number(values.concurrency) || 8) }, async () => {
  for (let source = queue.pop(); source !== undefined; source = queue.pop()) {
    try {
      results.push(await check(source));
    } catch (error) {
      results.push({ source, ok: false, detail: String(error) });
    }
  }
});
await Promise.all(workers);

const failed = results.filter((result) => !result.ok);
for (const result of failed.sort((a, b) => a.source.localeCompare(b.source))) {
  console.log(`FAIL ${result.source}: ${result.detail}`);
}
console.log(
  `${results.length - failed.length} of ${results.length} old addresses answer with one 301 to a 200 page` +
    ` (${entries.length} old paths, each with and without the trailing slash, plus aliases)`,
);
process.exit(failed.length ? 1 : 0);
