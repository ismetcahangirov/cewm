import Image from "next/image";

import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { cx } from "@/lib/cx";
import { localePath, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { PublicPage } from "@/lib/public/pages";
import { blurPlaceholder } from "@/lib/public/blur";

const wideCoverWidth = 1600;

function PageCover({ cover }: { cover: NonNullable<PublicPage["cover"]> }) {
  const wide = cover.width >= wideCoverWidth && cover.width > cover.height;
  if (wide) {
    return (
      <div className="relative mt-10 aspect-4/3 w-full overflow-hidden bg-surface md:aspect-21/9">
        <Image
          src={cover.src}
          alt={cover.alt}
          fill
          priority
          sizes="100vw"
          {...blurPlaceholder(cover)}
          className="object-cover"
        />
      </div>
    );
  }
  return (
    <div className="container-page mt-10">
      <Image
        src={cover.src}
        alt={cover.alt}
        width={cover.width}
        height={cover.height}
        priority
        sizes="(min-width: 768px) 48rem, 100vw"
        {...blurPlaceholder(cover)}
        className="h-auto w-full max-w-3xl bg-surface"
      />
    </div>
  );
}

export function PageHeader({
  page,
  locale,
  dict,
}: {
  page: PublicPage;
  locale: Locale;
  dict: Dictionary;
}) {
  return (
    <>
      <div className="container-page pt-15">
        <Breadcrumbs
          label={dict.common.breadcrumb}
          items={[{ label: dict.common.home, href: localePath(locale) }, { label: page.title }]}
        />
        <h1 className="mt-2.5 text-h1">{page.title}</h1>
      </div>
      {page.cover && <PageCover cover={page.cover} />}
    </>
  );
}

export function pageBodyClass(className?: string): string {
  return cx("container-page pt-10 pb-section", className);
}
