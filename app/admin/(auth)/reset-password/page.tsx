import type { Metadata } from "next";

import { getAdminT } from "@/lib/admin/i18n/server";

import { ResetPasswordForm } from "./reset-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getAdminT();
  return { title: t("Yeni şifrə") };
}

export const instant = false;

export default async function ResetPasswordPage() {
  const t = await getAdminT();
  return (
    <>
      <h1 className="text-h4">{t("Yeni şifrə")}</h1>
      <p className="mt-2 mb-6 text-meta text-muted-foreground">
        {t("Ən azı 10 simvoldan ibarət şifrə seçin.")}
      </p>
      <ResetPasswordForm />
    </>
  );
}
