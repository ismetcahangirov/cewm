import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { ArrowLeftIcon } from "@/components/icons/iconsax";
import { RowPreview } from "@/components/motion/row-preview";
import { LineReveal } from "@/components/motion/text";
import { ArticleBody } from "@/components/site/article-body";
import { JsonLdScript } from "@/components/site/json-ld";
import { PageHeading } from "@/components/site/page-heading";
import { richTextToPlain, summarize } from "@/lib/content/rich-text";
import { env } from "@/lib/env";
import { localePath } from "@/lib/i18n/config";
import { getRequestDictionary } from "@/lib/i18n/server";
import { formatPostDate, getPostBySlug, getRelatedPosts } from "@/lib/public/content";
import { getSiteSettings } from "@/lib/public/settings";
import { localizedPaths, redirectToCanonicalSlug } from "@/lib/public/slug";
import { routes } from "@/lib/routes";
import { entityInfo } from "@/lib/seo/corpus";
import { blogPostingJsonLd } from "@/lib/seo/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";
import { markdownHref } from "@/lib/seo/rewrites";

export const instant = false;

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
  const blog = localePath(locale, routes.blog());

  return (
    <>
      <article>
        <PageHeading
          eyebrow={formatPostDate(post.publishedAt, locale)}
          title={post.title}
          lead={post.excerpt ? <p>{post.excerpt}</p> : null}
          breadcrumbLabel={dict.common.breadcrumb}
          breadcrumbs={[
            { label: dict.common.home, href: localePath(locale) },
            { label: dict.blog.title, href: blog },
            { label: post.title, href: post.href },
          ]}
        >
          <time dateTime={post.publishedAt} className="sr-only">
            {formatPostDate(post.publishedAt, locale)}
          </time>
        </PageHeading>
        {post.image ? (
          <div className="container-page">
            <Image
              src={post.image.src}
              alt={post.image.alt}
              width={post.image.width}
              height={post.image.height}
              sizes="(min-width: 1760px) 1664px, calc(100vw - 2.5rem)"
              fetchPriority="high"
              loading="eager"
              className="bg-mist h-auto w-full"
              style={{ maxWidth: post.image.width }}
            />
          </div>
        ) : null}
        {post.content ? (
          <div className="container-page py-section">
            <ArticleBody doc={post.content} contentsLabel={dict.pages.contents} />
          </div>
        ) : null}
      </article>
      <div className="container-page pb-section">
        {related.length ? (
          <section aria-labelledby="related-posts" className="mb-12">
            <LineReveal id="related-posts" text={dict.blog.related} className="text-h2" />
            <div className="mt-10">
              <RowPreview
                label={dict.blog.related}
                rows={related.map((item) => ({
                  id: item.id,
                  href: item.href,
                  title: item.title,
                  tags: [formatPostDate(item.publishedAt, locale)],
                }))}
              />
            </div>
          </section>
        ) : null}
        <Link
          href={blog}
          className="group/link text-cyan-ink hover:text-ink inline-flex min-h-11 items-center gap-2 text-small underline decoration-1 underline-offset-4"
        >
          <ArrowLeftIcon
            size={16}
            className="transition-transform duration-200 group-hover/link:-translate-x-1"
          />
          {dict.blog.back}
        </Link>
      </div>
      <JsonLdScript
        data={blogPostingJsonLd({
          headline: post.title,
          description: post.seoDescription ?? post.excerpt,
          url: post.href,
          image: post.image?.src ?? null,
          datePublished: post.publishedAt,
          locale,
          siteUrl: env.NEXT_PUBLIC_SITE_URL,
          publisherName: dict.meta.siteName,
          dateModified: info.updatedAt,
          logo: (settings.logoLight ?? settings.logoDark)?.src ?? null,
        })}
      />
    </>
  );
}
