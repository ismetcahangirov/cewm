import Link from "next/link";

import { ArrowRightIcon } from "@/components/icons/iconsax";
import { localePath, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { routes } from "@/lib/routes";

import { button, buttonArrow } from "./button";

export function NotFoundView({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <section aria-labelledby="not-found-title" className="container-page py-section">
      <div className="gap-x-column grid gap-y-8 lg:grid-cols-12">
        <p className="text-label text-cyan-ink uppercase lg:col-span-3">404</p>
        <div className="lg:col-span-8">
          <h1 id="not-found-title" className="text-h1">
            {dict.notFound.title}
          </h1>
          <p className="text-ink-muted mt-6 text-lead">{dict.notFound.body}</p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href={localePath(locale)} className={button()}>
              {dict.notFound.home}
              <ArrowRightIcon size={20} className={buttonArrow} />
            </Link>
            <Link
              href={localePath(locale, routes.catalogue())}
              className={button({ variant: "outline" })}
            >
              {dict.notFound.products}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
