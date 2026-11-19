"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useWatch } from "react-hook-form";
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
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { SeoFields } from "@/components/admin/seo-fields";
import { SlugInput } from "@/components/admin/slug-input";
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
} from "@/lib/admin/form-values";
import { useT } from "@/lib/admin/i18n/use-t";
import { useCreateCategoryMutation, useUpdateCategoryMutation } from "@/lib/api/admin";
import { richTextToPlain, type RichTextDoc } from "@/lib/content/rich-text";
import { locales, type Locale } from "@/lib/i18n/config";
import { routes } from "@/lib/routes";
import { slugify } from "@/lib/slug";
import {
  categoryInputSchema,
  type CategoryDetailDto,
  type CategoryInput,
  type CategoryNodeDto,
} from "@/lib/validation/categories";
import type { MediaDto } from "@/lib/validation/media";
import { useContentText } from "@/lib/store/hooks";

import { DeleteCategoryDialog } from "./delete-category-dialog";

const rootValue = "root";

function toFormValues(category: CategoryDetailDto | null, parentId: string | null): CategoryInput {
  const text = formText;
  return {
    name: text(category?.name ?? null),
    slug: text(category?.slug ?? null),
    description: formRichText(category?.description),
    parentId: category ? category.parentId : parentId,
    imageId: category?.imageId ?? null,
    isActive: category?.isActive ?? true,
    seoTitle: text(category?.seoTitle ?? null),
    seoDescription: text(category?.seoDescription ?? null),
  };
}

function hasLocaleError(value: unknown, locale: Locale): boolean {
  return Boolean(value && typeof value === "object" && locale in value);
}

export function CategoryForm({
  category,
  categories,
  defaultParentId = null,
}: {
  category: CategoryDetailDto | null;
  categories: CategoryNodeDto[];
  defaultParentId?: string | null;
}) {
  const t = useT();
  const text = useContentText();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<MediaDto | null>(category?.image ?? null);
  const [slugTouched, setSlugTouched] = useState<Record<Locale, boolean>>({
    az: Boolean(category),
    ru: Boolean(category?.slug.ru),
    en: Boolean(category?.slug.en),
    de: Boolean(category?.slug.de),
  });
  const [deleting, setDeleting] = useState(false);
  const [createCategory] = useCreateCategoryMutation();
  const [updateCategory] = useUpdateCategoryMutation();
  const form = useZodForm(categoryInputSchema, {
    defaultValues: toFormValues(category, defaultParentId),
  });
  const { isDirty, isSubmitting, errors } = form.formState;
  const guard = useUnsavedChangesGuard(isDirty && !isSubmitting);
  const values = useWatch({ control: form.control });
  const name = values.name;

  const node = category ? categories.find((item) => item.id === category.id) : undefined;
  const hasChildren = Boolean(category && categories.some((item) => item.parentId === category.id));
  const parents = categories
    .filter((item) => !item.parentId && item.id !== category?.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const textInvalid: Partial<Record<Locale, boolean>> = {};
  for (const locale of locales) {
    textInvalid[locale] =
      hasLocaleError(errors.name, locale) ||
      hasLocaleError(errors.slug, locale) ||
      hasLocaleError(errors.description, locale);
  }

  const onSubmit = form.handleSubmit(
    async (payload) => {
      setError(null);
      try {
        if (category) {
          await updateCategory({ id: category.id, ...payload }).unwrap();
          form.reset(form.getValues());
          toast.success(t("Saxlanıldı, saytda yeniləndi."));
        } else {
          const created = await createCategory(payload).unwrap();
          guard.release();
          toast.success(t("Kateqoriya yaradıldı."));
          router.replace(`/admin/categories/${created.id}`);
        }
      } catch (caught) {
        setError(applyServerErrors(form, caught));
      }
    },
    () => setError(t("Formada səhvlər var. Qırmızı sahələri düzəldin.")),
  );

  const saveButton = (
    <Button type="submit" form="category-form" disabled={isSubmitting}>
      {isSubmitting ? t("Saxlanılır") : category ? t("Saxla") : t("Yarat")}
    </Button>
  );

  return (
    <>
      <PageHeader
        title={category ? text(category.name) : t("Yeni kateqoriya")}
        description={
          category
            ? `${t("{count} məhsul", { count: category.productCount })} · ${t("Son dəyişiklik: {date}", { date: formatDateTime(category.updatedAt, t.locale) })}`
            : t("Kateqoriya saytın kataloq menyusunda və filtrlərində görünür.")
        }
        actions={<span className="max-md:hidden">{saveButton}</span>}
      />
      <form id="category-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <FormAlert message={error} />
        <FormLayout
          main={
            <FormSection title={t("Əsas məlumat")}>
              <LocaleTabs
                onCopyFromDefault={(locale) =>
                  copyEmptyFromDefault(form, ["name", "description"], locale)
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
                          maxLength={120}
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
                          entity="category"
                          locale={locale}
                          excludeId={category?.id}
                          source={name?.[locale] ?? ""}
                          pathFor={routes.category}
                          invalid={invalid}
                          describedBy={describedBy}
                        />
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`description.${locale}`}
                      label={t("Təsvir ({locale})", { locale: locale.toUpperCase() })}
                      description={t("Kateqoriya səhifəsində məhsulların altında göstərilir.")}
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
          }
          aside={
            <>
              <FormSection title={t("Yerləşmə")}>
                <FormField
                  control={form.control}
                  name="isActive"
                  label={t("Saytda göstər")}
                  description={t("Gizli kateqoriya menyuda və kataloqda görünmür.")}
                  render={({ field, id, describedBy }) => (
                    <Switch
                      id={id}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-describedby={describedBy}
                    />
                  )}
                />
                <FormField
                  control={form.control}
                  name="parentId"
                  label={t("Üst kateqoriya")}
                  description={
                    hasChildren
                      ? t("Alt kateqoriyaları olduğu üçün əsas səviyyədə qalır.")
                      : t("Sıranı kateqoriyalar siyahısında sürüşdürərək dəyişin.")
                  }
                  render={({ field, id, invalid, describedBy }) => (
                    <Select
                      value={field.value ?? rootValue}
                      onValueChange={(value) => field.onChange(value === rootValue ? null : value)}
                      disabled={hasChildren}
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
                        <SelectItem value={rootValue}>{t("Əsas səviyyə")}</SelectItem>
                        {parents.map((parent) => (
                          <SelectItem key={parent.id} value={parent.id}>
                            {text(parent.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FormField
                  control={form.control}
                  name="imageId"
                  label={t("Şəkil")}
                  description={t("Kataloq menyusunda və kateqoriya kartında.")}
                  render={({ field, id, invalid, describedBy }) => (
                    <ImagePicker
                      id={id}
                      value={image}
                      invalid={invalid}
                      describedBy={describedBy}
                      onChange={(media) => {
                        setImage(media);
                        field.onChange(media?.id ?? null);
                      }}
                    />
                  )}
                />
                {category && node ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="self-start"
                    onClick={() => setDeleting(true)}
                  >
                    <Trash2 strokeWidth={1.5} />
                    {t("Sil")}
                  </Button>
                ) : null}
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
                        (values.description?.[locale] ??
                          values.description?.az ??
                          null) as RichTextDoc | null,
                      ).slice(0, 160)}
                      path={routes.category(values.slug?.[locale] || values.slug?.az || "")}
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
      {deleting && node ? (
        <DeleteCategoryDialog
          category={node}
          categories={categories}
          hasChildren={hasChildren}
          onClose={() => setDeleting(false)}
          redirectTo="/admin/categories"
        />
      ) : null}
    </>
  );
}
