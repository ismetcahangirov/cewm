import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { fill } from "@/components/site/catalog/listing-grid";
import { JsonLdScript } from "@/components/site/json-ld";
import { pill } from "@/components/site/pill";
import { PostCard } from "@/components/site/post-card";
import { env } from "@/lib/env";
import { localePath } from "@/lib/i18n/config";
import { getRequestDictionary } from "@/lib/i18n/server";
import { getPostPage, postsPerPage } from "@/lib/public/content";
import { staticPaths } from "@/lib/public/slug";
import { routes } from "@/lib/routes";
import { collectionPageJsonLd } from "@/lib/seo/json-ld";
import { pageMetadata, paginatedPaths, paginatedText } from "@/lib/seo/metadata";

function pageNumber(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 200) : 1;
}

export async function generateMetadata({
  searchParams,
}: PageProps<"/[locale]/bloq">): Promise<Metadata> {
  await connection();
  const [query, { locale, dict }] = await Promise.all([searchParams, getRequestDictionary()]);
  const page = pageNumber(query.page);
  const suffix = fill(dict.catalog.pageSuffix, { page });
  return pageMetadata({
    locale,
    title: paginatedText(dict.content.blog.title, page, suffix),
    description: paginatedText(dict.content.blog.description, page, suffix),
    paths: paginatedPaths(staticPaths(routes.blog()), page),
    eyebrow: dict.seo.eyebrow.blog,
  });
}

async function BlogContent({ searchParams }: Pick<PageProps<"/[locale]/bloq">, "searchParams">) {
  await connection();
  const [query, { locale, dict }] = await Promise.all([searchParams, getRequestDictionary()]);
  const page = pageNumber(query.page);
  const { items, total } = await getPostPage(locale, page);
  const text = dict.content.blog;
  const base = localePath(locale, routes.blog());
  const hasMore = items.length < total && items.length >= page * postsPerPage;

  return (
    <>
      <JsonLdScript
        data={collectionPageJsonLd({
          name: text.title,
          description: text.description,
          url: base,
          locale,
          siteUrl: env.NEXT_PUBLIC_SITE_URL,
          items: items.map((post) => ({ name: post.title, url: post.href })),
        })}
      />
      <div className="container-page pt-15 pb-section">
        <Breadcrumbs
          label={dict.common.breadcrumb}
          items={[{ label: dict.common.home, href: localePath(locale) }, { label: text.title }]}
        />
        <h1 className="mt-2.5 text-h1">{text.title}</h1>
        {items.length > 0 ? (
          <>
            <ul className="mt-10 grid grid-cols-1 gap-x-7.5 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((post) => (
                <li key={post.id}>
                  <PostCard post={post} locale={locale} readLabel={text.read} />
                </li>
              ))}
            </ul>
            {hasMore && (
              <div className="mt-16 flex flex-col items-center gap-4">
                <p className="text-meta text-muted">
                  {text.shown
                    .replace("{shown}", String(items.length))
                    .replace("{total}", String(total))}
                </p>
                <Link href={`${base}?page=${page + 1}`} className={pill({ variant: "outline" })}>
                  {text.loadMore}
                </Link>
              </div>
            )}
          </>
        ) : (
          <p className="mt-10 max-w-3xl text-base text-muted">{text.empty}</p>
        )}
      </div>
    </>
  );
}

export default function BlogPage(props: PageProps<"/[locale]/bloq">) {
  return <BlogContent searchParams={props.searchParams} />;
}
