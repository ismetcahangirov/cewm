import type { ReactNode } from "react";

import type { BreadcrumbItem } from "@/lib/seo/json-ld";

import { Breadcrumbs } from "./breadcrumbs";
import { FitHeading } from "./fit-heading";

export function PageHeading({
  title,
  eyebrow,
  lead,
  breadcrumbs,
  breadcrumbLabel,
  lang,
  children,
}: {
  title: string;
  eyebrow?: string | null;
  lead?: ReactNode;
  breadcrumbs: BreadcrumbItem[];
  breadcrumbLabel: string;
  lang?: string;
  children?: ReactNode;
}) {
  return (
    <header className="container-page pt-6 pb-12 lg:pb-20">
      <Breadcrumbs items={breadcrumbs} label={breadcrumbLabel} />
      <div className="gap-x-column mt-8 grid gap-y-4 lg:mt-14 lg:grid-cols-12">
        {eyebrow && eyebrow.toLocaleLowerCase() !== title.toLocaleLowerCase() ? (
          <p className="text-label text-cyan-ink uppercase lg:col-span-3 lg:pt-4">{eyebrow}</p>
        ) : null}
        <div className="lg:col-span-9 lg:col-start-4">
          <FitHeading text={title} lang={lang} />
          {lead ? (
            <div lang={lang} className="text-ink-muted mt-6 max-w-3xl text-lead">
              {lead}
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </header>
  );
}
