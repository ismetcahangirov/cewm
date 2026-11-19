# SEO and GEO launch checklist

For the day cewm.az switches from WordPress to this application. Owner-only steps
(accounts, listings) are marked **Owner**. Everything else is already in the code.

## 1. Before the switch

1. Set `NEXT_PUBLIC_SITE_URL=https://cewm.az` in the Coolify build arguments. Canonical URLs,
   hreflang, sitemap, Open Graph images, JSON-LD and the `llms` files all use it, and the value is
   baked into the build.
2. Run the checks against the staging build, not only locally:

   ```bash
   pnpm check:seo --base https://<staging-host>
   pnpm check:redirects --base https://<staging-host> --from <crawl folder>
   ```

   `check:seo` exits 1 on a missing or duplicate title or description, a missing canonical, a
   hreflang set that is not reciprocal, a broken or redirecting internal link, JSON-LD that does not
   parse or lacks a required property, an image without `alt`, more than one `h1`, an indexable page
   that is missing from `sitemap.xml`, or a sitemap address that does not answer 200. It also fetches
   every Open Graph image and every Markdown alternate.

3. Admin, Settings (owner only), block "Search engines and artificial intelligence":
   - switch **Show the site to search engines** on (while it is off, `robots.txt` disallows
     everything and every page sends `noindex`; keep it off on staging);
   - confirm the AI assistants policy (section 5);
   - paste the three verification codes once you have them (section 3).
4. Check `https://cewm.az/robots.txt`: it must name `https://cewm.az/sitemap.xml` and must not
   contain `Disallow: /` under `User-agent: *`.
5. Fill the admin SEO fields (title and description per language) for the home page, each category
   and each machine where the imported text is weak. The code pads short descriptions and clamps
   long ones, but it cannot write better copy than the owner.

## 2. Change of the default language from Russian to Azerbaijani

The old site served Russian at `/`. The new site serves Azerbaijani at `/` and Russian at `/ru`.

- Every old address has one 301 to its new address (`pnpm check:redirects`, 535 addresses). The old
  Russian home `/` is now the Azerbaijani home; the Russian home is `/ru`.
- Expect a re-ranking period of several weeks. Russian-language queries (including Yandex, which is
  strong in Russian-speaking markets) move from `/` to `/ru` pages, and the page that ranked at `/`
  must be re-learned at `/ru`. The 301s pass most of the signals, but the transfer is not instant.
- `hreflang` links all four versions and sets `x-default` to the Azerbaijani page, so Google and Yandex
  can show Russian users the Russian page. Do not remove the alternates while the transition runs.
- Keep every redirect row for at least 12 months. Never delete one to "clean up" the table.
- Do not change slugs during the first weeks. Each slug change creates one more redirect hop and one
  more thing to re-learn.
- A language without a translation is not indexed as a separate page: its canonical points to the
  Azerbaijani page and it is left out of `hreflang` and the sitemap. Translating the page in the admin
  moves it into all three automatically.

## 3. Search engine accounts (Owner)

Create each property for the **domain** `cewm.az` where the service allows it, so `www`, `http` and
subdomains are covered.

| Service               | What to do                                                                                                                                                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Google Search Console | Add the property, choose "HTML tag", copy the `content` value into Settings, "Google Search Console code", save, then press Verify. Submit `https://cewm.az/sitemap.xml` under Sitemaps.                                            |
| Yandex Webmaster      | Add `https://cewm.az`, choose the meta tag method, copy the `content` value into "Yandex Webmaster code", save, verify. Add the sitemap under Indexing, Sitemap files. Set the regional target (Azerbaijan) under Site information. |
| Bing Webmaster Tools  | Add the site (or import it from Search Console), copy the `msvalidate.01` value into "Bing Webmaster Tools code", save, verify, submit the sitemap.                                                                                 |

The tags are rendered in the `<head>` of every public page by the root layout. DNS TXT verification is
also fine and does not need the admin fields.

IndexNow (Bing, Yandex and other participants; Google does not use it): in Settings, enter an IndexNow
key of 8 to 128 letters, digits or hyphens. The key file is then served at `/<key>.txt`. After each
publish the application sends the changed addresses (new, edited or removed) to `api.indexnow.org`. With
no key, on a non-public host, or while indexing is switched off, nothing is sent. After a restart the
first publish only reports pages edited within the last 15 minutes. Register the same key in Bing
Webmaster Tools if you want to see the submissions.

## 4. After the switch

1. Day 0: request indexing of `/`, `/ru`, `/en`, `/de` in Search Console; use "Re-crawl" in Yandex
   Webmaster for the same pages. Open `https://cewm.az/llms.txt` and `https://cewm.az/llms-full.txt`.
2. Day 1 to 14, daily: Search Console "Pages" report (404, "Page with redirect", "Duplicate without
   user-selected canonical"), Yandex "Indexing, Page status", Bing "Site Explorer". A 404 for an old
   WordPress address means a missing row in the admin Redirects table; add it, one hop to the final page.
3. Check the Coolify access logs for 404 and 5xx responses on the first day.
4. Week 2 to 8, weekly: impressions and average position per language in Search Console. A temporary
   drop on Russian queries is expected (section 2); a drop that does not recover after eight weeks is a
   reason to look at redirects, canonicals and content, not at robots rules.
5. Run `pnpm check:seo --base https://cewm.az` after every release that touches pages or content types.
6. PageSpeed Insights on `/`, one category and one machine: the targets in `CLAUDE.md` apply to the
   live site (LCP under 2.5 s).

## 5. AI crawlers: policy and how to change it

Settings, "AI assistants" has three values. The default is **Open**.

| Value                  | Answer engines and user-triggered fetchers | Training crawlers |
| ---------------------- | ------------------------------------------ | ----------------- |
| Open (default)         | allowed                                    | allowed           |
| Answering systems only | allowed                                    | blocked           |
| Everything blocked     | blocked                                    | blocked           |

- Answer engines and user fetchers: `OAI-SearchBot`, `ChatGPT-User`, `Claude-SearchBot`,
  `Claude-User`, `PerplexityBot`, `Perplexity-User`, `Applebot`, `DuckAssistBot`, `MistralAI-User`,
  `meta-externalfetcher`. Google (AI Overviews, AI Mode) and Bing (Copilot) answer from their normal
  search indexes, so they follow the `*` rules and the search-indexing switch, not this list.
- Training crawlers: `GPTBot`, `ClaudeBot`, `Google-Extended`, `Applebot-Extended`,
  `meta-externalagent`, `CCBot`, `Bytespider`, `Amazonbot`, `cohere-ai`.
- Why open: the owner wants visibility, and the content is public marketing material. Training
  access is how models learn the brand name and the HOMAG partner relation without browsing. Switch to
  "Answering systems only" if the owner prefers not to contribute to model training; search and answer
  visibility is unaffected.
- Some fetchers act for a person and may ignore `robots.txt` (`ChatGPT-User`, `Perplexity-User`,
  `meta-externalfetcher`). The setting cannot stop them, and the content they read is public anyway.
- Every group repeats the `Disallow` lines for `/admin`, `/api` and `/md/`, because a crawler that
  matches its own group ignores the `*` group.

Sources checked on 2026-11-19: OpenAI bots, https://developers.openai.com/api/docs/bots ; Anthropic,
https://support.claude.com/en/articles/8896518 ; Perplexity, https://docs.perplexity.ai/guides/bots ;
Apple, https://support.apple.com/en-us/119829 ; Meta,
https://developers.facebook.com/docs/sharing/webmasters/web-crawlers/ . `Google-Extended` is a
`robots.txt` token and not a separate user agent (secondary sources; Google's page could not be
retrieved). `DuckAssistBot`, `MistralAI-User`, `CCBot`, `Bytespider`, `Amazonbot` and `cohere-ai` are
published tokens that were not re-verified at the vendor in this pass. Review the lists twice a year.

## 6. Generative engine files

- `/llms.txt` and `/llms-full.txt` (Azerbaijani), `/ru/llms.txt`, `/en/llms.txt`, `/de/llms.txt` and the
  matching `llms-full.txt`: generated from the database, so an admin edit shows within an hour at most.
  Format: https://llmstxt.org/ (H1, blockquote summary, detail list, H2 link lists, `Optional`).
- Clean Markdown of each page at the same address plus `.md` (`/mehsul/<slug>.md`, `/ru/index.md`),
  announced in the page head as `<link rel="alternate" type="text/markdown">`. These carry `noindex`
  so they do not compete with the HTML page in search.
- The `Link: </llms.txt>; rel="describedby"` header is sent on every public page.
- Answer-first fact blocks come from `lib/seo/facts.ts`; render them with
  `components/seo/fact-block.tsx` (`FactBlockView`).

## 7. Business listings and entity consistency (Owner)

Search and answer engines trust a name, address and phone that match everywhere. The site, the JSON-LD
and the `llms` files use CEWM as the name, "HOMAG Azerbaijan" as the alternate name, and the address
and phones from Settings. Use the same strings in:

- Google Business Profile, Bing Places, Yandex Business (Yandex Maps), Apple Business Connect;
- Instagram, Facebook, LinkedIn, YouTube, TikTok profiles: add each one under Settings, Social
  networks, and it appears in `sameAs`;
- the partner pages on homag.com and on the other brands' sites, where CEWM is listed.

Do not add review or rating markup until real, verifiable reviews exist. The Product markup carries no
price, because the catalogue has none: add an `Offer` only when a real price is published.
