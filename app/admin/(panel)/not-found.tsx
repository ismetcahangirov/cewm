import Link from "next/link";

import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { getAdminT } from "@/lib/admin/i18n/server";

export default async function AdminNotFound() {
  const t = await getAdminT();
  return (
    <>
      <PageHeader title={t("Səhifə tapılmadı")} />
      <EmptyState
        action={
          <Button asChild variant="outline">
            <Link href="/admin">{t("İdarə panelinə qayıt")}</Link>
          </Button>
        }
      >
        {t("Bu ünvanda bölmə yoxdur və ya element silinib.")}
      </EmptyState>
    </>
  );
}
