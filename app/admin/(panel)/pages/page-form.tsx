"use client";

import { ExternalLink, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useWatch } from "react-hook-form";
import { toast } from "sonner";

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
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { SeoSection } from "@/components/admin/seo-section";
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
import { formatDateTime } from "@/lib/admin/format";
import { formRichText, formText, hasLocaleError } from "@/lib/admin/form-values";
import { useT } from "@/lib/admin/i18n/use-t";
import {
  useCreatePageMutation,
  useDeletePageMutation,
  useUpdatePageMutation,
} from "@/lib/api/content";
import { apiErrorMessage } from "@/lib/api/types";
import { richTextToPlain, type RichTextDoc } from "@/lib/content/rich-text";
import { localePath, locales, type Locale } from "@/lib/i18n/config";
import { routes } from "@/lib/routes";
import { slugify } from "@/lib/slug";
import type { MediaDto } from "@/lib/validation/media";
import { useContentText } from "@/lib/store/hooks";
import {
  freePageLabel,
  pageInputSchema,
  pageKindLabels,
  type PageDetailDto,
  type PageInput,
} from "@/lib/validation/pages";

import { deletePageDescription } from "./pages-view";

function toFormValues(page: PageDetailDto | null): PageInput {
  return {
    title: formText(page?.title),
    slug: formText(page?.slug),
    content: formRichText(page?.content),
    coverId: page?.coverId ?? null,
    status: page?.status ?? "draft",
    seoTitle: formText(page?.seoTitle),
    seoDescription: formText(page?.seoDescription),
  };
}

export function PageForm({ page }: { page: PageDetailDto | null }) {
  const text = useContentText();
  const t = useT();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [cover, setCover] = useState<MediaDto | null>(page?.cover ?? null);
  const [slugTouched, setSlugTouched] = useState<Record<Locale, boolean>>({
    az: Boolean(page),
    ru: Boolean(page?.slug.ru),
    en: Boolean(page?.slug.en),
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [createPage] = useCreatePageMutation();
  const [updatePage] = useUpdatePageMutation();
  const [deletePage] = useDeletePageMutation();

  const form = useZodForm(pageInputSchema, { defaultValues: toFormValues(page) });
  const { isDirty, isSubmitting, errors } = form.formState;
  const guard = useUnsavedChangesGuard(isDirty && !isSubmitting);
  const values = useWatch({ control: form.control });
  const title = values.title;
  const status = values.status ?? "draft";

  const textInvalid: Partial<Record<Locale, boolean>> = {};
  for (const locale of locales) {
    textInvalid[locale] =
      hasLocaleError(errors.title, locale) ||
      hasLocaleError(errors.slug, locale) ||
      hasLocaleError(errors.content, locale);
  }

  const onSubmit = form.handleSubmit(
    async (payload) => {
      setError(null);
      try {
        if (page) {
          await updatePage({ id: page.id, ...payload }).unwrap();
          form.reset(form.getValues());
          toast.success(
            status === "published" ? t("Saxlanıldı, saytda yeniləndi.") : t("Saxlanıldı."),
          );
        } else {
          const created = await createPage(payload).unwrap();
          guard.release();
          toast.success(t("Səhifə yaradıldı."));
          router.replace(`/admin/pages/${created.id}`);
        }
      } catch (caught) {
        setError(applyServerErrors(form, caught));
      }
    },
    () => setError(t("Formada səhvlər var. Qırmızı sahələri düzəldin.")),
  );

  async function remove(): Promise<boolean> {
    if (!page) return false;
    try {
      await deletePage(page.id).unwrap();
      guard.release();
      toast.success(t("«{name}» silindi.", { name: text(page.title) }));
      router.push("/admin/pages");
      return true;
    } catch (caught) {
      toast.error(apiErrorMessage(caught));
      return false;
    }
  }

  const heading = page ? text(page.title) : t("Yeni səhifə");
  const publicHref =
    page && page.status === "published" ? localePath("az", routes.page(page.slug.az)) : null;

  const saveButton = (
    <Button type="submit" form="page-form" disabled={isSubmitting}>
      {isSubmitting ? t("Saxlanılır") : page ? t("Saxla") : t("Yarat")}
    </Button>
  );

  return (
    <>
      <PageHeader
        title={heading}
        description={
          page ? (
            <span className="flex flex-wrap items-center gap-2">
              <PublishStatusBadge status={page.status} />
              <span>{t.message(page.kind ? pageKindLabels[page.kind] : freePageLabel)}</span>
              <span>
                {t("Son dəyişiklik: {date}", { date: formatDateTime(page.updatedAt, t.locale) })}
              </span>
            </span>
          ) : (
            t("Sərbəst səhifə saytın kökündə öz ünvanı ilə açılır.")
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
            <span className="max-md:hidden">{saveButton}</span>
          </>
        }
      />
      <form id="page-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <FormAlert message={error} />
        <FormLayout
          main={
            <FormSection title={t("Məzmun")}>
              <LocaleTabs
                invalid={textInvalid}
                filled={{ ru: Boolean(title?.ru), en: Boolean(title?.en) }}
              >
                {(locale) => (
                  <>
                    <FormField
                      control={form.control}
                      name={`title.${locale}`}
                      label={t("Başlıq ({locale})", { locale: locale.toUpperCase() })}
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
                          entity="page"
                          locale={locale}
                          excludeId={page?.id}
                          source={title?.[locale] ?? ""}
                          pathFor={routes.page}
                          invalid={invalid}
                          describedBy={describedBy}
                        />
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`content.${locale}`}
                      label={t("Mətn ({locale})", { locale: locale.toUpperCase() })}
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
                {page ? (
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-meta">
                    <dt className="text-muted-foreground">{t("Yaradılıb")}</dt>
                    <dd>{formatDateTime(page.createdAt, t.locale)}</dd>
                    <dt className="text-muted-foreground">{t("Menyuda")}</dt>
                    <dd>
                      {page.menuItemCount
                        ? t("{count} keçid", { count: page.menuItemCount })
                        : t("yoxdur")}
                    </dd>
                  </dl>
                ) : null}
                {page?.kind ? (
                  <p className="text-meta text-muted-foreground">
                    {t(
                      "«{name}» sistem səhifəsidir: sayt ona bağlıdır, ona görə silinmir. Saytdan götürmək üçün qaralamaya çevirin.",
                      { name: t.message(pageKindLabels[page.kind]) },
                    )}
                  </p>
                ) : page ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="self-start"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 strokeWidth={1.5} />
                    {t("Sil")}
                  </Button>
                ) : null}
              </FormSection>
              <FormSection title={t("Örtük şəkli")}>
                <FormField
                  control={form.control}
                  name="coverId"
                  label={t("Şəkil")}
                  description={t("Səhifənin yuxarısında və sosial şəbəkədə paylaşanda göstərilir.")}
                  render={({ field, id, invalid, describedBy }) => (
                    <ImagePicker
                      id={id}
                      label={t("Örtük")}
                      value={cover}
                      invalid={invalid}
                      describedBy={describedBy}
                      onChange={(media) => {
                        setCover(media);
                        field.onChange(media?.id ?? null);
                      }}
                    />
                  )}
                />
              </FormSection>
              <SeoSection
                title={values.seoTitle}
                description={values.seoDescription}
                onTitleChange={(locale, next) =>
                  form.setValue(`seoTitle.${locale}`, next, { shouldDirty: true })
                }
                onDescriptionChange={(locale, next) =>
                  form.setValue(`seoDescription.${locale}`, next, { shouldDirty: true })
                }
                fallbackTitle={(locale) => `${title?.[locale] || title?.az || ""} | Mebline`}
                fallbackDescription={(locale) =>
                  richTextToPlain(
                    (values.content?.[locale] ?? values.content?.az ?? null) as RichTextDoc | null,
                  ).slice(0, 160)
                }
                path={(locale) => routes.page(values.slug?.[locale] || values.slug?.az || "")}
                errors={(locale) => ({
                  title: errors.seoTitle?.[locale]?.message,
                  description: errors.seoDescription?.[locale]?.message,
                })}
              />
            </>
          }
        />
        <FormActions className="md:hidden">{saveButton}</FormActions>
      </form>
      {guard.dialog}
      {page && !page.kind ? (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={t("«{name}» silinsin?", { name: heading })}
          description={deletePageDescription(t, page.menuItemCount)}
          confirmLabel={t("Sil")}
          destructive
          onConfirm={remove}
        />
      ) : null}
    </>
  );
}
