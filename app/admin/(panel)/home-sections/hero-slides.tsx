"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";

import { FormField } from "@/components/admin/form";
import { ImagePicker } from "@/components/admin/image-picker";
import { LocaleTabs } from "@/components/admin/locale-tabs";
import { DragHandle, SortableList } from "@/components/admin/sortable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { hasLocaleError } from "@/lib/admin/form-values";
import { useT } from "@/lib/admin/i18n/use-t";
import { locales, type Locale } from "@/lib/i18n/config";
import type { HomeSectionsInput } from "@/lib/validation/home-sections";
import type { MediaDto } from "@/lib/validation/media";
import {
  heroSlideImageError,
  heroSlideLimit,
  heroSlideMinWidth,
  heroSlideMobileImageError,
  heroSlideMobileMinWidth,
} from "@/lib/validation/settings";

type ArrayErrors = { message?: string; root?: { message?: string } } | undefined;

export function HeroSlides({
  mediaById,
  remember,
}: {
  mediaById: Map<string, MediaDto>;
  remember: (media: MediaDto) => void;
}) {
  const t = useT();
  const form = useFormContext<HomeSectionsInput>();
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "heroSlides",
  });
  const slides = useWatch({ control: form.control, name: "heroSlides" }) ?? [];
  const errors = form.formState.errors.heroSlides;
  const rowErrors = Array.isArray(errors) ? errors : [];
  const listMessage = (errors as ArrayErrors)?.message ?? (errors as ArrayErrors)?.root?.message;
  const name = (index: number) => slides[index]?.title?.az || `${t("Slayd")} ${index + 1}`;

  function textInvalid(index: number): Partial<Record<Locale, boolean>> {
    const row = rowErrors[index];
    return Object.fromEntries(
      locales.map((locale) => [
        locale,
        hasLocaleError(row?.title, locale) || hasLocaleError(row?.lead, locale),
      ]),
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {fields.length ? (
        <SortableList
          items={fields}
          getId={(field) => field.id}
          getLabel={(field) => name(fields.findIndex((item) => item.id === field.id))}
          onReorder={(from, to) => move(from, to)}
          className="flex flex-col gap-3"
          itemClassName="rounded-sm border border-border bg-white"
        >
          {(field, index, { handle }) => {
            const slide = slides[index];
            const image = slide?.imageId ? (mediaById.get(slide.imageId) ?? null) : null;
            const imageProblem =
              image && !rowErrors[index]?.imageId ? heroSlideImageError(image) : null;
            const mobileImage = slide?.mobileImageId
              ? (mediaById.get(slide.mobileImageId) ?? null)
              : null;
            const mobileProblem =
              mobileImage && !rowErrors[index]?.mobileImageId
                ? heroSlideMobileImageError(mobileImage)
                : null;
            return (
              <div className="flex flex-col gap-4 p-3 md:p-4">
                <div className="flex items-center gap-1">
                  <DragHandle
                    label={t("{name}: yerini dəyiş", { name: name(index) })}
                    {...handle}
                  />
                  <h3 className="mr-auto min-w-0 truncate text-meta font-medium">
                    {index + 1}. {name(index)}
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("{name}: yuxarı", { name: name(index) })}
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                    className="max-md:size-11"
                  >
                    <ArrowUp strokeWidth={1.5} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("{name}: aşağı", { name: name(index) })}
                    disabled={index === fields.length - 1}
                    onClick={() => move(index, index + 1)}
                    className="max-md:size-11"
                  >
                    <ArrowDown strokeWidth={1.5} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("{name}: sil", { name: name(index) })}
                    onClick={() => remove(index)}
                    className="max-md:size-11"
                  >
                    <Trash2 strokeWidth={1.5} />
                  </Button>
                </div>
                <FormField
                  control={form.control}
                  name={`heroSlides.${index}.imageId`}
                  label={t("Şəkil")}
                  required
                  description={
                    imageProblem ? (
                      <span className="text-destructive">{t.message(imageProblem)}</span>
                    ) : (
                      t(
                        "Üfüqi şəkil, eni ən azı {width} px. Tövsiyə: 2400 × 1200 px, JPG və ya WebP.",
                        { width: heroSlideMinWidth },
                      )
                    )
                  }
                  render={({ field: control, id, invalid, describedBy }) => (
                    <ImagePicker
                      id={id}
                      label={t("Şəkil")}
                      value={image}
                      invalid={invalid}
                      describedBy={describedBy}
                      onChange={(media) => {
                        if (media) remember(media);
                        control.onChange(media?.id ?? "");
                      }}
                    />
                  )}
                />
                <FormField
                  control={form.control}
                  name={`heroSlides.${index}.mobileImageId`}
                  label={t("Mobil şəkil")}
                  description={
                    mobileProblem ? (
                      <span className="text-destructive">{t.message(mobileProblem)}</span>
                    ) : (
                      t(
                        "İstəyə bağlıdır. Telefonda bu şaquli şəkil göstərilir, eni ən azı {width} px. Tövsiyə: 1200 × 1600 px. Boş qalsa, üfüqi şəkil kəsilərək göstərilir.",
                        { width: heroSlideMobileMinWidth },
                      )
                    )
                  }
                  render={({ field: control, id, invalid, describedBy }) => (
                    <ImagePicker
                      id={id}
                      label={t("Mobil şəkil")}
                      value={mobileImage}
                      invalid={invalid}
                      describedBy={describedBy}
                      onChange={(media) => {
                        if (media) remember(media);
                        control.onChange(media?.id ?? "");
                      }}
                    />
                  )}
                />
                <LocaleTabs
                  key={field.id}
                  invalid={textInvalid(index)}
                  filled={{
                    ru: Boolean(slide?.title?.ru || slide?.lead?.ru),
                    en: Boolean(slide?.title?.en || slide?.lead?.en),
                  }}
                >
                  {(locale) => (
                    <>
                      <FormField
                        control={form.control}
                        name={`heroSlides.${index}.title.${locale}`}
                        label={t("Başlıq ({locale})", { locale: locale.toUpperCase() })}
                        required={locale === "az"}
                        render={({ field: control, id, invalid, describedBy }) => (
                          <Input
                            {...control}
                            value={control.value ?? ""}
                            id={id}
                            maxLength={80}
                            aria-invalid={invalid}
                            aria-describedby={describedBy}
                          />
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`heroSlides.${index}.lead.${locale}`}
                        label={t("Qısa mətn ({locale})", { locale: locale.toUpperCase() })}
                        description={
                          locale === "az" ? t("İstəyə bağlıdır, bir-iki cümlə.") : undefined
                        }
                        render={({ field: control, id, invalid, describedBy }) => (
                          <Textarea
                            {...control}
                            value={control.value ?? ""}
                            id={id}
                            rows={2}
                            maxLength={200}
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
                  name={`heroSlides.${index}.href`}
                  label={t("Link")}
                  description={t(
                    "İstəyə bağlıdır. Saytdakı ünvan, məsələn /mehsullar, və ya https:// ilə tam link.",
                  )}
                  render={({ field: control, id, invalid, describedBy }) => (
                    <Input
                      {...control}
                      value={control.value ?? ""}
                      id={id}
                      inputMode="url"
                      autoComplete="off"
                      maxLength={500}
                      placeholder="/mehsullar"
                      aria-invalid={invalid}
                      aria-describedby={describedBy}
                    />
                  )}
                />
              </div>
            );
          }}
        </SortableList>
      ) : (
        <p className="text-meta text-muted-foreground">
          {t(
            "Slayd yoxdur. Bu halda sayt ana səhifənin yuxarısında geniş məhsul fotolarından ən çox {max} slaydı özü seçir.",
            { max: heroSlideLimit },
          )}
        </p>
      )}
      {listMessage ? (
        <p role="alert" className="text-meta text-destructive">
          {t.message(listMessage)}
        </p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        disabled={fields.length >= heroSlideLimit}
        onClick={() =>
          append({
            imageId: "",
            mobileImageId: "",
            title: { az: "", ru: "", en: "" },
            lead: { az: "", ru: "", en: "" },
            href: "",
          })
        }
      >
        <Plus strokeWidth={1.5} />
        {t("Slayd əlavə et")}
      </Button>
    </div>
  );
}
