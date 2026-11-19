"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { FormAlert, FormField, useZodForm } from "@/components/admin/form";
import { PasswordInput } from "@/components/admin/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/admin/i18n/use-t";
import { authClient, authErrorMessage } from "@/lib/auth/client";
import { adminPaths, safeAdminRedirect } from "@/lib/auth/paths";
import { signInSchema } from "@/lib/validation/auth";

export function LoginForm() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const form = useZodForm(signInSchema, { defaultValues: { email: "", password: "" } });

  const onSubmit = form.handleSubmit(async ({ email, password }) => {
    setError(null);
    const result = await authClient.signIn.email({ email, password, rememberMe: true });
    if (result.error) {
      setError(t(authErrorMessage(result.error)));
      return;
    }
    router.replace(safeAdminRedirect(searchParams.get("next")));
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <FormAlert message={error} />
      <FormField
        control={form.control}
        name="email"
        label={t("E-poçt")}
        render={({ field, id, invalid, describedBy }) => (
          <Input
            {...field}
            id={id}
            type="email"
            autoComplete="username"
            inputMode="email"
            aria-invalid={invalid}
            aria-describedby={describedBy}
          />
        )}
      />
      <FormField
        control={form.control}
        name="password"
        label={t("Şifrə")}
        render={({ field, id, invalid, describedBy }) => (
          <PasswordInput
            {...field}
            id={id}
            autoComplete="current-password"
            aria-invalid={invalid}
            aria-describedby={describedBy}
          />
        )}
      />
      <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
        {form.formState.isSubmitting ? t("Yoxlanılır") : t("Daxil ol")}
      </Button>
      <Link
        href={adminPaths.forgotPassword}
        className="inline-flex min-h-11 items-center self-start text-meta text-graphite underline-offset-4 hover:underline lg:min-h-0"
      >
        {t("Şifrəni unutmusunuz?")}
      </Link>
    </form>
  );
}
