import { ArrowRightIcon } from "@/components/icons/iconsax";
import Link from "next/link";

import { cx } from "@/lib/cx";
import type { Dictionary } from "@/lib/i18n/dictionaries";

import { Eyebrow } from "./eyebrow";

export function CtaContent({
  dict,
  quoteHref,
  headingId,
  className,
}: {
  dict: Dictionary;
  quoteHref: string | null;
  headingId: string;
  className?: string;
}) {
  return (
    <div
      data-reveal-group=""
      className={cx("grid grid-cols-1 gap-y-8 lg:grid-cols-12 lg:gap-x-7.5", className)}
    >
      <div suppressHydrationWarning data-reveal="left" className="lg:col-span-5">
        <Eyebrow dotClassName="bg-sand">{dict.home.ctaEyebrow}</Eyebrow>
        <h2 id={headingId} className="mt-5 text-h4 text-sand">
          {dict.home.ctaTitle}
        </h2>
      </div>
      <div suppressHydrationWarning data-reveal="right" className="lg:col-span-5 lg:col-start-7">
        <p>{dict.home.ctaBody}</p>
        {quoteHref && (
          <Link
            href={quoteHref}
            className="group mt-6 inline-flex min-h-11 items-center gap-3.75 text-small text-sand"
          >
            <ArrowRightIcon
              aria-hidden="true"
              className="size-4 transition-transform duration-300 group-hover:translate-x-1"
            />
            {dict.common.requestQuote}
          </Link>
        )}
      </div>
    </div>
  );
}

export function CtaBand({
  dict,
  quoteHref,
  className,
}: {
  dict: Dictionary;
  quoteHref: string | null;
  className?: string;
}) {
  return (
    <section
      aria-labelledby="cta-band"
      className={cx("on-dark mt-section bg-graphite py-section text-sand", className)}
    >
      <CtaContent
        dict={dict}
        quoteHref={quoteHref}
        headingId="cta-band"
        className="container-page"
      />
    </section>
  );
}
