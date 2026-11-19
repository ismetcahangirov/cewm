import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { JsonLdScript } from "@/components/site/json-ld";
import { PageHeading } from "@/components/site/page-heading";
import { RichText } from "@/components/site/rich-text";
import { richTextToPlain, summarize } from "@/lib/content/rich-text";
import { env } from "@/lib/env";
import { localePath } from "@/lib/i18n/config";
import { getRequestDictionary } from "@/lib/i18n/server";
import { formatPostDate, getPostBySlug, getRelatedPosts } from "@/lib/public/content";
import { getSiteSettings } from "@/lib/public/settings";
import { localizedPaths, redirectToCanonicalSlug } from "@/lib/public/slug";
import { routes } from "@/lib/routes";
import { blogPostingJsonLd } from "@/lib/seo/json-ld";
import { entityInfo } from "@/lib/seo/corpus";
import { pageMetadata } from "@/lib/seo/metadata";
import { markdownHref } from "@/lib/seo/rewrites";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/bloq/[slug]">): Promise<Metadata> {
  await connection();
  const [{ slug }, { locale, dict }] = await Promise.all([params, getRequestDictionary()]);
  const post = await getPostBySlug(locale, slug);
  if (!post) notFound();
  redirectToCanonicalSlug(post.slug, locale, slug, routes.post);
  const info = await entityInfo("post", post.id);
  return pageMetadata({
    locale,
    title: post.seoTitle ?? post.title,
    absoluteTitle: Boolean(post.seoTitle),
    description:
      post.seoDescription ??
      post.excerpt ??
      (summarize(richTextToPlain(post.content)) || dict.blog.description),
    paths: localizedPaths(post.slug, routes.post),
    availableLocales: info.locales,
    og: { kind: "post", slug },
    markdownPath: markdownHref(localePath(locale, routes.post(slug))),
    type: "article",
    publishedTime: post.publishedAt,
    modifiedTime: info.updatedAt,
  });
}

export default async function PostPage({ params }: PageProps<"/[locale]/bloq/[slug]">) {
  await connection();
  const [{ slug }, { locale, dict }] = await Promise.all([params, getRequestDictionary()]);
  const post = await getPostBySlug(locale, slug);
  if (!post) notFound();
  redirectToCanonicalSlug(post.slug, locale, slug, routes.post);
  const [related, info, settings] = await Promise.all([
    getRelatedPosts(locale, post.id),
    entityInfo("post", post.id),
    getSiteSettings(),
  ]);

  return (
    <>
      <PageHeading
        title={post.title}
        breadcrumbLabel={dict.common.breadcrumb}
        breadcrumbs={[
          { label: dict.common.home, href: localePath(locale) },
          { label: dict.blog.title, href: localePath(locale, routes.blog()) },
          { label: post.title, href: post.href },
        ]}
      >
        <time dateTime={post.publishedAt} className="text-ink-muted mt-2 block text-small">
          {formatPostDate(post.publishedAt, locale)}
        </time>
      </PageHeading>
      <article className="container-page py-section">
        {post.image ? (
          <Image
            src={post.image.src}
            alt={post.image.alt}
            width={post.image.width}
            height={post.image.height}
            sizes="(min-width: 768px) 48rem, 100vw"
            priority
            className="mb-10 h-auto w-full max-w-3xl"
          />
        ) : null}
        <RichText doc={post.content} className="rich-text max-w-3xl" />
      </article>
      {related.length ? (
        <section aria-labelledby="related-posts" className="container-page pb-section">
          <h2 id="related-posts" className="text-h3">
            {dict.blog.related}
          </h2>
          <ul className="mt-4 flex flex-col gap-2">
            {related.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="text-navy underline decoration-cyan underline-offset-4"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <JsonLdScript
        data={blogPostingJsonLd({
          headline: post.title,
          description: post.seoDescription ?? post.excerpt,
          url: post.href,
          image: post.image?.src ?? null,
          datePublished: post.publishedAt,
          dateModified: info.updatedAt,
          logo: (settings.logoLight ?? settings.logoDark)?.src ?? null,
          locale,
          siteUrl: env.NEXT_PUBLIC_SITE_URL,
          publisherName: dict.meta.siteName,
        })}
      />
    </>
  );
}
