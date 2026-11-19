"use client";

import { useState } from "react";
import { useWatch } from "react-hook-form";
import { toast } from "sonner";

import { applyServerErrors, FormAlert, FormField, useZodForm } from "@/components/admin/form";
import { ImagePicker } from "@/components/admin/image-picker";
import { LocaleTabs } from "@/components/admin/locale-tabs";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { filledLocales, formText, hasLocaleError } from "@/lib/admin/form-values";
import { useT } from "@/lib/admin/i18n/use-t";
import { useCreateBrandMutation, useUpdateBrandMutation } from "@/lib/api/brands";
import { locales, type Locale } from "@/lib/i18n/config";
import { slugify } from "@/lib/slug";
import { brandInputSchema, type BrandDto } from "@/lib/validation/brands";
import type { MediaDto } from "@/lib/validation/media";

export function BrandDialog({ brand, onClose }: { brand: BrandDto | null; onClose: () => void }) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [logo, setLogo] = useState<MediaDto | null>(brand?.logo ?? null);
  const [createBrand] = useCreateBrandMutation();
  const [updateBrand] = useUpdateBrandMutation();
  const form = useZodForm(brandInputSchema, {
    defaultValues: {
      name: brand?.name ?? "",
      slug: brand?.slug ?? "",
      logoId: brand?.logo?.id ?? "",
      description: formText(brand?.description),
      websiteUrl: brand?.websiteUrl ?? "",
      isActive: brand?.isActive ?? true,
    },
  });
  const { isSubmitting, errors } = form.formState;
  const description = useWatch({ control: form.control, name: "description" });

  const invalid: Partial<Record<Locale, boolean>> = {};
  for (const locale of locales) invalid[locale] = hasLocaleError(errors.description, locale);

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      if (brand) {
        await updateBrand({ id: brand.id, ...values }).unwrap();
        toast.success(t("«{name}» saxlanıldı.", { name: values.name }));
      } else {
        await createBrand(values).unwrap();
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
      <DialogContent className="max-h-dvh overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{brand ? t("Brendi redaktə et") : t("Yeni brend")}</DialogTitle>
          <DialogDescription>
            {t("Brendlər məhsul formasında seçilir və saytda partnyor kimi göstərilir.")}
          </DialogDescription>
        </DialogHeader>
        <form id="brand-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <FormAlert message={error} />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              label={t("Ad#brand")}
              required
              render={({ field, id, invalid, describedBy }) => (
                <Input
                  {...field}
                  id={id}
                  maxLength={80}
                  autoComplete="off"
                  aria-invalid={invalid}
                  aria-describedby={describedBy}
                  onBlur={(event) => {
                    field.onBlur();
                    if (!form.getValues("slug")) {
                      form.setValue("slug", slugify(event.target.value), { shouldDirty: true });
                    }
                  }}
                />
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              label={t("Ünvan (slug)")}
              required
              description={t("Yalnız kiçik latın hərfləri, rəqəmlər və tire.")}
              render={({ field, id, invalid, describedBy }) => (
                <Input
                  {...field}
                  id={id}
                  maxLength={96}
                  autoComplete="off"
                  aria-invalid={invalid}
                  aria-describedby={describedBy}
                />
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="logoId"
            label={t("Loqo")}
            description={t("SVG və ya şəffaf fonlu PNG daha yaxşı görünür.")}
            render={({ field, id, invalid, describedBy }) => (
              <ImagePicker
                id={id}
                label={t("Loqo")}
                value={logo}
                invalid={invalid}
                describedBy={describedBy}
                onChange={(media) => {
                  setLogo(media);
                  field.onChange(media?.id ?? "");
                  field.onBlur();
                }}
              />
            )}
          />
          <LocaleTabs invalid={invalid} filled={filledLocales(description)} required={false}>
            {(locale) => (
              <FormField
                control={form.control}
                name={`description.${locale}`}
                label={t("Təsvir ({locale})", { locale: locale.toUpperCase() })}
                description={t("Brend haqqında qısa mətn, 2000 simvola qədər.")}
                render={({ field, id, invalid, describedBy }) => (
                  <Textarea
                    {...field}
                    value={field.value ?? ""}
                    id={id}
                    rows={5}
                    maxLength={2000}
                    aria-invalid={invalid}
                    aria-describedby={describedBy}
                  />
                )}
              />
            )}
          </LocaleTabs>
          <FormField
            control={form.control}
            name="websiteUrl"
            label={t("Sayt")}
            description={t("Brendin rəsmi saytı. Boş qalsa, keçid göstərilmir.")}
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
          <Button type="submit" form="brand-form" disabled={isSubmitting}>
            {isSubmitting ? t("Saxlanılır") : brand ? t("Saxla") : t("Əlavə et")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
