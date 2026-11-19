"use client";

import { Copy, ExternalLink, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Controller, FormProvider, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { CategoryMultiSelect } from "@/components/admin/category-select";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
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
import { ProductPicker } from "@/components/admin/product-picker";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { SeoFields } from "@/components/admin/seo-fields";
import { SlugInput } from "@/components/admin/slug-input";
import { PublishStatusBadge } from "@/components/admin/status-badge";
import { useUnsavedChangesGuard } from "@/components/admin/unsaved-changes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatDateTime } from "@/lib/admin/format";
import {
  copyEmptyFromDefault,
  filledLocales,
  formRichText,
  formText,
  hasLocaleError,
} from "@/lib/admin/form-values";
import { useT } from "@/lib/admin/i18n/use-t";
import {
  useBulkProductsMutation,
  useCreateProductMutation,
  useDuplicateProductMutation,
  useUpdateProductMutation,
} from "@/lib/api/admin";
import { apiErrorMessage } from "@/lib/api/types";
import { richTextToPlain, type RichTextDoc } from "@/lib/content/rich-text";
import { localePath, locales, type Locale } from "@/lib/i18n/config";
import type { Localized } from "@/lib/i18n/localized";
import { routes } from "@/lib/routes";
import { slugify } from "@/lib/slug";
import type { BrandOptionDto } from "@/lib/validation/brands";
import type { CategoryNodeDto } from "@/lib/validation/categories";
import type { MediaDto } from "@/lib/validation/media";
import { useContentText } from "@/lib/store/hooks";
import {
  productInputSchema,
  type ProductDetailDto,
  type ProductInput,
  type ProductOptionDto,
} from "@/lib/validation/products";

import { ProductBenefits } from "./product-benefits";
import { ProductDocuments } from "./product-documents";
import { ProductGallery } from "./product-gallery";
import { ProductSpecs } from "./product-specs";

const emptyLocalized = { az: "", ru: "", en: "", de: "" };

const noBrand = "none";

function richText(value: Localized<RichTextDoc> | null) {
  return formRichText(value);
}

function toFormValues(product: ProductDetailDto | null): ProductInput {
  if (!product) {
    return {
      name: { ...emptyLocalized },
      slug: { ...emptyLocalized },
      sku: "",
      shortDescription: richText(null),
      description: richText(null),
      categoryIds: [],
      brandId: "",
      benefits: [],
      specs: [],
      images: [],
      documents: [],
      videoId: "",
      videoUrl: "",
      videoPosterId: "",
      relatedIds: [],
      seoTitle: { ...emptyLocalized },
      seoDescription: { ...emptyLocalized },
      status: "draft",
      isFeatured: false,
    };
  }
  const text = formText;
  return {
    name: text(product.name),
    slug: text(product.slug),
    sku: product.sku ?? "",
    shortDescription: richText(product.shortDescription),
    description: richText(product.description),
    categoryIds: product.categoryIds,
    brandId: product.brandId ?? "",
    benefits: product.benefits.map((benefit) => ({ text: text(benefit) })),
    specs: product.specs.map((spec) => ({
      label: text(spec.label),
      value: text(spec.value),
      unit: text(spec.unit),
      group: text(spec.group),
    })),
    images: product.images.map((image) => ({ mediaId: image.mediaId, alt: text(image.alt) })),
    documents: product.documents.map((document) => ({
      mediaId: document.mediaId,
      title: text(document.title),
    })),
    videoId: product.videoId ?? "",
    videoUrl: product.videoUrl ?? "",
    videoPosterId: product.videoPosterId ?? "",
    relatedIds: product.related.map((related) => related.id),
    seoTitle: text(product.seoTitle),
    seoDescription: text(product.seoDescription),
    status: product.status,
    isFeatured: product.isFeatured,
  };
}

export function ProductForm({
  product,
  categories,
  brands,
}: {
  product: ProductDetailDto | null;
  categories: CategoryNodeDto[];
  brands: BrandOptionDto[];
}) {
  const t = useT();
  const text = useContentText();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [mediaById, setMediaById] = useState(
    () => new Map((product?.media ?? []).map((item) => [item.id, item])),
  );
  const [related, setRelated] = useState<ProductOptionDto[]>(product?.related ?? []);
  const [slugTouched, setSlugTouched] = useState<Record<Locale, boolean>>({
    az: Boolean(product),
    ru: Boolean(product?.slug.ru),
    en: Boolean(product?.slug.en),
    de: Boolean(product?.slug.de),
  });
  const [confirmTrash, setConfirmTrash] = useState(false);
  const [createProduct] = useCreateProductMutation();
  const [updateProduct] = useUpdateProductMutation();
  const [duplicateProduct, { isLoading: duplicating }] = useDuplicateProductMutation();
  const [bulkProducts] = useBulkProductsMutation();

  const form = useZodForm(productInputSchema, { defaultValues: toFormValues(product) });
  const { isDirty, isSubmitting, errors } = form.formState;
  const guard = useUnsavedChangesGuard(isDirty && !isSubmitting);

  const values = useWatch({ control: form.control });
  const name = values.name;
  const status = values.status ?? "draft";

  function remember(media: MediaDto[]) {
    setMediaById((current) => {
      const next = new Map(current);
      for (const item of media) next.set(item.id, item);
      return next;
    });
  }

  const videoMedia = values.videoId ? (mediaById.get(values.videoId) ?? null) : null;
  const posterMedia = values.videoPosterId ? (mediaById.get(values.videoPosterId) ?? null) : null;

  const textInvalid = useMemo(() => {
    const result: Partial<Record<Locale, boolean>> = {};
    for (const locale of locales) {
      result[locale] =
        hasLocaleError(errors.name, locale) ||
        hasLocaleError(errors.slug, locale) ||
        hasLocaleError(errors.shortDescription, locale) ||
        hasLocaleError(errors.description, locale);
    }
    return result;
  }, [errors.name, errors.slug, errors.shortDescription, errors.description]);

  const onSubmit = form.handleSubmit(
    async (payload) => {
      setError(null);
      try {
        if (product) {
          await updateProduct({ id: product.id, ...payload }).unwrap();
          form.reset(form.getValues());
          toast.success(
            status === "published" ? t("Saxlanıldı, saytda yeniləndi.") : t("Saxlanıldı."),
          );
        } else {
          const created = await createProduct(payload).unwrap();
          guard.release();
          toast.success(t("Məhsul yaradıldı."));
          router.replace(`/admin/products/${created.id}`);
        }
      } catch (caught) {
        setError(applyServerErrors(form, caught));
      }
    },
    () => setError(t("Formada səhvlər var. Qırmızı sahələri düzəldin.")),
  );

  async function duplicate() {
    if (!product) return;
    try {
      const copy = await duplicateProduct(product.id).unwrap();
      toast.success(t("Kopya qaralama kimi yaradıldı."));
      router.push(`/admin/products/${copy.id}`);
    } catch (caught) {
      toast.error(apiErrorMessage(caught));
    }
  }

  async function changeTrash(action: "trash" | "restore"): Promise<boolean> {
    if (!product) return false;
    try {
      await bulkProducts({ action, ids: [product.id] }).unwrap();
      if (action === "trash") {
        guard.release();
        toast.success(t("Məhsul silinənlərə köçürüldü. 30 gün ərzində bərpa etmək olar."));
        router.push("/admin/products");
      } else {
        toast.success(t("Məhsul bərpa olundu və qaralamadadır."));
      }
      return true;
    } catch (caught) {
      toast.error(apiErrorMessage(caught));
      return false;
    }
  }

  const title = product ? text(product.name) : t("Yeni məhsul");
  const publicHref =
    product && product.status === "published" && !product.deletedAt
      ? localePath("az", routes.product(product.slug.az))
      : null;

  const saveButton = (
    <Button type="submit" form="product-form" disabled={isSubmitting}>
      {isSubmitting ? t("Saxlanılır") : product ? t("Saxla") : t("Yarat")}
    </Button>
  );

  return (
    <FormProvider {...form}>
      <PageHeader
        title={title}
        description={
          product ? (
            <span className="flex flex-wrap items-center gap-2">
              <PublishStatusBadge status={product.status} />
              <span>
                {t("Son dəyişiklik: {date}", {
                  date: formatDateTime(product.updatedAt, t.locale),
                })}
              </span>
            </span>
          ) : (
            t("Məhsulu əvvəl qaralama kimi yaradın, hazır olanda dərc edin.")
          )
        }
        actions={
          <>
            {publicHref ? (
              <Button asChild variant="ghost" size="sm">
                <a href={publicHref} target="_blank" rel="noreferrer">
                  <ExternalLink strokeWidth={1.5} />
                  {t("Saytda bax")}
                </a>
              </Button>
            ) : null}
            {product ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={duplicate}
                disabled={duplicating}
              >
                <Copy strokeWidth={1.5} />
                {t("Kopyasını yarat")}
              </Button>
            ) : null}
            <span className="max-md:hidden">{saveButton}</span>
          </>
        }
      />

      {product?.deletedAt ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border border-border bg-white p-4 text-meta">
          <p>{t("Bu məhsul silinənlərdədir və saytda görünmür.")}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => changeTrash("restore")}>
            <RotateCcw strokeWidth={1.5} />
            {t("Bərpa et")}
          </Button>
        </div>
      ) : null}

      <form id="product-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <FormAlert message={error} />
        <FormLayout
          main={
            <>
              <FormSection title={t("Əsas məlumat")}>
                <LocaleTabs
                  onCopyFromDefault={(locale) =>
                    copyEmptyFromDefault(form, ["name", "shortDescription", "description"], locale)
                  }
                  invalid={textInvalid}
                  filled={filledLocales(name)}
                >
                  {(locale) => (
                    <>
                      <FormField
                        control={form.control}
                        name={`name.${locale}`}
                        label={t("Ad ({locale})", { locale: locale.toUpperCase() })}
                        required={locale === "az"}
                        render={({ field, id, invalid, describedBy }) => (
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            id={id}
                            maxLength={200}
                            aria-invalid={invalid}
                            aria-describedby={describedBy}
                            onChange={(event) => {
                              field.onChange(event);
                              if (!slugTouched[locale]) {
                                form.setValue(`slug.${locale}`, slugify(event.target.value), {
                                  shouldDirty: true,
                                });
                              }
                            }}
                          />
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`slug.${locale}`}
                        label={t("Ünvan ({locale})", { locale: locale.toUpperCase() })}
                        required={locale === "az"}
                        render={({ field, id, invalid, describedBy }) => (
                          <SlugInput
                            id={id}
                            value={field.value ?? ""}
                            onChange={(next) => {
                              setSlugTouched((current) => ({ ...current, [locale]: true }));
                              field.onChange(next);
                            }}
                            onBlur={field.onBlur}
                            entity="product"
                            locale={locale}
                            excludeId={product?.id}
                            source={name?.[locale] ?? ""}
                            pathFor={routes.product}
                            invalid={invalid}
                            describedBy={describedBy}
                          />
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`shortDescription.${locale}`}
                        label={t("Qısa təsvir ({locale})", { locale: locale.toUpperCase() })}
                        description={t("Kataloq kartında və məhsulun yuxarısında göstərilir.")}
                        render={({ field, id, invalid, describedBy }) => (
                          <RichTextEditor
                            minimal
                            id={id}
                            value={field.value}
                            onChange={field.onChange}
                            invalid={invalid}
                            describedBy={describedBy}
                          />
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`description.${locale}`}
                        label={t("Ətraflı təsvir ({locale})", { locale: locale.toUpperCase() })}
                        render={({ field, id, invalid, describedBy }) => (
                          <RichTextEditor
                            id={id}
                            value={field.value}
                            onChange={field.onChange}
                            invalid={invalid}
                            describedBy={describedBy}
                          />
                        )}
                      />
                    </>
                  )}
                </LocaleTabs>
              </FormSection>

              <FormSection title={t("Şəkillər")}>
                <ProductGallery mediaById={mediaById} remember={remember} />
              </FormSection>

              <FormSection title={t("Üstünlüklər")}>
                <ProductBenefits />
              </FormSection>

              <FormSection title={t("Texniki göstəricilər")}>
                <ProductSpecs />
              </FormSection>

              <FormSection title={t("Sənədlər")}>
                <ProductDocuments mediaById={mediaById} remember={remember} />
              </FormSection>

              <FormSection title={t("Video")}>
                <p className="text-meta text-muted-foreground">
                  {t(
                    "İstəyə bağlıdır. Video faylı yükləyin və ya YouTube kimi xarici link yazın, ikisindən biri. Video bütün dillərdə eynidir.",
                  )}
                </p>
                <div className="grid gap-5 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="videoId"
                    label={t("Video faylı")}
                    render={({ field, id, invalid, describedBy }) => (
                      <ImagePicker
                        id={id}
                        kind="video"
                        label={t("Video")}
                        value={videoMedia}
                        invalid={invalid}
                        describedBy={describedBy}
                        onChange={(media) => {
                          if (media) remember([media]);
                          field.onChange(media?.id ?? "");
                          if (media) form.setValue("videoUrl", "", { shouldDirty: true });
                        }}
                      />
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="videoUrl"
                    label={t("Video linki")}
                    description={t("https:// ilə tam link, məsələn YouTube və ya Vimeo.")}
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
                    name="videoPosterId"
                    label={t("Poster şəkli")}
                    render={({ field, id, invalid, describedBy }) => (
                      <ImagePicker
                        id={id}
                        label={t("Poster")}
                        value={posterMedia}
                        invalid={invalid}
                        describedBy={describedBy}
                        onChange={(media) => {
                          if (media) remember([media]);
                          field.onChange(media?.id ?? "");
                        }}
                      />
                    )}
                  />
                </div>
              </FormSection>

              <FormSection title={t("Əlaqəli məhsullar")}>
                <Controller
                  control={form.control}
                  name="relatedIds"
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col gap-2">
                      <ProductPicker
                        value={related.filter((item) => field.value.includes(item.id))}
                        excludeId={product?.id}
                        invalid={fieldState.invalid}
                        onChange={(next) => {
                          setRelated(next);
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
            </>
          }
          aside={
            <>
              <FormSection title={t("Dərc")}>
                <FormField
                  control={form.control}
                  name="status"
                  label={t("Status")}
                  description={
                    status === "published"
                      ? t("Saxlayanda dəyişiklik saytda bir neçə saniyəyə görünür.")
                      : t("Qaralama saytda görünmür.")
                  }
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
                        <SelectItem value="draft">{t("Qaralama")}</SelectItem>
                        <SelectItem value="published">{t("Dərc olunub")}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isFeatured"
                  label={t("Ana səhifədə göstər")}
                  description={t(
                    "Seçilmiş məhsullar ana səhifədə görünür. Sıranı «Ana səhifə bölmələri»ndə dəyişin.",
                  )}
                  render={({ field, id, describedBy }) => (
                    <Switch
                      id={id}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      onBlur={field.onBlur}
                      aria-describedby={describedBy}
                    />
                  )}
                />
                {product ? (
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-meta">
                    <dt className="text-muted-foreground">{t("Yaradılıb")}</dt>
                    <dd>{formatDateTime(product.createdAt, t.locale)}</dd>
                    <dt className="text-muted-foreground">{t("Dərc olunub")}</dt>
                    <dd>{formatDateTime(product.publishedAt, t.locale)}</dd>
                  </dl>
                ) : null}
                {product && !product.deletedAt ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="self-start"
                    onClick={() => setConfirmTrash(true)}
                  >
                    <Trash2 strokeWidth={1.5} />
                    {t("Sil")}
                  </Button>
                ) : null}
              </FormSection>

              <FormSection title={t("Kataloq")}>
                <FormField
                  control={form.control}
                  name="categoryIds"
                  label={t("Kateqoriyalar")}
                  render={({ field, id, invalid, describedBy }) => (
                    <CategoryMultiSelect
                      id={id}
                      categories={categories}
                      value={field.value}
                      onChange={field.onChange}
                      invalid={invalid}
                      describedBy={describedBy}
                    />
                  )}
                />
                <FormField
                  control={form.control}
                  name="brandId"
                  label={t("Brend")}
                  render={({ field, id, invalid, describedBy }) => (
                    <Select
                      value={field.value || noBrand}
                      onValueChange={(value) => field.onChange(value === noBrand ? "" : value)}
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
                        <SelectItem value={noBrand}>{t("Brendsiz")}</SelectItem>
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sku"
                  label={t("Model kodu")}
                  description={t("İstehsalçının model kodu. Axtarışda istifadə olunur.")}
                  render={({ field, id, invalid, describedBy }) => (
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      id={id}
                      maxLength={64}
                      aria-invalid={invalid}
                      aria-describedby={describedBy}
                    />
                  )}
                />
              </FormSection>

              <FormSection title={t("Axtarış sistemləri")}>
                <LocaleTabs
                  filled={{
                    ru: Boolean(values.seoTitle?.ru || values.seoDescription?.ru),
                    en: Boolean(values.seoTitle?.en || values.seoDescription?.en),
                    de: Boolean(values.seoTitle?.de || values.seoDescription?.de),
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
                      fallbackTitle={`${name?.[locale] || name?.az || ""} | CEWM`}
                      fallbackDescription={richTextToPlain(
                        (values.shortDescription?.[locale] ??
                          values.shortDescription?.az ??
                          null) as RichTextDoc | null,
                      ).slice(0, 160)}
                      path={routes.product(values.slug?.[locale] || values.slug?.az || "")}
                      errors={{
                        title: errors.seoTitle?.[locale]?.message,
                        description: errors.seoDescription?.[locale]?.message,
                      }}
                    />
                  )}
                </LocaleTabs>
              </FormSection>
            </>
          }
        />
        <FormActions className="md:hidden">{saveButton}</FormActions>
      </form>

      {guard.dialog}
      <ConfirmDialog
        open={confirmTrash}
        onOpenChange={setConfirmTrash}
        title={t("«{name}» silinsin?", { name: title })}
        description={t(
          "Məhsul saytdan götürüləcək və silinənlərə düşəcək. 30 gün ərzində bərpa etmək olar.",
        )}
        confirmLabel={t("Sil")}
        destructive
        onConfirm={() => changeTrash("trash")}
      />
    </FormProvider>
  );
}
