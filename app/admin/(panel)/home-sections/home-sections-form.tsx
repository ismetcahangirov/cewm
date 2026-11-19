"use client";

import { useState } from "react";
import { Controller, FormProvider } from "react-hook-form";
import { toast } from "sonner";

import {
  applyServerErrors,
  FormActions,
  FormAlert,
  FormLayout,
  FormSection,
  useZodForm,
} from "@/components/admin/form";
import { PageHeader } from "@/components/admin/page-header";
import { ProductPicker } from "@/components/admin/product-picker";
import { useUnsavedChangesGuard } from "@/components/admin/unsaved-changes";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/admin/format";
import { formText } from "@/lib/admin/form-values";
import { useT } from "@/lib/admin/i18n/use-t";
import { useUpdateHomeSectionsMutation } from "@/lib/api/home-sections";
import {
  homeFeaturedLimit,
  homeFeaturedMax,
  homeSectionsInputSchema,
  type HomeSectionsDto,
  type HomeSectionsInput,
} from "@/lib/validation/home-sections";
import type { MediaDto } from "@/lib/validation/media";
import type { ProductOptionDto } from "@/lib/validation/products";

import { HeroFields } from "./hero-fields";
import { SectionList, type SectionDefaults } from "./section-list";

function toFormValues(data: HomeSectionsDto): HomeSectionsInput {
  return {
    hero: {
      headline: formText(data.hero?.headline),
      subline: formText(data.hero?.subline),
      ctaLabel: formText(data.hero?.ctaLabel),
      ctaHref: data.hero?.ctaHref ?? "",
      filmId: data.hero?.filmId ?? "",
    },
    sections: data.sections.map((section) =>
      section.key === "custom"
        ? {
            key: "custom",
            id: section.id,
            visible: section.visible,
            title: formText(section.title),
            block: {
              eyebrow: formText(section.block.eyebrow),
              body: section.block.body,
              linkLabel: formText(section.block.linkLabel),
              href: section.block.href ?? "",
              mediaKind: section.block.mediaKind,
              mediaId: section.block.mediaId ?? "",
              posterId: section.block.posterId ?? "",
              autoplay: section.block.autoplay,
              sound: section.block.sound,
              layout: section.block.layout,
              mediaWidth: section.block.mediaWidth,
              tone: section.block.tone,
            },
          }
        : { key: section.key, visible: section.visible, title: formText(section.title) },
    ),
    featuredIds: data.featured.map((product) => product.id),
  };
}

export function HomeSectionsForm({
  data,
  defaults,
}: {
  data: HomeSectionsDto;
  defaults: SectionDefaults;
}) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [mediaById, setMediaById] = useState(
    () => new Map(data.media.map((item) => [item.id, item])),
  );
  const [featured, setFeatured] = useState<ProductOptionDto[]>(data.featured);
  const [updateHomeSections] = useUpdateHomeSectionsMutation();
  const form = useZodForm(homeSectionsInputSchema, { defaultValues: toFormValues(data) });
  const { isDirty, isSubmitting } = form.formState;
  const guard = useUnsavedChangesGuard(isDirty && !isSubmitting);

  function remember(media: MediaDto) {
    setMediaById((current) => new Map(current).set(media.id, media));
  }

  const onSubmit = form.handleSubmit(
    async () => {
      setError(null);
      try {
        const saved = await updateHomeSections(form.getValues()).unwrap();
        setFeatured(saved.featured);
        form.reset(toFormValues(saved));
        toast.success(t("Saxlanıldı, saytda yeniləndi."));
      } catch (caught) {
        setError(applyServerErrors(form, caught));
      }
    },
    () => setError(t("Formada səhvlər var. Qırmızı sahələri düzəldin.")),
  );

  const saveButton = (
    <Button type="submit" form="home-sections-form" disabled={isSubmitting}>
      {isSubmitting ? t("Saxlanılır") : t("Saxla")}
    </Button>
  );

  return (
    <FormProvider {...form}>
      <PageHeader
        title={t("Ana səhifə bölmələri")}
        description={
          data.updatedAt
            ? t("Hero, bölmələrin sırası və seçilmiş məhsullar. Son dəyişiklik: {date}", {
                date: formatDateTime(data.updatedAt, t.locale),
              })
            : t("Hero, bölmələrin sırası və seçilmiş məhsullar.")
        }
        actions={<span className="max-md:hidden">{saveButton}</span>}
      />
      <form id="home-sections-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <FormAlert message={error} />
        <FormLayout
          main={
            <>
              <FormSection title={t("Hero")}>
                <p className="text-meta text-muted-foreground">
                  {t(
                    "Ana səhifənin ən yuxarısı: başlıq, alt mətn, düymə və scroll ilə oynadılan film.",
                  )}
                </p>
                <HeroFields films={data.films} />
              </FormSection>

              <FormSection title={t("Bölmələr")}>
                <p className="text-meta text-muted-foreground">
                  {t(
                    "Hero-dan sonra bu sıra ilə göstərilir. Gizlədilən bölmə saytda görünmür, amma ayarları saxlanılır. «Bölmə əlavə et» ilə başlıq, mətn, düymə, şəkil və ya video olan öz bölmənizi qurun.",
                  )}
                </p>
                <SectionList defaults={defaults} mediaById={mediaById} remember={remember} />
              </FormSection>

              <section id="featured-products" className="scroll-mt-20">
                <FormSection title={t("Seçilmiş məhsullar")}>
                  <p className="text-meta text-muted-foreground">
                    {t(
                      "Saytda bu sıra ilə ilk {count} dərc olunmuş məhsul göstərilir. Siyahı boşdursa, kataloqun ilk {count} məhsulu çıxır. Məhsul formasındakı «Ana səhifədə göstər» işarəsi də bu siyahını dəyişir.",
                      { count: homeFeaturedLimit },
                    )}
                  </p>
                  <Controller
                    control={form.control}
                    name="featuredIds"
                    render={({ field, fieldState }) => (
                      <div className="flex flex-col gap-2">
                        <ProductPicker
                          value={field.value
                            .map((id) => featured.find((item) => item.id === id))
                            .filter((item) => item !== undefined)}
                          max={homeFeaturedMax}
                          invalid={fieldState.invalid}
                          onChange={(next) => {
                            setFeatured((current) => [
                              ...current,
                              ...next.filter((item) => !current.some((old) => old.id === item.id)),
                            ]);
                            field.onChange(next.map((item) => item.id));
                          }}
                        />
                        {fieldState.error?.message ? (
                          <p className="text-meta text-destructive">
                            {t.message(fieldState.error.message)}
                          </p>
                        ) : null}
                      </div>
                    )}
                  />
                </FormSection>
              </section>
            </>
          }
        />
        <FormActions className="md:hidden">{saveButton}</FormActions>
      </form>
      {guard.dialog}
    </FormProvider>
  );
}
