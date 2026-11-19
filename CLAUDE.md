# Contributing to Mebline

Mebline (mebline.az) is an office furniture company in Azerbaijan. This
repository replaces the old WordPress + WooCommerce site with a Next.js
application: a public catalogue (no cart, no checkout; sales go through the
"Təklif al" quote request) and a full admin panel.

Rules for anyone, human or agent, working in this repository. They are not
suggestions. A change that violates them is rejected in review even if the code
is otherwise correct.

---

## 1. Stack

| Layer        | Choice                                                                       |
| ------------ | ---------------------------------------------------------------------------- |
| Framework    | Next.js (App Router, latest stable), TypeScript strict                       |
| Styling      | Tailwind CSS v4, tokens from the `mebline-design` skill                      |
| UI kit       | shadcn/ui (admin), Iconsax Bold (public site), lucide-react (admin)          |
| State / data | Redux Toolkit + RTK Query (admin panel, client-side forms and filters)       |
| Database     | PostgreSQL + Drizzle ORM, migrations in `drizzle/`                           |
| Auth         | Better Auth (email + password, admin roles)                                  |
| Media        | S3-compatible object storage (Hetzner), served through `next/image`          |
| i18n         | `az` (default, no prefix), `ru`, `en`, translatable fields stored per locale |
| Validation   | zod, shared between server actions, route handlers and forms                 |
| Hosting      | Docker (`output: "standalone"`) on Coolify, Hetzner server                   |

Public pages are Server Components that read the database directly, so HTML
arrives complete for search engines. RTK Query is for the admin panel and for
interactive client pieces (quote form, filters). Do not fetch public page data
through RTK Query.

---

## 2. Git workflow

**Every task follows this sequence. No exceptions.**

```bash
# 1. Start from an up-to-date main. Always.
git checkout main
git pull origin main

# 2. Branch. Never commit to main directly.
git checkout -b <type>/<short-description>

# 3. Work, committing in logical units.

# 4. Push and open a pull request.
git push -u origin <branch>
gh pr create --base main --title "..." --body-file <file>

# 5. Add labels. Every pull request carries a type, an area and a priority.

# 6. Merge only when CI is green.
```

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

Good: `feat/admin-product-crud`, `fix/mega-menu-overflow`
Bad: `new-stuff`, `ismet-branch`, `fix2`, `patch-1`

### Commits

Conventional Commits, in English:

```
<type>(<scope>): <subject in the imperative>

<body: what changed and why, wrapped at 72 columns>
```

- **English only** in commits, pull requests, code and documentation. User
  facing copy is Azerbaijani (plus `ru` and `en` translations)
- Imperative subject: "add", not "added" or "adds"; no period at the end
- Explain **why** in the body. What changed is visible in the diff
- Never use `--no-verify`. If a hook fails, fix the cause

### Pull requests

Every pull request must:

1. Link its issue: `Closes #123`, or `Part of #123` for partial work
2. Carry a `type:`, at least one `area:` and a `priority:` label
3. Pass CI
4. Describe what was verified, with the commands that were run, and
   screenshots at 390 px and 1440 px for any UI change

State what you did **not** do, and why. A pull request that hides a gap is
worse than one that names it.

### Merging

- Merge only when CI is green. A red pipeline is never merged, never bypassed
- Squash merge, so `main` stays readable
- Delete the branch after merge, and remove the local worktree
- If CI fails, fix the cause. Do not disable the check or skip the test

`CI complete` is the only required check. It always runs, waits for the other
jobs and fails if any job that had work to do did not succeed. A job that should
block a merge goes into `ci-complete`'s `needs` **and** into the list its script
checks.

---

## 3. Design

- Read `.claude/skills/mebline-design/SKILL.md` before touching any UI, public
  site or admin. It is the single source of truth for colour, type, spacing,
  radius, motion and components
- Never invent a colour, font size, radius, shadow or duration. Everything
  exists as a token in `app/globals.css` (`@theme`)
- Calm, neutral tones. The product photography carries the colour
- **No emojis anywhere**: not in UI, copy, alt text, commits or seed data. Use
  Iconsax Bold icons on the public site (inline SVG components in
  `components/icons/`, brand marks included) and lucide-react in the admin
- **No AI slop**: no gradient blobs, glassmorphism (the home hero arrows are
  the owner's one exception), glowing borders, generic
  hero + three feature cards, filler copy ("Elevate your workspace"), stock
  "trusted by" rows without real logos, or decorative animation that carries no
  information
- No floating WhatsApp button and no chat widget (JivoSite was removed at the
  owner's request). The only floating element is the round contact button that
  links to the contact page. WhatsApp appears as an icon link in the contact
  block and footer
- Perfect at every width from 360 px to 1920 px: no horizontal scroll, touch
  targets at least 44 px, images never stretched

---

## 4. Code standards

- TypeScript strict, no `any`, no `@ts-ignore`
- No explanatory comments. Names carry the meaning; a comment is allowed only
  for a non-obvious constraint (a workaround, a legal requirement)
- Server Components by default; `"use client"` only where interaction needs it
- Every mutation validates input with zod on the server, whatever the client
  already checked. Admin routes and actions check the session and role
- Every translatable field has `az` required, `ru` and `en` optional with `az`
  as fallback
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
code. Lighthouse's simulated LCP counts every script that loads before the
largest paint, so on a local build that floor alone keeps LCP near 3 s. The
numbers above are for a local production build; the live site is measured
with PageSpeed Insights after deploy, where the target is LCP under 2.5 s.

Animations run on the compositor only (`transform`, `opacity`) and respect
`prefers-reduced-motion`.

Every public page has: unique title and description per locale, canonical,
`hreflang` alternates, Open Graph image, JSON-LD where it applies
(`Organization`, `Product`, `BreadcrumbList`). Every legacy WordPress URL has a
301 to its new address (`lib/legacy-redirects`).

---

## 5. Commands

Node 24 and pnpm (version pinned in `package.json`). First run:

```bash
cp .env.example .env
docker compose up -d          # Postgres 17, RustFS (S3) and Mailpit for local work
pnpm install
pnpm db:migrate
pnpm auth:owner --email you@example.com --name "Your Name"   # prints a set-password link
pnpm dev                      # http://localhost:3000/admin
```

| Command                        | What it does                                                 |
| ------------------------------ | ------------------------------------------------------------ |
| `pnpm dev`                     | Development server (Turbopack)                               |
| `pnpm build`                   | Production build, `output: "standalone"`                     |
| `pnpm start`                   | Runs `.next/standalone/server.js` after a build              |
| `pnpm lint`                    | ESLint, zero warnings allowed                                |
| `pnpm typecheck`               | Generates route types, then `tsc --noEmit`                   |
| `pnpm format` / `format:check` | Prettier (with the Tailwind class sorter)                    |
| `pnpm test`                    | Vitest; needs the database and Mailpit from docker compose   |
| `pnpm db:generate`             | Generates a SQL migration in `drizzle/` from `lib/db/schema` |
| `pnpm db:migrate`              | Applies pending migrations to `DATABASE_URL`                 |
| `pnpm db:seed`                 | Seeds the database                                           |
| `pnpm db:studio`               | Drizzle Studio                                               |
| `pnpm migrate:wp`              | Imports the WordPress site (read-only), writes `reports/`    |
| `pnpm check:redirects`         | Old sitemap URLs must 301 to a 200 page on `--base <url>`    |
| `pnpm auth:owner`              | Creates or promotes an owner and prints a set-password link  |
| `pnpm storage:cors [origin]`   | Lets the browser upload to the bucket from the app origin    |
| `docker build -t mebline .`    | Production image; `GET /api/health` answers 200              |

Where things live: `app/[locale]` is the public site (root layout per locale,
`az` served without a prefix by `proxy.ts`), `app/admin` is the admin panel
(own root layout, the only place the Redux store is mounted), `lib/i18n`
holds locales, dictionaries and `pickLocale`, `lib/db` the Drizzle client and
schema, `lib/api` the RTK Query `baseApi`, `lib/env.ts` and `lib/env.server.ts`
the validated environment.

Admin: `lib/auth` is Better Auth (roles `owner` and `editor`, no public sign
up). `proxy.ts` turns away requests to `/admin/*` and `/api/admin/*` without a
session cookie; every admin page calls `requireAdminUser()` and every route
handler under `app/api/admin` is wrapped in `adminRoute()` (pass
`{ role: "owner" }` for owner-only work). `tests/admin-access.test.ts` imports
every `app/api/admin/**/route.ts` and fails if one answers an anonymous or
forged request with anything but 401. Shared admin building blocks live in
`components/admin` (data table, form fields, confirm dialog, image picker,
locale tabs); the sidebar entries are in `lib/admin/navigation.ts`.

Cache Components is on (`cacheComponents: true`). Public pages read the
database inside `"use cache"` functions, and every component that does starts
with `await connection()` so the build never touches the database. The public
layout (`app/[locale]/layout.tsx`) sets `export const instant = false`: public
pages render in one pass at request time, without a static shell or
`<Suspense>` around the page content, so the HTML arrives complete (no
streamed reveal delaying the largest paint, real 404 status codes). Admin and
any other segment that keeps a static shell must put cookies, headers and
uncached reads inside `<Suspense>`.

Admin mutations call `revalidatePublic()` from `lib/cache/revalidate.ts`, which
expires the tags in `lib/cache/tags.ts` (`catalog` for products, categories and
media alt text). Every cached public read must call `cacheTag()` with the
matching tag, or edits in the admin will not reach the site. Media uploads go
straight from the browser to the bucket through a presigned URL, so the bucket
needs a CORS rule for the app origin (`pnpm storage:cors`).

Legacy WordPress URLs live in the `redirects` table (admin: `/admin/redirects`).
`proxy.ts` answers them with one hop from an in-memory map
(`lib/redirects/legacy.ts`, refreshed every 60 s and right after an admin
change, no redirects rather than an error when the database is down), and it
also removes trailing slashes (`skipTrailingSlashRedirect` is on). Paths with a
dot only get the legacy lookup and are never rewritten to `/az`.

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

- Read the `mebline-design` skill before any UI work
- Never commit to `main`
- Never claim something works without running it. "Build passes" means you ran
  the build and saw it pass; "responsive" means you looked at 360, 768, 1024 and
  1440 px screenshots
- Report what failed as plainly as what succeeded
- Never touch the live WordPress site or its database except to read
- When a rule here conflicts with a habit, the rule wins
