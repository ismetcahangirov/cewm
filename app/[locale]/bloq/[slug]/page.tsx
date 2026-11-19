import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLdScript } from "@/components/site/json-ld";
import { PostCard } from "@/components/site/post-card";
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
import { pageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/bloq/[slug]">): Promise<Metadata> {
  await connection();
  const [{ slug }, { locale, dict }] = await Promise.all([params, getRequestDictionary()]);
  const post = await getPostBySlug(locale, slug);
  if (!post) notFound();
  redirectToCanonicalSlug(post.slug, locale, slug, routes.post);
  return pageMetadata({
    locale,
    title: post.seoTitle ?? post.title,
    absoluteTitle: Boolean(post.seoTitle),
    description:
      post.seoDescription ??
      post.excerpt ??
      (summarize(richTextToPlain(post.content)) || dict.content.blog.description),
    paths: localizedPaths(post.slug, routes.post),
    image: post.image,
    eyebrow: dict.content.blog.title,
    type: "article",
  });
}

async function PostContent({ params }: Pick<PageProps<"/[locale]/bloq/[slug]">, "params">) {
  await connection();
  const [{ slug }, { locale, dict }] = await Promise.all([params, getRequestDictionary()]);
  const post = await getPostBySlug(locale, slug);
  if (!post) notFound();
  redirectToCanonicalSlug(post.slug, locale, slug, routes.post);
  const [related, settings] = await Promise.all([
    getRelatedPosts(locale, post.id),
    getSiteSettings(),
  ]);
  const text = dict.content.blog;

  return (
    <>
      <JsonLdScript
        data={blogPostingJsonLd({
          headline: post.title,
          description: post.seoDescription ?? post.excerpt,
          url: post.href,
          image: post.image?.src,
          datePublished: post.publishedAt,
          locale,
          siteUrl: env.NEXT_PUBLIC_SITE_URL,
          publisherName: settings.legalName?.trim() || dict.meta.siteName,
        })}
      />
      <article className="container-page pt-15 pb-section">
        <Breadcrumbs
          label={dict.common.breadcrumb}
          items={[
            { label: dict.common.home, href: localePath(locale) },
            { label: text.title, href: localePath(locale, routes.blog()) },
            { label: post.title },
          ]}
        />
        <time dateTime={post.publishedAt} className="mt-2.5 block text-small text-graphite">
          {formatPostDate(post.publishedAt, locale)}
        </time>
        <h1 className="mt-2.5 max-w-5xl text-h1">{post.title}</h1>
        {post.image && (
          <div className="relative mt-10 aspect-video overflow-hidden bg-surface">
            <Image
              src={post.image.src}
              alt={post.image.alt}
              fill
              priority
              sizes="(min-width: 1600px) 1540px, 100vw"
              placeholder={post.image.blurDataURL ? "blur" : "empty"}
              blurDataURL={post.image.blurDataURL ?? undefined}
              className="object-cover"
            />
          </div>
        )}
        <RichText doc={post.content} imageAlt={post.title} className="mx-auto mt-10 max-w-3xl" />
      </article>
      {related.length > 0 && (
        <section aria-labelledby="related-posts" className="bg-surface py-section">
          <div className="container-page">
            <h2 id="related-posts" className="text-h3">
              {text.related}
            </h2>
            <ul className="mt-10 grid grid-cols-1 gap-x-7.5 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <li key={item.id}>
                  <PostCard post={item} locale={locale} readLabel={text.read} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}

export default function PostPage(props: PageProps<"/[locale]/bloq/[slug]">) {
  return <PostContent params={props.params} />;
}
