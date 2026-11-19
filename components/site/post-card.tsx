import { ArrowRightIcon } from "@/components/icons/iconsax";
import Image from "next/image";
import Link from "next/link";

import type { Locale } from "@/lib/i18n/config";
import { formatPostDate, type PostCardData } from "@/lib/public/content";
import { blurPlaceholder } from "@/lib/public/blur";

export function PostCard({
  post,
  locale,
  readLabel,
  sizes = "(min-width: 1024px) 31vw, (min-width: 640px) 48vw, 100vw",
}: {
  post: PostCardData;
  locale: Locale;
  readLabel: string;
  sizes?: string;
}) {
  return (
    <Link href={post.href} className="group block">
      <div className="relative aspect-4/3 overflow-hidden bg-surface">
        {post.image && (
          <Image
            src={post.image.src}
            alt={post.image.alt}
            fill
            sizes={sizes}
            {...blurPlaceholder(post.image)}
            className="scale-110 object-cover transition-transform duration-400 group-hover:scale-100 group-focus-visible:scale-100"
          />
        )}
      </div>
      <time dateTime={post.publishedAt} className="mt-5 block text-small text-graphite">
        {formatPostDate(post.publishedAt, locale)}
      </time>
      <h2 className="mt-2 text-card font-text text-heading">{post.title}</h2>
      <span className="mt-3 inline-flex min-h-11 items-center gap-3.75 text-small text-graphite">
        <ArrowRightIcon
          aria-hidden="true"
          className="size-4 transition-transform duration-300 group-hover:translate-x-1"
        />
        {readLabel}
      </span>
    </Link>
  );
}
