import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAdminT } from "@/lib/admin/i18n/server";
import { adminPaths } from "@/lib/auth/paths";
import { getAdminUser } from "@/lib/auth/session";

import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getAdminT();
  return { title: t("Giriş") };
}

export const instant = false;

export default async function LoginPage() {
  if (await getAdminUser()) redirect(adminPaths.home);
  const t = await getAdminT();
  return (
    <>
      <h1 className="text-h4">{t("Giriş")}</h1>
      <p className="mt-2 mb-6 text-meta text-muted-foreground">
        {t("İdarə panelinə daxil olmaq üçün e-poçt və şifrənizi yazın.")}
      </p>
      <LoginForm />
    </>
  );
}
