"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { MessageKey } from "@/lib/admin/i18n";
import { findNavItem } from "@/lib/admin/navigation";
import { useT } from "@/lib/admin/i18n/use-t";

import { ContentLocaleSwitch } from "./content-locale-switch";

type Crumb = { label: MessageKey; href?: string };

const segmentLabels: Record<string, MessageKey> = { new: "Yeni#crumb" };

const detailLabels: Record<string, MessageKey> = { "/admin/requests": "Müraciət" };

function crumbsFor(pathname: string): Crumb[] {
  const match = findNavItem(pathname);
  if (!match) return [{ label: "İdarə paneli", href: "/admin" }];
  const crumbs: Crumb[] = [];
  if (match.group) crumbs.push({ label: match.group });
  crumbs.push({ label: match.item.title, href: match.item.href });
  const rest = pathname.slice(match.item.href.length).split("/").filter(Boolean);
  if (rest.length)
    crumbs.push({
      label: segmentLabels[rest[0] ?? ""] ?? detailLabels[match.item.href] ?? "Redaktə",
    });
  return crumbs;
}

export function AdminHeader() {
  const pathname = usePathname();
  const t = useT();
  const crumbs = crumbsFor(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-white px-3 md:px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-1 data-vertical:h-5 data-vertical:self-auto"
      />
      <Breadcrumb className="min-w-0">
        <BreadcrumbList className="flex-nowrap text-meta">
          {crumbs.map((crumb, index) => {
            const last = index === crumbs.length - 1;
            return (
              <Fragment key={`${crumb.label}-${index}`}>
                {index > 0 ? <BreadcrumbSeparator className="hidden md:block" /> : null}
                <BreadcrumbItem className={last ? "min-w-0" : "hidden md:inline-flex"}>
                  {last ? (
                    <BreadcrumbPage className="truncate">{t(crumb.label)}</BreadcrumbPage>
                  ) : crumb.href ? (
                    <BreadcrumbLink asChild>
                      <Link href={crumb.href}>{t(crumb.label)}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <span>{t(crumb.label)}</span>
                  )}
                </BreadcrumbItem>
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-2">
        <ContentLocaleSwitch />
        <Button asChild variant="ghost" size="sm" className="max-md:size-11 max-md:px-0">
          <a href="/" target="_blank" rel="noreferrer">
            <ExternalLink strokeWidth={1.5} />
            <span className="max-md:sr-only">{t("Sayta bax")}</span>
          </a>
        </Button>
      </div>
    </header>
  );
}
