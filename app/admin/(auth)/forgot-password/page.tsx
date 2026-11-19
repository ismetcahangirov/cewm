import type { Metadata } from "next";

import { getAdminT } from "@/lib/admin/i18n/server";

import { ForgotPasswordForm } from "./forgot-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getAdminT();
  return { title: t("Şifrənin bərpası") };
}

export const instant = false;

export default async function ForgotPasswordPage() {
  const t = await getAdminT();
  return (
    <>
      <h1 className="text-h4">{t("Şifrənin bərpası")}</h1>
      <p className="mt-2 mb-6 text-meta text-muted-foreground">
        {t("E-poçtunuzu yazın, yeni şifrə təyin etmək üçün link göndərək.")}
      </p>
      <ForgotPasswordForm />
    </>
  );
}
