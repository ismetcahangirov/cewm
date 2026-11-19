# Contributing to CEWM

CEWM (cewm.az) is the HOMAG woodworking machinery partner in Azerbaijan. Its
customers are furniture and woodworking manufacturers (B2B). This repository
replaces the old WordPress site with a Next.js application: a public catalogue
of machines (no cart, no checkout; sales go through the consultation request)
and a full admin panel that manages every public page and section.

Rules for anyone, human or agent, working in this repository. They are not
suggestions. A change that violates them is rejected in review even if the code
is otherwise correct.

---

## 1. Stack

| Layer        | Choice                                                                                |
| ------------ | ------------------------------------------------------------------------------------- |
| Framework    | Next.js (App Router, latest stable), TypeScript strict; Next.js is also the backend   |
| Styling      | Tailwind CSS v4, tokens in `app/globals.css`, design rules in the `cewm-design` skill |
| UI kit       | shadcn/ui (admin), Iconsax Linear (public site), lucide-react (admin)                 |
| State / data | Redux Toolkit + RTK Query (admin panel, client-side forms and filters)                |
| Database     | PostgreSQL + Drizzle ORM, migrations in `drizzle/`                                    |
| Auth         | Better Auth (email + password, admin roles)                                           |
| Media        | S3-compatible object storage (Hetzner), served through `next/image` and `/media/*`    |
| i18n         | `az` (default, no prefix), `ru`, `en`, `de` on the public site and in the admin       |
| Validation   | zod, shared between route handlers and forms                                          |
| Hosting      | Docker (`output: "standalone"`) on Coolify, Hetzner server                            |

Public pages are Server Components that read the database directly, so HTML
arrives complete for search engines and generative engines. RTK Query is for the
admin panel and for interactive client pieces (consultation form). Do not fetch
public page data through RTK Query.

Content is entered per language; media is not. Every image, video, PDF and hero
film is uploaded once and referenced by every locale. Only alt texts, captions
and document titles are translated.

---

## 2. Git workflow

**Every task follows this sequence. No exceptions.**

```bash
# 1. Start from an up-to-date main, in your own worktree. Never commit to main.
git fetch origin
git worktree add /c/dev/cewm-wt/<name> -b <type>/<short-description> origin/main

# 2. Work, committing in logical units.

# 3. Push and open a pull request.
git push -u origin <branch>
gh pr create --base main --title "..." --body-file <file>

# 4. Add labels. Every pull request carries a type, an area and a priority.

# 5. Merge only when CI is green, then remove the worktree.
```

Do not use `git stash`: the stash is shared by every worktree of the repository.
Verify a push with `git ls-remote origin <branch>` against your local sha.

### Branch naming

`<type>/<kebab-case-description>`, under about fifty characters.

| Type        | Use for                                |
| ----------- | -------------------------------------- |
| `feat/`     | New capability                         |
| `fix/`      | Bug fix                                |
| `chore/`    | Tooling, config, dependencies          |
| `docs/`     | Documentation only                     |
| `refactor/` | Restructuring with no behaviour change |
| `perf/`     | Performance work                       |
| `test/`     | Test coverage                          |

Good: `feat/admin-product-crud`, `fix/hero-film-scrub`
Bad: `new-stuff`, `ismet-branch`, `fix2`, `patch-1`

### Commits

Conventional Commits, in English:

```
<type>(<scope>): <subject in the imperative>

<body: what changed and why, wrapped at 72 columns>
```

- **English only** in commits, pull requests, code and documentation. User
  facing copy is Azerbaijani, plus `ru`, `en` and `de` translations
- Imperative subject: "add", not "added" or "adds"; no period at the end
- Explain **why** in the body. What changed is visible in the diff
- Never use `--no-verify`. If a hook fails, fix the cause
- Long commit or pull request bodies go into a file (`-F file`, `--body-file`),
  never a long heredoc

### Pull requests

Every pull request must:

1. Link its issue: `Closes #123`, or `Part of #123` for partial work
2. Carry a `type:`, at least one `area:` and a `priority:` label
3. Pass CI
4. Describe what was verified, with the commands that were run, and
   screenshots at 360 px and 1440 px for any UI change

State what you did **not** do, and why. A pull request that hides a gap is
worse than one that names it.

### Merging

- Merge only when CI is green. A red pipeline is never merged, never bypassed
- Squash merge (`gh pr merge <n> --squash --delete-branch`), so `main` stays readable
- After the merge, watch the `main` workflow run of the merge commit until it is
  green, then remove the local worktree
- If CI fails, fix the cause. Do not disable the check or skip the test

`CI complete` is the only required check. It always runs, waits for the other
jobs and fails if any job that had work to do did not succeed. A job that should
block a merge goes into `ci-complete`'s `needs` **and** into the list its script
checks.

---

## 3. Design

- Read `.claude/skills/cewm-design/SKILL.md` before touching any UI, public
  site or admin. It is the single source of truth for colour, type, spacing,
  radius, motion and components
- Colours follow the brand: navy `#001941`, cyan `#00b9ff`, light `#f3f6fc`,
  white. Never invent a colour, font size, radius, shadow or duration; every
  value exists as a token in `app/globals.css` (`@theme`)
- Typeface: Inter, self-hosted from `assets/fonts/` with `next/font/local`.
  Never `next/font/google`, never a font CDN
- **No emojis anywhere**: not in UI, copy, alt text, commits, seed data or
  docs. Icons are Iconsax Linear on the public site, as inline SVG components in
  `components/icons/`, and lucide-react in the admin
- **No AI slop**: no gradient blobs, glassmorphism, glowing borders, generic
  hero + three feature cards, filler copy, stock "trusted by" rows without real
  logos, or decorative animation that carries no information. Never invent
  facts, numbers, customers or quotes; unknown values are admin-editable fields
  with honest placeholders in square brackets
- Motion follows the reference film described in the `cewm-design` skill. The
  home hero is a photoreal film scrubbed by scroll (`hero_films`, see section 5)
- Perfect at every width from 360 px to 1920 px: no horizontal scroll, touch
  targets at least 44 px, images never stretched

---

## 4. Code standards

- TypeScript strict, no `any`, no `@ts-ignore`
- No explanatory comments. Names carry the meaning; a comment is allowed only
  for a non-obvious constraint (a workaround, a legal requirement)
- Server Components by default; `"use client"` only where interaction needs it
- Every mutation validates input with zod on the server, whatever the client
  already checked. Admin routes check the session and role
- Every translatable field has `az` required, `ru`, `en` and `de` optional with
  `az` as fallback (`Localized<T>` and `pickLocale` in `lib/i18n/localized.ts`)
- Images go through `next/image` with explicit `sizes`; never ship an
  unoptimised original to the browser

### Performance and SEO budgets

Checked on every UI pull request, on a production build:

| Metric                             | Budget (mobile, Lighthouse) |
| ---------------------------------- | --------------------------- |
| Performance                        | 93 or more                  |
| SEO, Accessibility, Best Practices | 100                         |
| LCP                                | under 3.5 s                 |
| CLS                                | under 0.05                  |
| First-load JS on public pages      | under 160 KB gzip           |

The JS budget is the framework floor (React and the Next.js router ship about
133 KB gzip on every route before any app code) plus at most 25 KB of our own
code; the scroll-driven hero film is loaded on the home page only. The numbers
above are for a local production build; the live site is measured with
PageSpeed Insights after deploy, where the target is LCP under 2.5 s.

Animations run on the compositor only (`transform`, `opacity`) and respect
`prefers-reduced-motion`.

Every public page has: unique title and description per locale, canonical,
`hreflang` alternates for all four locales plus `x-default`, Open Graph image
where one exists, JSON-LD where it applies (`Organization`, `LocalBusiness`,
`Product`, `BreadcrumbList`, `BlogPosting`, `CollectionPage`), and is listed in
`sitemap.xml` and `llms.txt`. Old WordPress URLs get a 301 through the
`redirects` table.

---

## 5. Commands

Node 24 and pnpm (version pinned in `package.json`). Local ports for this
project: Postgres 5452, S3 9020 (console 9021), Mailpit 1045 (web UI 8045), dev
server 3020. First run:

```bash
cp .env.example .env            # then set BETTER_AUTH_SECRET
docker compose up -d            # Postgres 17, RustFS (S3) and Mailpit
pnpm install
pnpm db:migrate
pnpm db:seed                    # brands, HOMAG categories, contacts, settings
pnpm auth:owner --email you@example.com --name "Your Name"   # prints a set-password link
pnpm dev                        # http://localhost:3020/admin
```

| Command                        | What it does                                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------------- |
| `pnpm dev`                     | Development server (Turbopack) on port 3020                                               |
| `pnpm build`                   | Production build, `output: "standalone"`                                                  |
| `pnpm start`                   | Runs `.next/standalone/server.js` (set `PORT=3020`)                                       |
| `pnpm lint`                    | ESLint, zero warnings allowed                                                             |
| `pnpm typecheck`               | Generates route types, then `tsc --noEmit`                                                |
| `pnpm format` / `format:check` | Prettier (with the Tailwind class sorter)                                                 |
| `pnpm test`                    | Vitest; needs the database, storage and Mailpit from compose                              |
| `pnpm db:generate`             | Generates a SQL migration in `drizzle/` from `lib/db/schema`                              |
| `pnpm db:migrate`              | Applies pending migrations to `DATABASE_URL`                                              |
| `pnpm db:seed`                 | Idempotent seed (`lib/db/seed.ts`)                                                        |
| `pnpm db:studio`               | Drizzle Studio                                                                            |
| `pnpm auth:owner`              | Creates or promotes an owner and prints a set-password link                               |
| `pnpm storage:cors [origin]`   | Lets the browser upload to the bucket from the app origin                                 |
| `pnpm migrate:wp --from <dir>` | Imports the WordPress crawl (`--dry-run`, `--update`), writes `reports/import-report.md`  |
| `pnpm check:redirects`         | `--base <url> --from <dir>`: every old address must be one 301 to a 200 page              |
| `pnpm check:seo`               | `--base <url>`: crawls the built site; fails on SEO and GEO defects (see the launch list) |
| `docker build -t cewm .`       | Production image; `GET /api/health` answers 200                                           |

Do not run `pnpm build` while your own `pnpm dev` runs in the same folder: both
use `.next`. Stop your dev server by its PID, never every `node.exe`.

Tests run on an empty, migrated database in CI. A test that needs a settings
row, a menu or another shared record creates it itself. Before pushing a new
test file, run it against a fresh database (`createdb cewm_ci`, migrate, test,
drop).

### Where things live

| Path                              | What                                                                                                                                    |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `app/[locale]`                    | Public site, one root layout per locale; `az` served without a prefix                                                                   |
| `app/[locale]/mehsullar`          | Catalogue and category pages (`/mehsullar`, `/mehsullar/<category>`)                                                                    |
| `app/[locale]/mehsul/[slug]`      | Product (machine) page                                                                                                                  |
| `app/[locale]/kateqoriyalar`      | Category index                                                                                                                          |
| `app/[locale]/bloq`               | Blog list and posts                                                                                                                     |
| `app/[locale]/[slug]`             | CMS pages; `pages.kind` picks a template (contact, consultation, brands, …)                                                             |
| `proxy.ts`                        | Locale routing, admin guard, legacy redirects, trailing slashes                                                                         |
| `app/admin`                       | Admin panel (own root layout, the only place the Redux store is mounted)                                                                |
| `app/api/admin/**`                | Admin route handlers, each wrapped in `adminRoute()`                                                                                    |
| `app/api/consultation-requests`   | Public consultation form endpoint (rate limited, emails the sales inbox)                                                                |
| `components/site`                 | Public components (header, footer, product card, consultation form, rich text)                                                          |
| `components/admin`                | Admin building blocks (see below)                                                                                                       |
| `components/ui`                   | shadcn/ui primitives                                                                                                                    |
| `components/icons`                | Inline SVG icon components for the public site                                                                                          |
| `lib/public/*`                    | Cached public readers (`"use cache"` + `cacheTag`)                                                                                      |
| `lib/admin/*`                     | Server-side admin services (queries and mutations)                                                                                      |
| `lib/validation/*`                | zod schemas and DTO types shared by forms and route handlers                                                                            |
| `lib/api/*`                       | RTK Query endpoints on `baseApi`; `lib/api/server.ts` has `adminRoute`                                                                  |
| `lib/i18n`                        | Locales, `localePath`, `pickLocale`, public dictionaries (`dictionaries/*.json`)                                                        |
| `lib/admin/i18n`                  | Admin interface translations: Azerbaijani text is the key, `ru`/`en`/`de` per module                                                    |
| `lib/db/schema`                   | Drizzle schema; `lib/db/seed.ts` the seed                                                                                               |
| `lib/cache`                       | Cache tags (`tags.ts`) and `revalidatePublic()`                                                                                         |
| `lib/seo`                         | Metadata, JSON-LD, sitemap, robots, `llms` files, Markdown alternates, OG cards, fact blocks, IndexNow (`docs/seo-launch-checklist.md`) |
| `lib/env.ts`, `lib/env.server.ts` | Validated environment                                                                                                                   |

Data model (one table per row): `products` (machines; translatable name, slug,
short description, rich body, `benefits`, `specs` rows of label/value/unit,
brand, SEO, featured flag), `product_categories`, `product_images` (shared
gallery media), `product_documents` (PDF brochures with translated titles),
`product_relations`, `categories` (nested), `brands`, `client_logos`,
`contact_persons`, `posts`, `pages`, `menus`, `menu_items`, `hero_films`,
`settings` (singleton: contacts, socials, SEO defaults, the home `hero` and
`home_sections`), `consultation_requests` and `consultation_request_products`,
`redirects`, `media`, `site_visits` and the Better Auth tables.

Hero films are frame sequences stored once in the bucket under
`hero_films.key_prefix`, named `0001.webp`, `0002.webp`, … (see
`heroFilmFrameKey` in `lib/validation/hero-films.ts`). The home hero record in
`settings.hero` points to one film by id; `getHero()` in `lib/public/home.ts`
returns the frame URL pattern, count, size and poster.

Admin: `lib/auth` is Better Auth (roles `owner` and `editor`, no public sign
up). `proxy.ts` turns away requests to `/admin/*` and `/api/admin/*` without a
session cookie; every admin page calls `requireAdminUser()` and every route
handler under `app/api/admin` is wrapped in `adminRoute()` (pass
`{ role: "owner" }` for owner-only work). `tests/admin-access.test.ts` imports
every `app/api/admin/**/route.ts` and fails if one answers an anonymous or
forged request with anything but 401. Shared admin building blocks live in
`components/admin` (data table, form fields, confirm dialog, image and media
pickers, media upload, locale tabs, rich text editor, sortable lists, SEO
fields); the sidebar entries are in `lib/admin/navigation.ts`. The admin
interface language is the language switch in the header; it is saved per user
(`users.admin_locale`) and also sets the default tab of the language tabs.
Settings, redirects, site texts and users are owner-only (routes, pages and
sidebar). Ready-made public texts (the dictionaries in `lib/i18n/dictionaries`)
are editable per language under Site texts (`settings.text_overrides`, merged in
`getDictionary`). Every
Azerbaijani string in the admin must be a key in `lib/admin/i18n/messages/*`
with `ru`, `en` and `de` values; `tests/admin-i18n-coverage.test.ts` enforces it.

Cache Components is on (`cacheComponents: true`). Public pages read the
database inside `"use cache"` functions, and every component that does starts
with `await connection()` so the build never touches the database. The public
layout (`app/[locale]/layout.tsx`) sets `export const instant = false`: public
pages render in one pass at request time, without a static shell or
`<Suspense>` around the page content, so the HTML arrives complete. Admin and
any other segment that keeps a static shell must put cookies, headers and
uncached reads inside `<Suspense>`.

Admin mutations call `revalidatePublic()` from `lib/cache/revalidate.ts`, which
expires the tags in `lib/cache/tags.ts` (`catalog` for products, categories,
brands and media alt text; `content` for pages, posts, client logos and contact
persons; `menus`; `settings` for settings, home sections and hero films). Every
cached public read must call `cacheTag()` with the matching tag, or edits in
the admin will not reach the site. Media uploads go straight from the browser
to the bucket through a presigned URL, so the bucket needs a CORS rule for the
app origin (`pnpm storage:cors`).

Old URLs live in the `redirects` table (admin: `/admin/redirects`). `proxy.ts`
answers them with one hop from an in-memory map (`lib/redirects/legacy.ts`,
refreshed every 60 s and right after an admin change), and it also removes
trailing slashes. `pnpm migrate:wp` fills the table from a crawl folder kept outside the repository
(`scripts/migrate-wp/`; it reuses the admin services, is idempotent by `legacy_key`,
and needs `NODE_OPTIONS=--use-system-ca` when a local proxy breaks the homag.com
certificate chain). Run it with `--dry-run` first; `--update` overwrites imported
records, the default only creates what is missing.

---

## 6. Working with issues

Work is tracked as one epic with native sub-issues.

- Pick a sub-issue, not the epic
- One sub-issue, one branch, one pull request
- Leftover work found along the way is finished in the same pull request, not
  moved to a follow-up issue
- Issues labelled `status: needs-decision` wait for an answer from the site
  owner. Do not implement around them

---

## 7. For agents

- Read the `cewm-design` skill before any UI work
- Never commit to `main`; work in your own worktree and never touch another
  agent's worktree
- Never claim something works without running it. "Build passes" means you ran
  the build and saw it pass; "responsive" means you looked at 360, 768, 1024 and
  1440 px screenshots
- Report what failed as plainly as what succeeded
- Never touch the live WordPress site or its database except to read
- When a rule here conflicts with a habit, the rule wins

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
