"use client";

import { useState } from "react";
import { toast } from "sonner";

import { applyServerErrors, FormAlert, FormField, useZodForm } from "@/components/admin/form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/admin/i18n/use-t";
import { useCreateRedirectMutation, useUpdateRedirectMutation } from "@/lib/api/redirects";
import {
  redirectInputSchema,
  redirectStatusCodes,
  redirectStatusLabels,
  type RedirectDto,
  type RedirectStatusCode,
} from "@/lib/validation/redirects";

export function RedirectDialog({
  redirect,
  onClose,
}: {
  redirect: RedirectDto | null;
  onClose: () => void;
}) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [createRedirect] = useCreateRedirectMutation();
  const [updateRedirect] = useUpdateRedirectMutation();
  const form = useZodForm(redirectInputSchema, {
    defaultValues: {
      fromPath: redirect?.fromPath ?? "",
      toPath: redirect?.toPath ?? "",
      statusCode: redirect?.statusCode ?? 301,
    },
  });
  const { isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const result = redirect
        ? await updateRedirect({ id: redirect.id, ...values }).unwrap()
        : await createRedirect(values).unwrap();
      toast.success(redirect ? t("Yönləndirmə saxlanıldı.") : t("Yönləndirmə əlavə olundu."));
      if (result.retargeted) {
        toast.info(
          t("{count} köhnə yönləndirmə də yeni ünvana yönəldildi.", { count: result.retargeted }),
        );
      }
      onClose();
    } catch (caught) {
      setError(applyServerErrors(form, caught));
    }
  });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose();
      }}
    >
      <DialogContent className="max-h-dvh overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {redirect ? t("Yönləndirməni redaktə et") : t("Yeni yönləndirmə")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "Köhnə ünvana gələn ziyarətçi bir addımda yeni ünvana keçir. Dəyişiklik saytda dərhal görünür.",
            )}
          </DialogDescription>
        </DialogHeader>
        <form id="redirect-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <FormAlert message={error} />
          <FormField
            control={form.control}
            name="fromPath"
            label={t("Köhnə ünvan")}
            required
            description={t("Tam linki də yapışdıra bilərsiniz: domen və sondakı «/» atılır.")}
            render={({ field, id, invalid, describedBy }) => (
              <Input
                {...field}
                id={id}
                maxLength={2000}
                placeholder="/product/kohne-mehsul"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={invalid}
                aria-describedby={describedBy}
              />
            )}
          />
          <FormField
            control={form.control}
            name="toPath"
            label={t("Yeni ünvan")}
            required
            description={t("Saytdakı ünvan, məsələn /mehsullar/rehber-destleri.")}
            render={({ field, id, invalid, describedBy }) => (
              <Input
                {...field}
                id={id}
                maxLength={2000}
                placeholder="/mehsul/yeni-mehsul"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={invalid}
                aria-describedby={describedBy}
              />
            )}
          />
          <FormField
            control={form.control}
            name="statusCode"
            label={t("Növ")}
            required
            description={t(
              "Köhnə saytın ünvanları üçün 301 seçin: axtarış sistemləri yeni ünvanı yadda saxlayır.",
            )}
            render={({ field, id, invalid, describedBy }) => (
              <Select
                value={String(field.value)}
                onValueChange={(value) => field.onChange(Number(value) as RedirectStatusCode)}
              >
                <SelectTrigger
                  id={id}
                  className="w-full"
                  aria-invalid={invalid}
                  aria-describedby={describedBy}
                  onBlur={field.onBlur}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {redirectStatusCodes.map((code) => (
                    <SelectItem key={code} value={String(code)}>
                      {t.message(redirectStatusLabels[code])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </form>
        <DialogFooter>
          <Button variant="outline" type="button" disabled={isSubmitting} onClick={onClose}>
            {t("Ləğv et")}
          </Button>
          <Button type="submit" form="redirect-form" disabled={isSubmitting}>
            {isSubmitting ? t("Saxlanılır") : redirect ? t("Saxla") : t("Əlavə et")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
