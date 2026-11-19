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
import { formText, hasLocaleError } from "@/lib/admin/form-values";
import { useT } from "@/lib/admin/i18n/use-t";
import { useCreateTeamMemberMutation, useUpdateTeamMemberMutation } from "@/lib/api/team";
import { locales, type Locale } from "@/lib/i18n/config";
import { formatAzerbaijaniPhone, formatPhoneInput } from "@/lib/phone";
import type { MediaDto } from "@/lib/validation/media";
import {
  bakuYear,
  firstStartedYear,
  teamMemberInputSchema,
  yearsSince,
  type TeamMemberDto,
} from "@/lib/validation/team";

export function MemberDialog({
  member,
  onClose,
}: {
  member: TeamMemberDto | null;
  onClose: () => void;
}) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<MediaDto | null>(member?.photo ?? null);
  const [createMember] = useCreateTeamMemberMutation();
  const [updateMember] = useUpdateTeamMemberMutation();
  const form = useZodForm(teamMemberInputSchema, {
    defaultValues: {
      name: member?.name ?? "",
      role: formText(member?.role),
      bio: formText(member?.bio),
      photoId: member?.photo?.id ?? "",
      startedYear: member?.startedYear ?? "",
      phone: member?.phone ? formatAzerbaijaniPhone(member.phone) : "",
      email: member?.email ?? "",
      isActive: member?.isActive ?? true,
    },
  });
  const { isSubmitting, errors } = form.formState;
  const role = useWatch({ control: form.control, name: "role" });
  const startedYear = useWatch({ control: form.control, name: "startedYear" });
  const year = Number(startedYear);
  const years =
    Number.isInteger(year) && year >= firstStartedYear && year <= bakuYear()
      ? yearsSince(year)
      : null;

  const textInvalid: Partial<Record<Locale, boolean>> = {};
  for (const locale of locales) {
    textInvalid[locale] = hasLocaleError(errors.role, locale) || hasLocaleError(errors.bio, locale);
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      if (member) {
        await updateMember({ id: member.id, ...values }).unwrap();
        toast.success(t("«{name}» saxlanıldı.", { name: values.name }));
      } else {
        await createMember(values).unwrap();
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
          <DialogTitle>{member ? t("İşçini redaktə et") : t("Yeni işçi")}</DialogTitle>
          <DialogDescription>
            {t("İşçi «Haqqımızda» səhifəsinin «Komanda» bölməsində bu sırada göstərilir.")}
          </DialogDescription>
        </DialogHeader>
        <form id="member-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
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
          <FormField
            control={form.control}
            name="name"
            label={t("Ad və soyad")}
            required
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
          <LocaleTabs
            invalid={textInvalid}
            filled={{ ru: Boolean(role?.ru), en: Boolean(role?.en) }}
          >
            {(locale) => (
              <>
                <FormField
                  control={form.control}
                  name={`role.${locale}`}
                  label={t("Vəzifə ({locale})", { locale: locale.toUpperCase() })}
                  required={locale === "az"}
                  description={t("Sərbəst yazın, məsələn: Satış meneceri, Baş dizayner.")}
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
                  name={`bio.${locale}`}
                  label={t("Haqqında ({locale})", { locale: locale.toUpperCase() })}
                  description={t(
                    "Təcrübəsi, ixtisası, hansı layihələrdə işləyib. 600 simvola qədər.",
                  )}
                  render={({ field, id, invalid, describedBy }) => (
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      id={id}
                      rows={4}
                      maxLength={600}
                      aria-invalid={invalid}
                      aria-describedby={describedBy}
                    />
                  )}
                />
              </>
            )}
          </LocaleTabs>
          <div className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="startedYear"
              label={t("Mebline-ə gəldiyi il")}
              description={
                years === null
                  ? t("Saytda neçə ildir işlədiyi hesablanır.")
                  : t("Saytda: {count} il", { count: years })
              }
              render={({ field, id, invalid, describedBy }) => (
                <Input
                  {...field}
                  value={
                    field.value === null || field.value === undefined ? "" : String(field.value)
                  }
                  id={id}
                  type="number"
                  inputMode="numeric"
                  min={firstStartedYear}
                  max={bakuYear()}
                  placeholder={String(bakuYear())}
                  aria-invalid={invalid}
                  aria-describedby={describedBy}
                />
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              label={t("Telefon")}
              description={t("Boş qalsa, saytda göstərilmir.")}
              render={({ field, id, invalid, describedBy }) => (
                <Input
                  {...field}
                  value={field.value ?? ""}
                  id={id}
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  placeholder="+994 55 255 54 23"
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
          <Button type="submit" form="member-form" disabled={isSubmitting}>
            {isSubmitting ? t("Saxlanılır") : member ? t("Saxla") : t("Əlavə et")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
