"use client";

import { useState } from "react";
import { toast } from "sonner";

import { applyServerErrors, FormAlert, FormField, useZodForm } from "@/components/admin/form";
import { ImagePicker } from "@/components/admin/image-picker";
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
import { Switch } from "@/components/ui/switch";
import { useT } from "@/lib/admin/i18n/use-t";
import { useCreateLogoMutation, useUpdateLogoMutation } from "@/lib/api/logos";
import {
  logoGroupLabels,
  logoGroups,
  logoInputSchema,
  type LogoDto,
  type LogoGroup,
} from "@/lib/validation/logos";
import type { MediaDto } from "@/lib/validation/media";

export function LogoDialog({
  logo,
  group,
  onClose,
}: {
  logo: LogoDto | null;
  group: LogoGroup;
  onClose: () => void;
}) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<MediaDto | null>(logo?.image ?? null);
  const [createLogo] = useCreateLogoMutation();
  const [updateLogo] = useUpdateLogoMutation();
  const form = useZodForm(logoInputSchema, {
    defaultValues: {
      name: logo?.name ?? "",
      imageId: logo?.image?.id ?? "",
      url: logo?.url ?? "",
      group: logo?.group ?? group,
      isActive: logo?.isActive ?? true,
    },
  });
  const { isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      if (logo) {
        await updateLogo({ id: logo.id, ...values }).unwrap();
        toast.success(t("«{name}» saxlanıldı.", { name: values.name }));
      } else {
        await createLogo(values).unwrap();
        toast.success(t("«{name}» əlavə olundu.", { name: values.name }));
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
      <DialogContent className="max-h-dvh overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{logo ? t("Loqonu redaktə et") : t("Yeni loqo")}</DialogTitle>
          <DialogDescription>
            {t("Loqo «Referanslar» və ya «Partnyorlar» bölməsində bu sırada göstərilir.")}
          </DialogDescription>
        </DialogHeader>
        <form id="logo-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <FormAlert message={error} />
          <FormField
            control={form.control}
            name="name"
            label={t("Ad#logo")}
            required
            description={t("Şəklin alt mətni kimi istifadə olunur.")}
            render={({ field, id, invalid, describedBy }) => (
              <Input
                {...field}
                id={id}
                maxLength={120}
                autoComplete="off"
                aria-invalid={invalid}
                aria-describedby={describedBy}
              />
            )}
          />
          <FormField
            control={form.control}
            name="imageId"
            label={t("Loqo")}
            required
            description={t("SVG və ya şəffaf fonlu PNG daha yaxşı görünür.")}
            render={({ field, id, invalid, describedBy }) => (
              <ImagePicker
                id={id}
                label={t("Loqo")}
                value={image}
                invalid={invalid}
                describedBy={describedBy}
                onChange={(media) => {
                  setImage(media);
                  field.onChange(media?.id ?? "");
                  field.onBlur();
                }}
              />
            )}
          />
          <FormField
            control={form.control}
            name="url"
            label={t("Keçid")}
            description={t("Şirkətin saytı. Boş qalsa, loqo keçidsiz göstərilir.")}
            render={({ field, id, invalid, describedBy }) => (
              <Input
                {...field}
                value={field.value ?? ""}
                id={id}
                type="url"
                inputMode="url"
                placeholder="https://"
                autoComplete="off"
                aria-invalid={invalid}
                aria-describedby={describedBy}
              />
            )}
          />
          <FormField
            control={form.control}
            name="group"
            label={t("Bölmə")}
            required
            render={({ field, id, invalid, describedBy }) => (
              <Select value={field.value} onValueChange={field.onChange}>
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
                  {logoGroups.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t.message(logoGroupLabels[value])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FormField
            control={form.control}
            name="isActive"
            label={t("Saytda göstər")}
            render={({ field, id, describedBy }) => (
              <Switch
                id={id}
                className="self-start"
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-describedby={describedBy}
              />
            )}
          />
        </form>
        <DialogFooter>
          <Button variant="outline" type="button" disabled={isSubmitting} onClick={onClose}>
            {t("Ləğv et")}
          </Button>
          <Button type="submit" form="logo-form" disabled={isSubmitting}>
            {isSubmitting ? t("Saxlanılır") : logo ? t("Saxla") : t("Əlavə et")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
