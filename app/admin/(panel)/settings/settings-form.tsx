"use client";

import { useState } from "react";
import { FormProvider, useWatch } from "react-hook-form";
import { toast } from "sonner";

import {
  applyServerErrors,
  FormActions,
  FormAlert,
  FormField,
  FormLayout,
  FormSection,
  useZodForm,
} from "@/components/admin/form";
import { ImagePicker } from "@/components/admin/image-picker";
import { LocaleTabs } from "@/components/admin/locale-tabs";
import { PageHeader } from "@/components/admin/page-header";
import { SeoFields } from "@/components/admin/seo-fields";
import { useUnsavedChangesGuard } from "@/components/admin/unsaved-changes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/admin/format";
import type { MessageKey } from "@/lib/admin/i18n";
import { useT } from "@/lib/admin/i18n/use-t";
import { useUpdateSettingsMutation } from "@/lib/api/settings";
import { locales, type Locale } from "@/lib/i18n/config";
import type { Localized } from "@/lib/i18n/localized";
import { formatAzerbaijaniPhone } from "@/lib/phone";
import type { MediaDto } from "@/lib/validation/media";
import {
  settingsInputSchema,
  type SettingsDto,
  type SettingsInput,
} from "@/lib/validation/settings";

import { EmailRows, PhoneRows, SocialRows } from "./settings-lists";

function text(value: Localized | null) {
  return { az: value?.az ?? "", ru: value?.ru ?? "", en: value?.en ?? "" };
}

function toFormValues(settings: SettingsDto): SettingsInput {
  return {
    logoLightId: settings.logoLightId,
    logoDarkId: settings.logoDarkId,
    faviconId: settings.faviconId,
    phones: settings.phones.length
      ? settings.phones.map((phone) => ({
          label: text(phone.label),
          number: formatAzerbaijaniPhone(phone.number),
        }))
      : [{ label: text(null), number: "" }],
    emails: settings.emails.map((address) => ({ address })),
    address: text(settings.address),
    mapUrl: settings.mapUrl ?? "",
    workingHours: text(settings.workingHours),
    whatsappNumber: settings.whatsappNumber ?? "",
    socials: settings.socials.map((social) => ({ network: social.network, url: social.url })),
    seoTitle: text(settings.seoTitle),
    seoDescription: text(settings.seoDescription),
    ogImageId: settings.ogImageId,
    legalName: settings.legalName ?? "",
    quoteNotifyEmail: settings.quoteNotifyEmail ?? "",
    catalogueFileId: settings.catalogueFileId,
  };
}

function hasLocaleError(value: unknown, locale: Locale): boolean {
  return Boolean(value && typeof value === "object" && locale in value);
}

type MediaField = "logoLightId" | "logoDarkId" | "faviconId" | "ogImageId" | "catalogueFileId";

export function SettingsForm({ settings }: { settings: SettingsDto }) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [mediaById, setMediaById] = useState(
    () => new Map(settings.media.map((item) => [item.id, item])),
  );
  const [updateSettings] = useUpdateSettingsMutation();
  const form = useZodForm(settingsInputSchema, { defaultValues: toFormValues(settings) });
  const { isDirty, isSubmitting, errors } = form.formState;
  const guard = useUnsavedChangesGuard(isDirty && !isSubmitting);
  const values = useWatch({ control: form.control });

  function remember(media: MediaDto) {
    setMediaById((current) => new Map(current).set(media.id, media));
  }

  const contactInvalid: Partial<Record<Locale, boolean>> = {};
  for (const locale of locales) {
    contactInvalid[locale] =
      hasLocaleError(errors.address, locale) || hasLocaleError(errors.workingHours, locale);
  }

  const onSubmit = form.handleSubmit(
    async () => {
      setError(null);
      try {
        const saved = await updateSettings(form.getValues()).unwrap();
        form.reset(toFormValues(saved));
        toast.success(t("Saxlanıldı, saytda yeniləndi."));
      } catch (caught) {
        setError(applyServerErrors(form, caught));
      }
    },
    () => setError(t("Formada səhvlər var. Qırmızı sahələri düzəldin.")),
  );

  function mediaPicker(
    name: MediaField,
    label: MessageKey,
    description: MessageKey,
    kind: "image" | "document" = "image",
  ) {
    return (
      <FormField
        control={form.control}
        name={name}
        label={t(label)}
        description={t(description)}
        render={({ field, id, invalid, describedBy }) => (
          <ImagePicker
            id={id}
            kind={kind}
            label={kind === "document" ? t("Fayl") : t("Şəkil")}
            value={field.value ? (mediaById.get(field.value) ?? null) : null}
            invalid={invalid}
            describedBy={describedBy}
            onChange={(media: MediaDto | null) => {
              if (media) remember(media);
              field.onChange(media?.id ?? null);
            }}
          />
        )}
      />
    );
  }

  const saveButton = (
    <Button type="submit" form="settings-form" disabled={isSubmitting}>
      {isSubmitting ? t("Saxlanılır") : t("Saxla")}
    </Button>
  );

  return (
    <FormProvider {...form}>
      <PageHeader
        title={t("SEO və tənzimləmələr")}
        description={
          settings.updatedAt
            ? t("Əlaqə məlumatları, loqo və axtarış sistemləri. Son dəyişiklik: {date}", {
                date: formatDateTime(settings.updatedAt, t.locale),
              })
            : t("Əlaqə məlumatları, loqo və axtarış sistemləri.")
        }
        actions={<span className="max-md:hidden">{saveButton}</span>}
      />
      <form id="settings-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <FormAlert message={error} />
        <FormLayout
          main={
            <>
              <FormSection title={t("Əlaqə")}>
                <div className="flex flex-col gap-2">
                  <h3 className="text-meta font-medium">
                    {t("Telefonlar")}
                    <span aria-hidden="true" className="text-destructive">
                      *
                    </span>
                  </h3>
                  <p className="text-meta text-muted-foreground">
                    {t(
                      "Birinci nömrə saytın başlığında və axtarış sistemləri üçün əsas nömrədir. Sıranı sürüşdürərək dəyişin.",
                    )}
                  </p>
                  <PhoneRows />
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-meta font-medium">{t("E-poçt ünvanları")}</h3>
                  <EmailRows />
                </div>
                <LocaleTabs
                  invalid={contactInvalid}
                  filled={{
                    ru: Boolean(values.address?.ru || values.workingHours?.ru),
                    en: Boolean(values.address?.en || values.workingHours?.en),
                  }}
                >
                  {(locale) => (
                    <>
                      <FormField
                        control={form.control}
                        name={`address.${locale}`}
                        label={t("Ünvan ({locale})#address", { locale: locale.toUpperCase() })}
                        render={({ field, id, invalid, describedBy }) => (
                          <Textarea
                            {...field}
                            value={field.value ?? ""}
                            id={id}
                            rows={2}
                            maxLength={300}
                            aria-invalid={invalid}
                            aria-describedby={describedBy}
                          />
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`workingHours.${locale}`}
                        label={t("İş saatları ({locale})", { locale: locale.toUpperCase() })}
                        description={
                          locale === "az"
                            ? t(
                                "Hər günü ayrı sətirdə yazmaq olar, məsələn «B.e.–Cümə: 09:00–18:00».",
                              )
                            : undefined
                        }
                        render={({ field, id, invalid, describedBy }) => (
                          <Textarea
                            {...field}
                            value={field.value ?? ""}
                            id={id}
                            rows={3}
                            maxLength={300}
                            aria-invalid={invalid}
                            aria-describedby={describedBy}
                          />
                        )}
                      />
                    </>
                  )}
                </LocaleTabs>
                <FormField
                  control={form.control}
                  name="mapUrl"
                  label={t("Xəritə linki")}
                  description={t("Google Maps və ya Yandex xəritəsində ofisin linki.")}
                  render={({ field, id, invalid, describedBy }) => (
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      id={id}
                      type="url"
                      inputMode="url"
                      maxLength={500}
                      placeholder="https://maps.google.com/?cid=..."
                      aria-invalid={invalid}
                      aria-describedby={describedBy}
                    />
                  )}
                />
              </FormSection>

              <FormSection title="WhatsApp">
                <FormField
                  control={form.control}
                  name="whatsappNumber"
                  label={t("WhatsApp nömrəsi")}
                  description={t(
                    "Ölkə kodu ilə, yalnız rəqəmlər: 994552555423. Saytda yalnız WhatsApp ikonu ilə link kimi göstərilir: nömrə mətn kimi yazılmır və ekranın küncündə üzən düymə olmur.",
                  )}
                  render={({ field, id, invalid, describedBy }) => (
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      id={id}
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={32}
                      placeholder="994552555423"
                      aria-invalid={invalid}
                      aria-describedby={describedBy}
                    />
                  )}
                />
              </FormSection>

              <FormSection title={t("Sosial şəbəkələr")}>
                <p className="text-meta text-muted-foreground">
                  {t("Saytın aşağı hissəsində ikon kimi göstərilir. Hər şəbəkə bir dəfə.")}
                </p>
                <SocialRows />
              </FormSection>

              <FormSection title={t("Axtarış sistemləri")}>
                <p className="text-meta text-muted-foreground">
                  {t("Öz SEO mətni olmayan səhifələr üçün standart başlıq və təsvir.")}
                </p>
                <LocaleTabs
                  filled={{
                    ru: Boolean(values.seoTitle?.ru || values.seoDescription?.ru),
                    en: Boolean(values.seoTitle?.en || values.seoDescription?.en),
                  }}
                >
                  {(locale) => (
                    <SeoFields
                      locale={locale}
                      title={values.seoTitle?.[locale] ?? ""}
                      description={values.seoDescription?.[locale] ?? ""}
                      onTitleChange={(next) =>
                        form.setValue(`seoTitle.${locale}`, next, { shouldDirty: true })
                      }
                      onDescriptionChange={(next) =>
                        form.setValue(`seoDescription.${locale}`, next, { shouldDirty: true })
                      }
                      fallbackTitle={values.seoTitle?.az || "Mebline"}
                      fallbackDescription={values.seoDescription?.az ?? ""}
                      path="/"
                      errors={{
                        title: errors.seoTitle?.[locale]?.message,
                        description: errors.seoDescription?.[locale]?.message,
                      }}
                    />
                  )}
                </LocaleTabs>
                {mediaPicker(
                  "ogImageId",
                  "Paylaşım şəkli (OG)",
                  "Link sosial şəbəkədə və ya mesajlaşmada paylaşılanda göstərilir. Tövsiyə: 1200 × 630 px, JPG və ya PNG.",
                )}
              </FormSection>
            </>
          }
          aside={
            <>
              <FormSection title={t("Loqo və ikon")}>
                <p className="text-meta text-muted-foreground">
                  {t("Yeni loqo hazırlanır: gələndə burada dəyişin. SVG faylı da seçmək olar.")}
                </p>
                {mediaPicker("logoLightId", "Loqo (açıq fon üçün)", "Ağ fonda, qaranlıq loqo.")}
                {mediaPicker(
                  "logoDarkId",
                  "Loqo (tünd fon üçün)",
                  "Şəkil və ya tünd fon üzərində, açıq loqo.",
                )}
                {mediaPicker(
                  "faviconId",
                  "Favikon",
                  "Brauzer vərəqində görünən kvadrat ikon, ən azı 512 × 512 px.",
                )}
              </FormSection>

              <FormSection title={t("Hüquqi məlumat")}>
                <FormField
                  control={form.control}
                  name="legalName"
                  label={t("Şirkətin adı (saytın aşağı hissəsi)")}
                  description={t(
                    "«MMC» yazılmadan, məsələn «Mebline». Saytın aşağı hissəsində © ilə göstərilir.",
                  )}
                  render={({ field, id, invalid, describedBy }) => (
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      id={id}
                      maxLength={160}
                      aria-invalid={invalid}
                      aria-describedby={describedBy}
                    />
                  )}
                />
              </FormSection>

              <FormSection title={t("Müraciət bildirişləri")}>
                <FormField
                  control={form.control}
                  name="quoteNotifyEmail"
                  label={t("Bildiriş e-poçtu")}
                  description={t(
                    "Saytdan gələn hər müraciət bu ünvana göndərilir. Boş qalsa, server tənzimləməsindəki ünvan istifadə olunur.",
                  )}
                  render={({ field, id, invalid, describedBy }) => (
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      id={id}
                      type="email"
                      inputMode="email"
                      maxLength={254}
                      aria-invalid={invalid}
                      aria-describedby={describedBy}
                    />
                  )}
                />
              </FormSection>

              <FormSection title={t("Kataloq faylı")}>
                {mediaPicker(
                  "catalogueFileId",
                  "Kataloq (PDF)",
                  "İstəyə bağlıdır. Saytda yükləmək üçün təklif olunan kataloq.",
                  "document",
                )}
              </FormSection>
            </>
          }
        />
        <FormActions className="md:hidden">{saveButton}</FormActions>
      </form>
      {guard.dialog}
    </FormProvider>
  );
}
