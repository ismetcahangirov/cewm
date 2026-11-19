import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { ArrowDownIcon } from "@/components/icons/iconsax";
import { button } from "@/components/site/button";
import { EmptyState } from "@/components/site/empty-state";
import { PageHeading } from "@/components/site/page-heading";
import { localePath } from "@/lib/i18n/config";
import { fill } from "@/lib/i18n/format";
import { getRequestDictionary } from "@/lib/i18n/server";
import { formatPostDate, getPostPage, postsPerPage } from "@/lib/public/content";
import { parsePageParam } from "@/lib/public/listing";
import { staticPaths } from "@/lib/public/slug";
import { routes } from "@/lib/routes";
import { blogIndexable } from "@/lib/seo/corpus";
import { pageMetadata, paginatedPaths } from "@/lib/seo/metadata";

export const instant = false;

export async function generateMetadata({
  searchParams,
}: PageProps<"/[locale]/bloq">): Promise<Metadata> {
  await connection();
  const [query, { locale, dict }] = await Promise.all([searchParams, getRequestDictionary()]);
  const page = parsePageParam(query.page);
  return pageMetadata({
    locale,
    title: dict.blog.title,
    description: dict.blog.description,
    paths: paginatedPaths(staticPaths(routes.blog()), page),
    og: { kind: "blog" },
    noIndex: !(await blogIndexable(locale)),
  });
}

export default async function BlogPage({ searchParams }: PageProps<"/[locale]/bloq">) {
  await connection();
  const [query, { locale, dict }] = await Promise.all([searchParams, getRequestDictionary()]);
  const page = parsePageParam(query.page);
  const { items, total } = await getPostPage(locale, page);
  if (page > 1 && (page - 1) * postsPerPage >= total) notFound();
  const path = localePath(locale, routes.blog());

  return (
    <>
      <PageHeading
        eyebrow={dict.home.postsEyebrow}
        title={dict.blog.title}
        lead={<p>{dict.blog.description}</p>}
        breadcrumbLabel={dict.common.breadcrumb}
        breadcrumbs={[
          { label: dict.common.home, href: localePath(locale) },
          { label: dict.blog.title, href: path },
        ]}
      />
      <div className="container-page pb-section">
        {items.length ? (
          <>
            <ul
              data-reveal-group=""
              className="gap-x-column grid gap-y-14 border-t border-line pt-12 sm:grid-cols-2 lg:grid-cols-3"
            >
              {items.map((post) => (
                <li key={post.id} data-reveal="">
                  <article className="group/card relative flex h-full flex-col">
                    {post.image ? (
                      <div className="bg-mist relative aspect-video overflow-clip">
                        <Image
                          src={post.image.src}
                          alt={post.image.alt}
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="machine-card-photo object-cover"
                        />
                      </div>
                    ) : null}
                    <time
                      dateTime={post.publishedAt}
                      className="text-label text-grey tabular mt-5 uppercase"
                    >
                      {formatPostDate(post.publishedAt, locale)}
                    </time>
                    <h2 className="text-safe mt-2 text-h4">
                      <Link
                        href={post.href}
                        className="decoration-1 underline-offset-4 group-hover/card:underline after:absolute after:inset-0"
                      >
                        {post.title}
                      </Link>
                    </h2>
                    {post.excerpt ? (
                      <p className="text-ink-muted mt-3 line-clamp-3 text-small">{post.excerpt}</p>
                    ) : null}
                  </article>
                </li>
              ))}
            </ul>
            <div className="mt-16 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              {items.length < total ? (
                <Link
                  href={`${path}?page=${page + 1}`}
                  scroll={false}
                  className={button({ variant: "outline" })}
                >
                  {dict.blog.loadMore}
                  <ArrowDownIcon size={20} />
                </Link>
              ) : null}
              <p className="text-grey tabular text-small">
                {fill(dict.blog.shown, { shown: items.length, total })}
              </p>
            </div>
          </>
        ) : (
          <EmptyState
            title={dict.blog.empty}
            body={dict.blog.emptyBody}
            actions={[
              { label: dict.common.allProducts, href: localePath(locale, routes.catalogue()) },
            ]}
          />
        )}
      </div>
    </>
  );
}
