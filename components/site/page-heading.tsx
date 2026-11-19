import type { ReactNode } from "react";

import type { BreadcrumbItem } from "@/lib/seo/json-ld";

import { Breadcrumbs } from "./breadcrumbs";

export function PageHeading({
  title,
  breadcrumbs,
  breadcrumbLabel,
  children,
}: {
  title: string;
  breadcrumbs: BreadcrumbItem[];
  breadcrumbLabel: string;
  children?: ReactNode;
}) {
  return (
    <div className="bg-light">
      <div className="container-page py-8">
        <Breadcrumbs items={breadcrumbs} label={breadcrumbLabel} />
        <h1 className="mt-2 text-h1">{title}</h1>
        {children}
      </div>
    </div>
  );
}
