import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

import { Eyebrow } from "@/components/site/eyebrow";
import { pill } from "@/components/site/pill";
import { RichText } from "@/components/site/rich-text";
import type { CustomBlock } from "@/lib/public/home";
import { cx } from "@/lib/cx";
import { blurPlaceholder } from "@/lib/public/blur";

import { SectionVideo, type SoundLabels } from "./section-video";

const toneClass = {
  white: "mt-section",
  cream: "mt-section bg-cream py-section",
  graphite: "on-dark mt-section bg-graphite py-section text-sand",
} as const;

function isExternal(href: string) {
  return /^https?:\/\//.test(href);
}

function Media({
  block,
  sizes,
  labels,
  fill = false,
}: {
  block: CustomBlock;
  sizes: string;
  labels: SoundLabels;
  fill?: boolean;
}) {
  if (block.video) {
    return (
      <div
        className={cx("relative overflow-hidden bg-surface", fill ? "size-full" : "aspect-video")}
      >
        <SectionVideo video={block.video} poster={block.poster?.src ?? null} labels={labels} />
      </div>
    );
  }
  if (!block.image) return null;
  if (fill) {
    return (
      <Image
        src={block.image.src}
        alt={block.image.alt}
        fill
        sizes={sizes}
        {...blurPlaceholder(block.image)}
        className="object-cover"
      />
    );
  }
  return (
    <Image
      src={block.image.src}
      alt={block.image.alt}
      width={block.image.width}
      height={block.image.height}
      sizes={sizes}
      {...blurPlaceholder(block.image)}
      className="h-auto w-full bg-surface"
    />
  );
}

function Text({
  block,
  headingId,
  dark,
  className,
  reveal,
  onImage = false,
}: {
  block: CustomBlock;
  headingId: string;
  dark: boolean;
  className?: string;
  reveal: "" | "left" | "right";
  onImage?: boolean;
}) {
  const link = block.link;
  return (
    <div
      suppressHydrationWarning
      data-reveal={reveal}
      className={cx("flex flex-col items-start", className)}
    >
      {block.eyebrow && (
        <Eyebrow
          dotClassName={onImage ? "bg-white" : dark ? "bg-sand" : undefined}
          className="mb-5"
        >
          {block.eyebrow}
        </Eyebrow>
      )}
      {block.title && (
        <h2 id={headingId} className={cx("text-h2", onImage ? "text-white" : dark && "text-sand")}>
          {block.title}
        </h2>
      )}
      {block.body && (
        <RichText
          doc={block.body}
          imageAlt={block.title ?? ""}
          className={cx(block.title && "mt-6", dark && "text-inherit")}
        />
      )}
      {link && (
        <Link
          href={link.href}
          target={isExternal(link.href) ? "_blank" : undefined}
          rel={isExternal(link.href) ? "noopener noreferrer" : undefined}
          className={cx(
            pill({ variant: onImage ? "white" : dark ? "outline-light" : "outline" }),
            (block.title || block.body) && "mt-8",
          )}
        >
          {link.label}
        </Link>
      )}
    </div>
  );
}

export function CustomSection({
  id,
  block,
  labels,
}: {
  id: string;
  block: CustomBlock;
  labels: SoundLabels;
}) {
  const headingId = `section-${id}`;
  const labelled = block.title ? headingId : undefined;

  if (block.layout === "background") {
    return (
      <section
        aria-labelledby={labelled}
        className="on-dark relative mt-section flex min-h-[70svh] items-end overflow-hidden bg-graphite text-white"
      >
        <div className="absolute inset-0">
          <Media block={block} sizes="100vw" labels={labels} fill />
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-t from-black/75 via-black/45 to-black/15"
        />
        <div className="relative container-page w-full py-section">
          <Text block={block} headingId={headingId} dark onImage className="max-w-3xl" reveal="" />
        </div>
      </section>
    );
  }

  const dark = block.tone === "graphite";
  const hasMedia = Boolean(block.image || block.video);

  if (block.layout === "media-top" || !hasMedia) {
    return (
      <section aria-labelledby={labelled} className={toneClass[block.tone]}>
        <div className="container-page flex flex-col gap-10">
          {hasMedia && (
            <div suppressHydrationWarning data-reveal="">
              <Media block={block} sizes="(min-width: 1600px) 1540px, 100vw" labels={labels} />
            </div>
          )}
          <Text block={block} headingId={headingId} dark={dark} className="max-w-3xl" reveal="" />
        </div>
      </section>
    );
  }

  const mediaRight = block.layout === "media-right";
  const share = `${block.mediaWidth}%`;
  return (
    <section aria-labelledby={labelled} className={toneClass[block.tone]}>
      <div
        data-reveal-group=""
        style={{ "--media": share } as CSSProperties}
        className={cx(
          "container-page grid grid-cols-1 items-center gap-y-10 md:gap-x-15",
          mediaRight
            ? "md:grid-cols-[minmax(0,1fr)_var(--media)]"
            : "md:grid-cols-[var(--media)_minmax(0,1fr)]",
        )}
      >
        <div
          suppressHydrationWarning
          data-reveal={mediaRight ? "right" : "left"}
          className={cx(mediaRight && "md:order-2")}
        >
          <Media
            block={block}
            sizes={`(min-width: 768px) ${block.mediaWidth}vw, 100vw`}
            labels={labels}
          />
        </div>
        <Text
          block={block}
          headingId={headingId}
          dark={dark}
          reveal={mediaRight ? "left" : "right"}
        />
      </div>
    </section>
  );
}
