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
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/admin/format";
import { formRichText, formText, hasLocaleError } from "@/lib/admin/form-values";
import { useT } from "@/lib/admin/i18n/use-t";
import {
  useCreatePostMutation,
  useDeletePostMutation,
  useUpdatePostMutation,
} from "@/lib/api/content";
import { apiErrorMessage } from "@/lib/api/types";
import { richTextToPlain, type RichTextDoc } from "@/lib/content/rich-text";
import { localePath, locales, type Locale } from "@/lib/i18n/config";
import { routes } from "@/lib/routes";
import { slugify } from "@/lib/slug";
import type { MediaDto } from "@/lib/validation/media";
import { useContentText } from "@/lib/store/hooks";
import {
  postInputSchema,
  type PostDetailDto,
  type PostInput,
  type PostState,
} from "@/lib/validation/posts";

import { PostStatus } from "./post-status";
import { deletePostDescription } from "./posts-view";
import { PublishDateInput } from "./publish-date-input";

function toFormValues(post: PostDetailDto | null): PostInput {
  return {
    title: formText(post?.title),
    slug: formText(post?.slug),
    excerpt: formText(post?.excerpt),
    content: formRichText(post?.content),
    coverId: post?.coverId ?? null,
    status: post?.status ?? "draft",
    publishedAt: post?.publishedAt ?? null,
    seoTitle: formText(post?.seoTitle),
    seoDescription: formText(post?.seoDescription),
  };
}

function stateOf(status: "draft" | "published", publishedAt: string | null): PostState {
  if (status === "draft") return "draft";
  return publishedAt && new Date(publishedAt).getTime() > Date.now() ? "scheduled" : "published";
}

export function PostForm({ post }: { post: PostDetailDto | null }) {
  const text = useContentText();
  const t = useT();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [cover, setCover] = useState<MediaDto | null>(post?.cover ?? null);
  const [slugTouched, setSlugTouched] = useState<Record<Locale, boolean>>({
    az: Boolean(post),
    ru: Boolean(post?.slug.ru),
    en: Boolean(post?.slug.en),
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [createPost] = useCreatePostMutation();
  const [updatePost] = useUpdatePostMutation();
  const [deletePost] = useDeletePostMutation();

  const form = useZodForm(postInputSchema, { defaultValues: toFormValues(post) });
  const { isDirty, isSubmitting, errors } = form.formState;
  const guard = useUnsavedChangesGuard(isDirty && !isSubmitting);
  const values = useWatch({ control: form.control });
  const title = values.title;
  const status = values.status ?? "draft";
  const state = stateOf(status, values.publishedAt ?? null);

  const textInvalid: Partial<Record<Locale, boolean>> = {};
  for (const locale of locales) {
    textInvalid[locale] =
      hasLocaleError(errors.title, locale) ||
      hasLocaleError(errors.slug, locale) ||
      hasLocaleError(errors.excerpt, locale) ||
      hasLocaleError(errors.content, locale);
  }

  const onSubmit = form.handleSubmit(
    async (payload) => {
      setError(null);
      const publishedAt =
        payload.publishedAt ?? (payload.status === "published" ? new Date().toISOString() : null);
      try {
        if (post) {
          await updatePost({ id: post.id, ...payload, publishedAt }).unwrap();
          form.setValue("publishedAt", publishedAt);
          form.reset(form.getValues());
          toast.success(
            stateOf(payload.status, publishedAt) === "scheduled"
              ? t("Saxlanıldı. Yazı {date} tarixində dərc olunacaq.", {
                  date: formatDateTime(publishedAt, t.locale),
                })
              : payload.status === "published"
                ? t("Saxlanıldı, saytda yeniləndi.")
                : t("Saxlanıldı."),
          );
        } else {
          const created = await createPost({ ...payload, publishedAt }).unwrap();
          guard.release();
          toast.success(t("Yazı yaradıldı."));
          router.replace(`/admin/blog/${created.id}`);
        }
      } catch (caught) {
        setError(applyServerErrors(form, caught));
      }
    },
    () => setError(t("Formada səhvlər var. Qırmızı sahələri düzəldin.")),
  );

  async function remove(): Promise<boolean> {
    if (!post) return false;
    try {
      await deletePost(post.id).unwrap();
      guard.release();
      toast.success(t("«{name}» silindi.", { name: text(post.title) }));
      router.push("/admin/blog");
      return true;
    } catch (caught) {
      toast.error(apiErrorMessage(caught));
      return false;
    }
  }

  const heading = post ? text(post.title) : t("Yeni yazı");
  const publicHref =
    post && post.state === "published" ? localePath("az", routes.post(post.slug.az)) : null;

  const saveButton = (
    <Button type="submit" form="post-form" disabled={isSubmitting}>
      {isSubmitting ? t("Saxlanılır") : post ? t("Saxla") : t("Yarat")}
    </Button>
  );

  return (
    <>
      <PageHeader
        title={heading}
        description={
          post ? (
            <span className="flex flex-wrap items-center gap-2">
              <PostStatus state={post.state} publishedAt={post.publishedAt} />
              <span>
                {t("Son dəyişiklik: {date}", { date: formatDateTime(post.updatedAt, t.locale) })}
              </span>
            </span>
          ) : (
            t(
              "Yazını qaralama kimi yaradın, hazır olanda dərc edin və ya tarix seçib planlaşdırın.",
            )
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
      <form id="post-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
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
                          entity="post"
                          locale={locale}
                          excludeId={post?.id}
                          source={title?.[locale] ?? ""}
                          pathFor={routes.post}
                          invalid={invalid}
                          describedBy={describedBy}
                        />
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`excerpt.${locale}`}
                      label={t("Qısa məzmun ({locale})", { locale: locale.toUpperCase() })}
                      description={t("Bloq siyahısında başlığın altında göstərilir.")}
                      render={({ field, id, invalid, describedBy }) => (
                        <Textarea
                          {...field}
                          value={field.value ?? ""}
                          id={id}
                          rows={3}
                          maxLength={500}
                          aria-invalid={invalid}
                          aria-describedby={describedBy}
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
                      ? t("Dərc tarixi çatanda yazı saytda görünür.")
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
                  name="publishedAt"
                  label={t("Dərc tarixi")}
                  description={t(
                    "Bakı vaxtı (Asia/Baku, UTC+4). Boş qalsa, dərc edəndə indiki vaxt yazılır. Gələcək tarix yazını planlaşdırır.",
                  )}
                  render={({ field, id, invalid, describedBy }) => (
                    <PublishDateInput
                      id={id}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      invalid={invalid}
                      describedBy={describedBy}
                    />
                  )}
                />
                {state === "scheduled" ? (
                  <p className="text-meta" aria-live="polite">
                    {t("Yazı {date} tarixində saytda görünəcək.", {
                      date: formatDateTime(values.publishedAt, t.locale),
                    })}
                  </p>
                ) : null}
                {post ? (
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-meta">
                    <dt className="text-muted-foreground">{t("Yaradılıb")}</dt>
                    <dd>{formatDateTime(post.createdAt, t.locale)}</dd>
                  </dl>
                ) : null}
                {post ? (
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
                  description={t("Bloq siyahısında, yazının yuxarısında və paylaşanda göstərilir.")}
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
                  (
                    values.excerpt?.[locale] ||
                    values.excerpt?.az ||
                    richTextToPlain(
                      (values.content?.[locale] ??
                        values.content?.az ??
                        null) as RichTextDoc | null,
                    )
                  ).slice(0, 160)
                }
                path={(locale) => routes.post(values.slug?.[locale] || values.slug?.az || "")}
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
      {post ? (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={t("«{name}» silinsin?", { name: heading })}
          description={t(deletePostDescription)}
          confirmLabel={t("Sil")}
          destructive
          onConfirm={remove}
        />
      ) : null}
    </>
  );
}
