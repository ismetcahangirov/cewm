import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { button } from "@/components/site/button";
import { PageHeading } from "@/components/site/page-heading";
import { localePath } from "@/lib/i18n/config";
import { fill } from "@/lib/i18n/format";
import { getRequestDictionary } from "@/lib/i18n/server";
import { formatPostDate, getPostPage, postsPerPage } from "@/lib/public/content";
import { parsePageParam } from "@/lib/public/listing";
import { staticPaths } from "@/lib/public/slug";
import { routes } from "@/lib/routes";
import { pageMetadata, paginatedPaths } from "@/lib/seo/metadata";

export async function generateMetadata({
  searchParams,
}: PageProps<"/[locale]/bloq">): Promise<Metadata> {
  const [query, { locale, dict }] = await Promise.all([searchParams, getRequestDictionary()]);
  const page = parsePageParam(query.page);
  return pageMetadata({
    locale,
    title: dict.blog.title,
    description: dict.blog.description,
    paths: paginatedPaths(staticPaths(routes.blog()), page),
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
        title={dict.blog.title}
        breadcrumbLabel={dict.common.breadcrumb}
        breadcrumbs={[
          { label: dict.common.home, href: localePath(locale) },
          { label: dict.blog.title, href: path },
        ]}
      />
      <div className="container-page py-section">
        {items.length ? (
          <>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((post) => (
                <li key={post.id} className="flex flex-col border border-line">
                  {post.image ? (
                    <Image
                      src={post.image.src}
                      alt={post.image.alt}
                      width={post.image.width}
                      height={post.image.height}
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="aspect-video w-full object-cover"
                    />
                  ) : null}
                  <div className="flex flex-col gap-2 p-4">
                    <time dateTime={post.publishedAt} className="text-meta text-muted">
                      {formatPostDate(post.publishedAt, locale)}
                    </time>
                    <Link
                      href={post.href}
                      className="text-card font-semibold text-navy hover:text-cyan"
                    >
                      {post.title}
                    </Link>
                    {post.excerpt ? <p className="text-small">{post.excerpt}</p> : null}
                  </div>
                </li>
              ))}
            </ul>
            {items.length < total ? (
              <div className="mt-8 flex flex-col items-start gap-2">
                <p className="text-meta text-muted">
                  {fill(dict.blog.shown, { shown: items.length, total })}
                </p>
                <Link href={`${path}?page=${page + 1}`} className={button()}>
                  {dict.blog.loadMore}
                </Link>
              </div>
            ) : null}
          </>
        ) : (
          <p>{dict.blog.empty}</p>
        )}
      </div>
    </>
  );
}
