import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { RequestStatusBadge } from "@/components/admin/status-badge";
import { getDashboardSummary } from "@/lib/admin/dashboard";
import { formatDateTime, formatNumber } from "@/lib/admin/format";
import { getAdminT } from "@/lib/admin/i18n/server";
import { requireAdminUser } from "@/lib/auth/session";
import { telHref } from "@/lib/contact-links";
import type { Locale } from "@/lib/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getAdminT();
  return { title: t("İdarə paneli") };
}

function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex min-h-11 items-center gap-3 text-small text-graphite md:min-h-0"
    >
      <ArrowRight
        className="size-4 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
        strokeWidth={1.5}
      />
      {children}
    </Link>
  );
}

function CountCard({
  label,
  value,
  detail,
  href,
  linkLabel,
  locale,
}: {
  label: string;
  value: number;
  detail?: string;
  href: string;
  linkLabel: string;
  locale: Locale;
}) {
  return (
    <section className="flex flex-col gap-2 rounded-sm border border-border bg-white p-4 md:p-6">
      <h2 className="text-meta font-normal text-muted-foreground">{label}</h2>
      <p className="text-h3 font-light text-heading tabular-nums">{formatNumber(value, locale)}</p>
      {detail ? <p className="text-meta">{detail}</p> : null}
      <div className="mt-auto pt-2">
        <ArrowLink href={href}>{linkLabel}</ArrowLink>
      </div>
    </section>
  );
}

export const instant = false;

export default async function DashboardPage() {
  const user = await requireAdminUser();
  const summary = await getDashboardSummary();
  const t = await getAdminT();

  return (
    <>
      <PageHeader
        title={t("İdarə paneli")}
        description={t("Xoş gəldiniz, {name}.", { name: user.name })}
      />

      <section aria-labelledby="visitors-title" className="mb-8">
        <h2 id="visitors-title" className="mb-4 text-card font-normal">
          {t("Sayt ziyarətçiləri")}
        </h2>
        <dl className="grid grid-cols-3 gap-3 md:gap-4 xl:grid-cols-4">
          {(
            [
              [t("Bu gün"), summary.visitors.today],
              [t("Son 7 gün"), summary.visitors.week],
              [t("Son 30 gün"), summary.visitors.month],
            ] as const
          ).map(([label, value]) => (
            <div
              key={label}
              className="flex flex-col gap-1 rounded-sm border border-border bg-white p-3 md:p-4"
            >
              <dt className="text-meta text-muted-foreground">{label}</dt>
              <dd className="text-h4 font-light text-heading tabular-nums">
                {formatNumber(value, t.locale)}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-meta text-muted-foreground">
          {t("Unikal ziyarətçilər, Bakı vaxtı ilə. Botlar və daxil olmuş istifadəçilər sayılmır.")}
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <CountCard
          label={t("Bu həftə yeni müraciətlər")}
          value={summary.newRequestsThisWeek}
          detail={t("Cavab gözləyən: {count}", {
            count: formatNumber(summary.unreadRequests, t.locale),
          })}
          href="/admin/requests"
          linkLabel={t("Müraciətlər")}
          locale={t.locale}
        />
        <CountCard
          label={t("Məhsullar")}
          value={summary.products.total}
          detail={t("{published} dərc olunub, {draft} qaralama", {
            published: formatNumber(summary.products.published, t.locale),
            draft: formatNumber(summary.products.draft, t.locale),
          })}
          href="/admin/products"
          linkLabel={t("Məhsullar")}
          locale={t.locale}
        />
        <CountCard
          label={t("Layihələr")}
          value={summary.projects}
          href="/admin/projects"
          linkLabel={t("Layihələr")}
          locale={t.locale}
        />
        <CountCard
          label={t("Qaralamalar")}
          value={summary.drafts}
          detail={t("Məhsul, layihə, səhifə və bloq")}
          href="/admin/products"
          linkLabel={t("Qaralamalar")}
          locale={t.locale}
        />
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-12">
        <section className="xl:col-span-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-card font-normal">{t("Son müraciətlər")}</h2>
            <ArrowLink href="/admin/requests">{t("Hamısı")}</ArrowLink>
          </div>
          {summary.latestRequests.length === 0 ? (
            <EmptyState>
              {t("Hələ müraciət yoxdur. Saytdan gələn təklif sorğuları burada görünəcək.")}
            </EmptyState>
          ) : (
            <div className="border border-border bg-white">
              <table className="w-full border-collapse text-meta max-md:hidden">
                <thead>
                  <tr className="border-b border-border text-left text-heading">
                    <th scope="col" className="h-12 px-3 font-medium">
                      {t("Ad")}
                    </th>
                    <th scope="col" className="h-12 px-3 font-medium">
                      {t("Telefon")}
                    </th>
                    <th scope="col" className="h-12 px-3 font-medium">
                      {t("Məhsul")}
                    </th>
                    <th scope="col" className="h-12 px-3 font-medium">
                      {t("Status")}
                    </th>
                    <th scope="col" className="h-12 px-3 font-medium">
                      {t("Tarix")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summary.latestRequests.map((request) => (
                    <tr key={request.id} className="border-b border-border last:border-0">
                      <td className="h-12 px-3 py-2">
                        <Link
                          href={`/admin/requests/${request.id}`}
                          className="block hover:underline"
                        >
                          {request.name}
                        </Link>
                        {request.company ? (
                          <span className="block text-muted-foreground">{request.company}</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <a href={telHref(request.phone)} className="hover:underline">
                          {request.phone}
                        </a>
                      </td>
                      <td className="px-3 py-2 tabular-nums">{request.productCount}</td>
                      <td className="px-3 py-2">
                        <RequestStatusBadge status={request.status} />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                        {formatDateTime(request.createdAt, t.locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="divide-y divide-border md:hidden">
                {summary.latestRequests.map((request) => (
                  <li key={request.id} className="flex flex-col gap-1 p-4 text-meta">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/admin/requests/${request.id}`}
                        className="min-h-11 content-center font-medium hover:underline"
                      >
                        {request.name}
                      </Link>
                      <RequestStatusBadge status={request.status} />
                    </div>
                    <a href={telHref(request.phone)} className="min-h-11 content-center">
                      {request.phone}
                    </a>
                    <span className="text-muted-foreground">
                      {formatDateTime(request.createdAt, t.locale)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="xl:col-span-4">
          <h2 className="mb-4 text-card font-normal">{t("Tez keçidlər")}</h2>
          <ul className="flex flex-col gap-3 border border-border bg-white p-6">
            <li>
              <ArrowLink href="/admin/products/new">{t("Yeni məhsul əlavə et")}</ArrowLink>
            </li>
            <li>
              <ArrowLink href="/admin/projects/new">{t("Yeni layihə əlavə et")}</ArrowLink>
            </li>
            <li>
              <ArrowLink href="/admin/media">{t("Media kitabxanası")}</ArrowLink>
            </li>
            <li>
              <ArrowLink href="/admin/settings">{t("Əlaqə məlumatları və SEO")}</ArrowLink>
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}
