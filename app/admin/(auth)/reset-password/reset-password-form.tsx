"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { FormAlert, FormField, useZodForm } from "@/components/admin/form";
import { PasswordInput } from "@/components/admin/password-input";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/admin/i18n/use-t";
import { authClient, authErrorMessage } from "@/lib/auth/client";
import { adminPaths } from "@/lib/auth/paths";
import { resetPasswordSchema } from "@/lib/validation/auth";

export function ResetPasswordForm() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const linkError = searchParams.get("error");
  const [error, setError] = useState<string | null>(null);
  const form = useZodForm(resetPasswordSchema, { defaultValues: { password: "", confirm: "" } });

  if (!token || linkError) {
    return (
      <div className="flex flex-col gap-5">
        <FormAlert message={t("Link etibarsızdır və ya vaxtı keçib. Yeni link istəyin.")} />
        <Link
          href={adminPaths.forgotPassword}
          className="inline-flex min-h-11 items-center self-start text-meta text-graphite underline-offset-4 hover:underline lg:min-h-0"
        >
          {t("Yeni link istə")}
        </Link>
      </div>
    );
  }

  const onSubmit = form.handleSubmit(async ({ password }) => {
    setError(null);
    const result = await authClient.resetPassword({ newPassword: password, token });
    if (result.error) {
      setError(t(authErrorMessage(result.error)));
      return;
    }
    toast.success(t("Şifrə təyin olundu. İndi daxil ola bilərsiniz."));
    router.replace(adminPaths.login);
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <FormAlert message={error} />
      <FormField
        control={form.control}
        name="password"
        label={t("Yeni şifrə")}
        render={({ field, id, invalid, describedBy }) => (
          <PasswordInput
            {...field}
            id={id}
            autoComplete="new-password"
            aria-invalid={invalid}
            aria-describedby={describedBy}
          />
        )}
      />
      <FormField
        control={form.control}
        name="confirm"
        label={t("Şifrəni təkrarlayın")}
        render={({ field, id, invalid, describedBy }) => (
          <PasswordInput
            {...field}
            id={id}
            autoComplete="new-password"
            aria-invalid={invalid}
            aria-describedby={describedBy}
          />
        )}
      />
      <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
        {form.formState.isSubmitting ? t("Saxlanılır") : t("Şifrəni saxla")}
      </Button>
    </form>
  );
}
