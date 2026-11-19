"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useWatch } from "react-hook-form";
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
import { filledLocales, formText, hasLocaleError } from "@/lib/admin/form-values";
import { useT } from "@/lib/admin/i18n/use-t";
import {
  useCreateContactPersonMutation,
  useUpdateContactPersonMutation,
} from "@/lib/api/contact-persons";
import { locales, type Locale } from "@/lib/i18n/config";
import { pickLocale } from "@/lib/i18n/localized";
import { formatAzerbaijaniPhone, formatPhoneInput } from "@/lib/phone";
import {
  contactPersonInputSchema,
  contactPhoneLimit,
  type ContactPersonDto,
} from "@/lib/validation/contact-persons";
import type { MediaDto } from "@/lib/validation/media";

export function ContactPersonDialog({
  member,
  onClose,
}: {
  member: ContactPersonDto | null;
  onClose: () => void;
}) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<MediaDto | null>(member?.photo ?? null);
  const [createMember] = useCreateContactPersonMutation();
  const [updateMember] = useUpdateContactPersonMutation();
  const form = useZodForm(contactPersonInputSchema, {
    defaultValues: {
      name: formText(member?.name),
      role: formText(member?.role),
      phones: (member?.phones ?? []).map((number) => ({ number: formatAzerbaijaniPhone(number) })),
      email: member?.email ?? "",
      whatsapp: member?.whatsapp ? formatAzerbaijaniPhone(member.whatsapp) : "",
      photoId: member?.photo?.id ?? "",
      isActive: member?.isActive ?? true,
    },
  });
  const phones = useFieldArray({ control: form.control, name: "phones" });
  const { isSubmitting, errors } = form.formState;
  const name = useWatch({ control: form.control, name: "name" });
  const role = useWatch({ control: form.control, name: "role" });

  const textInvalid: Partial<Record<Locale, boolean>> = {};
  for (const locale of locales) {
    textInvalid[locale] =
      hasLocaleError(errors.name, locale) || hasLocaleError(errors.role, locale);
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const label = pickLocale(values.name, t.locale);
    const input = form.getValues();
    try {
      if (member) {
        await updateMember({ id: member.id, ...input }).unwrap();
        toast.success(t("«{name}» saxlanıldı.", { name: label }));
      } else {
        await createMember(input).unwrap();
        toast.success(t("«{name}» əlavə olundu.", { name: label }));
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
          <DialogTitle>
            {member ? t("Əlaqə şəxsini redaktə et") : t("Yeni əlaqə şəxsi")}
          </DialogTitle>
          <DialogDescription>
            {t("Əlaqə şəxsi «Əlaqə» səhifəsində və footerdə bu sırada göstərilir.")}
          </DialogDescription>
        </DialogHeader>
        <form
          id="contact-person-form"
          onSubmit={onSubmit}
          noValidate
          className="flex flex-col gap-5"
        >
          <FormAlert message={error} />
          <FormField
            control={form.control}
            name="photoId"
            label={t("Foto")}
            description={t("Kvadrat və ya portret foto, ən azı 800 px.")}
            render={({ field, id, invalid, describedBy }) => (
              <ImagePicker
                id={id}
                label={t("Foto")}
                value={photo}
                invalid={invalid}
                describedBy={describedBy}
                onChange={(media) => {
                  setPhoto(media);
                  field.onChange(media?.id ?? "");
                  field.onBlur();
                }}
              />
            )}
          />
          <LocaleTabs
            invalid={textInvalid}
            filled={{
              ru: filledLocales(name).ru || filledLocales(role).ru,
              en: filledLocales(name).en || filledLocales(role).en,
              de: filledLocales(name).de || filledLocales(role).de,
            }}
          >
            {(locale) => (
              <>
                <FormField
                  control={form.control}
                  name={`name.${locale}`}
                  label={t("Ad və soyad ({locale})", { locale: locale.toUpperCase() })}
                  required={locale === "az"}
                  description={t("Hər dil üçün o dildəki yazılışı ilə.")}
                  render={({ field, id, invalid, describedBy }) => (
                    <Input
                      {...field}
                      value={field.value ?? ""}
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
                  name={`role.${locale}`}
                  label={t("Vəzifə ({locale})", { locale: locale.toUpperCase() })}
                  required={locale === "az"}
                  description={t("Sərbəst yazın, məsələn: Direktor, Satış meneceri.")}
                  render={({ field, id, invalid, describedBy }) => (
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      id={id}
                      maxLength={120}
                      autoComplete="off"
                      aria-invalid={invalid}
                      aria-describedby={describedBy}
                    />
                  )}
                />
              </>
            )}
          </LocaleTabs>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-meta font-medium">{t("Telefonlar")}</legend>
            {phones.fields.map((row, index) => (
              <div key={row.id} className="flex items-start gap-2">
                <FormField
                  control={form.control}
                  name={`phones.${index}.number`}
                  label={t("Telefon {count}", { count: index + 1 })}
                  className="flex-1"
                  render={({ field, id, invalid, describedBy }) => (
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      id={id}
                      type="tel"
                      inputMode="tel"
                      autoComplete="off"
                      placeholder="+994 12 480 05 70"
                      aria-invalid={invalid}
                      aria-describedby={describedBy}
                      onChange={(event) => field.onChange(formatPhoneInput(event.target.value))}
                    />
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-6"
                  aria-label={t("Telefon {count}: sil", { count: index + 1 })}
                  onClick={() => phones.remove(index)}
                >
                  <Trash2 strokeWidth={1.5} />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="self-start"
              disabled={phones.fields.length >= contactPhoneLimit}
              onClick={() => phones.append({ number: "" })}
            >
              <Plus strokeWidth={1.5} />
              {t("Telefon əlavə et")}
            </Button>
          </fieldset>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="whatsapp"
              label={t("WhatsApp")}
              description={t("Boş qalsa, saytda göstərilmir.")}
              render={({ field, id, invalid, describedBy }) => (
                <Input
                  {...field}
                  value={field.value ?? ""}
                  id={id}
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  placeholder="+994 55 716 03 66"
                  aria-invalid={invalid}
                  aria-describedby={describedBy}
                  onChange={(event) => field.onChange(formatPhoneInput(event.target.value))}
                />
              )}
            />
            <FormField
              control={form.control}
              name="email"
              label={t("E-poçt")}
              description={t("Boş qalsa, saytda göstərilmir.")}
              render={({ field, id, invalid, describedBy }) => (
                <Input
                  {...field}
                  value={field.value ?? ""}
                  id={id}
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  aria-invalid={invalid}
                  aria-describedby={describedBy}
                />
              )}
            />
          </div>
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
          <Button type="submit" form="contact-person-form" disabled={isSubmitting}>
            {isSubmitting ? t("Saxlanılır") : member ? t("Saxla") : t("Əlavə et")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
