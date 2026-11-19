import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { getAdminT } from "@/lib/admin/i18n/server";
import { findNavItem } from "@/lib/admin/navigation";

function pendingSection(section: string[]) {
  const match = findNavItem(`/admin/${section.join("/")}`);
  return match && !match.item.ready ? match.item : null;
}

export const instant = false;

export async function generateMetadata({
  params,
}: PageProps<"/admin/[...section]">): Promise<Metadata> {
  const item = pendingSection((await params).section);
  const t = await getAdminT();
  return { title: t(item?.title ?? "Tapılmadı") };
}

export default async function PendingSectionPage({ params }: PageProps<"/admin/[...section]">) {
  const item = pendingSection((await params).section);
  if (!item) notFound();
  const t = await getAdminT();

  return (
    <>
      <PageHeader title={t(item.title)} />
      <EmptyState
        action={
          <Button asChild variant="outline">
            <Link href="/admin">{t("İdarə panelinə qayıt")}</Link>
          </Button>
        }
      >
        {t("Bu bölmə növbəti mərhələdə əlavə olunacaq.")}
      </EmptyState>
    </>
  );
}
