"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { FormAlert, FormField, useZodForm } from "@/components/admin/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/admin/i18n/use-t";
import { authClient, authErrorMessage } from "@/lib/auth/client";
import { adminPaths } from "@/lib/auth/paths";
import { forgotPasswordSchema } from "@/lib/validation/auth";

export function ForgotPasswordForm() {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useZodForm(forgotPasswordSchema, { defaultValues: { email: "" } });

  const onSubmit = form.handleSubmit(async ({ email }) => {
    setError(null);
    const result = await authClient.requestPasswordReset({
      email,
      redirectTo: adminPaths.resetPassword,
    });
    if (result.error) {
      setError(t(authErrorMessage(result.error)));
      return;
    }
    setSentTo(email);
  });

  const back = (
    <Link
      href={adminPaths.login}
      className="inline-flex min-h-11 items-center gap-2 self-start text-meta text-graphite underline-offset-4 hover:underline lg:min-h-0"
    >
      <ArrowLeft className="size-4" strokeWidth={1.5} />
      {t("Girişə qayıt")}
    </Link>
  );

  if (sentTo) {
    return (
      <div className="flex flex-col gap-5">
        <p role="status" className="text-meta">
          {t("Bu ünvan sistemdə varsa, {email} poçtuna link göndərdik. Link 24 saat etibarlıdır.", {
            email: sentTo,
          })}
        </p>
        {back}
      </div>
    );
  }

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
      <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
        {form.formState.isSubmitting ? t("Göndərilir") : t("Link göndər")}
      </Button>
      {back}
    </form>
  );
}
