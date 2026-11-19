"use client";

import { useFormContext, useWatch } from "react-hook-form";

import { FormField } from "@/components/admin/form";
import { ImagePicker } from "@/components/admin/image-picker";
import { LocaleTabs } from "@/components/admin/locale-tabs";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { hasLocaleError } from "@/lib/admin/form-values";
import type { MessageKey } from "@/lib/admin/i18n";
import { useT } from "@/lib/admin/i18n/use-t";
import { locales, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import {
  customBlockLayouts,
  customBlockMediaKinds,
  customBlockTones,
  mediaWidthRange,
  type CustomBlockLayout,
  type CustomBlockMediaKind,
  type CustomBlockTone,
  type HomeSectionsInput,
} from "@/lib/validation/home-sections";
import type { MediaDto } from "@/lib/validation/media";

const mediaKindLabels: Record<CustomBlockMediaKind, MessageKey> = {
  none: "Media yoxdur",
  image: "Şəkil",
  video: "Video",
};

const layoutLabels: Record<CustomBlockLayout, MessageKey> = {
  "media-left": "Media solda, mətn sağda",
  "media-right": "Media sağda, mətn solda",
  "media-top": "Media yuxarıda, mətn altda",
  background: "Media fon kimi, mətn üstündə",
};

const toneLabels: Record<CustomBlockTone, MessageKey> = {
  white: "Ağ",
  cream: "Krem",
  graphite: "Qrafit (tünd)",
};

type BlockErrors = {
  title?: Partial<Record<Locale, unknown>>;
  block?: {
    eyebrow?: Partial<Record<Locale, unknown>>;
    body?: Partial<Record<Locale, unknown>>;
    linkLabel?: Partial<Record<Locale, unknown>>;
  };
};

function LayoutPreview({
  layout,
  mediaWidth,
  hasMedia,
}: {
  layout: CustomBlockLayout;
  mediaWidth: number;
  hasMedia: boolean;
}) {
  const t = useT();
  const media = (
    <span className="flex items-center justify-center rounded-sm bg-muted-foreground/25 text-meta text-muted-foreground">
      {t("Media")}
    </span>
  );
  const text = (
    <span className="flex flex-col justify-center gap-1.5 p-2">
      <span className="h-2 w-3/4 rounded-full bg-foreground/60" />
      <span className="h-1.5 w-full rounded-full bg-muted-foreground/40" />
      <span className="h-1.5 w-5/6 rounded-full bg-muted-foreground/40" />
    </span>
  );
  if (!hasMedia) {
    return <div className="grid h-24 rounded-sm border border-border p-2">{text}</div>;
  }
  if (layout === "background") {
    return (
      <div className="relative grid h-24 items-end overflow-hidden rounded-sm border border-border bg-muted-foreground/25 p-2">
        <span className="w-1/2">{text}</span>
      </div>
    );
  }
  if (layout === "media-top") {
    return (
      <div className="grid h-28 grid-rows-[3fr_2fr] gap-2 rounded-sm border border-border p-2">
        {media}
        {text}
      </div>
    );
  }
  const columns =
    layout === "media-left" ? `${mediaWidth}% minmax(0, 1fr)` : `minmax(0, 1fr) ${mediaWidth}%`;
  return (
    <div
      className="grid h-24 gap-2 rounded-sm border border-border p-2"
      style={{ gridTemplateColumns: columns }}
    >
      {layout === "media-left" ? (
        <>
          {media}
          {text}
        </>
      ) : (
        <>
          {text}
          {media}
        </>
      )}
    </div>
  );
}

export function CustomSectionFields({
  index,
  mediaById,
  remember,
}: {
  index: number;
  mediaById: Map<string, MediaDto>;
  remember: (media: MediaDto) => void;
}) {
  const t = useT();
  const form = useFormContext<HomeSectionsInput>();
  const section = useWatch({ control: form.control, name: `sections.${index}` });
  const block = section?.key === "custom" ? section.block : undefined;
  const errors = (form.formState.errors.sections as BlockErrors[] | undefined)?.[index];
  const mediaKind = block?.mediaKind ?? "none";
  const layout = block?.layout ?? "media-left";
  const mediaWidth = block?.mediaWidth ?? mediaWidthRange.fallback;
  const media = block?.mediaId ? (mediaById.get(block.mediaId) ?? null) : null;
  const poster = block?.posterId ? (mediaById.get(block.posterId) ?? null) : null;
  const sideBySide = layout === "media-left" || layout === "media-right";
  const title = section?.title;

  const invalid = Object.fromEntries(
    locales.map((locale) => [
      locale,
      hasLocaleError(errors?.title, locale) ||
        hasLocaleError(errors?.block?.eyebrow, locale) ||
        hasLocaleError(errors?.block?.body, locale) ||
        hasLocaleError(errors?.block?.linkLabel, locale),
    ]),
  );

  return (
    <div className="flex flex-col gap-5">
      <LocaleTabs
        required={false}
        invalid={invalid}
        filled={{
          ru: Boolean(title?.ru || block?.eyebrow?.ru || block?.linkLabel?.ru),
          en: Boolean(title?.en || block?.eyebrow?.en || block?.linkLabel?.en),
        }}
      >
        {(locale) => (
          <>
            <FormField
              control={form.control}
              name={`sections.${index}.block.eyebrow.${locale}`}
              label={t("Kiçik başlıq ({locale})", { locale: locale.toUpperCase() })}
              description={
                locale === "az" ? t("İstəyə bağlıdır. Başlığın üstündə nöqtə ilə.") : undefined
              }
              render={({ field, id, invalid: wrong, describedBy }) => (
                <Input
                  {...field}
                  value={field.value ?? ""}
                  id={id}
                  maxLength={60}
                  aria-invalid={wrong}
                  aria-describedby={describedBy}
                />
              )}
            />
            <FormField
              control={form.control}
              name={`sections.${index}.title.${locale}`}
              label={t("Başlıq ({locale})", { locale: locale.toUpperCase() })}
              render={({ field, id, invalid: wrong, describedBy }) => (
                <Input
                  {...field}
                  value={field.value ?? ""}
                  id={id}
                  maxLength={120}
                  aria-invalid={wrong}
                  aria-describedby={describedBy}
                />
              )}
            />
            <FormField
              control={form.control}
              name={`sections.${index}.block.body.${locale}`}
              label={t("Mətn ({locale})", { locale: locale.toUpperCase() })}
              render={({ field, id, invalid: wrong, describedBy }) => (
                <RichTextEditor
                  id={id}
                  value={field.value}
                  onChange={field.onChange}
                  invalid={wrong}
                  describedBy={describedBy}
                />
              )}
            />
            <FormField
              control={form.control}
              name={`sections.${index}.block.linkLabel.${locale}`}
              label={t("Düymənin mətni ({locale})", { locale: locale.toUpperCase() })}
              description={
                locale === "az" ? t("İstəyə bağlıdır, məsələn «Kataloqa bax».") : undefined
              }
              render={({ field, id, invalid: wrong, describedBy }) => (
                <Input
                  {...field}
                  value={field.value ?? ""}
                  id={id}
                  maxLength={40}
                  aria-invalid={wrong}
                  aria-describedby={describedBy}
                />
              )}
            />
          </>
        )}
      </LocaleTabs>

      <FormField
        control={form.control}
        name={`sections.${index}.block.href`}
        label={t("Düymənin linki")}
        description={t(
          "İstəyə bağlıdır. Saytdakı ünvan, məsələn /mehsullar, və ya https:// ilə tam link.",
        )}
        render={({ field, id, invalid: wrong, describedBy }) => (
          <Input
            {...field}
            value={field.value ?? ""}
            id={id}
            inputMode="url"
            autoComplete="off"
            maxLength={500}
            placeholder="/mehsullar"
            aria-invalid={wrong}
            aria-describedby={describedBy}
          />
        )}
      />

      <div className="grid gap-5 md:grid-cols-2">
        <FormField
          control={form.control}
          name={`sections.${index}.block.mediaKind`}
          label={t("Media")}
          render={({ field, id, invalid: wrong, describedBy }) => (
            <Select
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value);
                form.setValue(`sections.${index}.block.mediaId`, "", { shouldDirty: true });
                form.setValue(`sections.${index}.block.posterId`, "", { shouldDirty: true });
              }}
            >
              <SelectTrigger
                id={id}
                className="w-full"
                aria-invalid={wrong}
                aria-describedby={describedBy}
                onBlur={field.onBlur}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {customBlockMediaKinds.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {t(mediaKindLabels[kind])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FormField
          control={form.control}
          name={`sections.${index}.block.tone`}
          label={t("Fon")}
          description={
            layout === "background" ? t("Fon düzülüşündə media fonu əvəz edir.") : undefined
          }
          render={({ field, id, invalid: wrong, describedBy }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger
                id={id}
                className="w-full"
                aria-invalid={wrong}
                aria-describedby={describedBy}
                onBlur={field.onBlur}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {customBlockTones.map((tone) => (
                  <SelectItem key={tone} value={tone}>
                    {t(toneLabels[tone])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {mediaKind !== "none" && (
        <div className="grid gap-5 md:grid-cols-2">
          <FormField
            control={form.control}
            name={`sections.${index}.block.mediaId`}
            label={mediaKind === "video" ? t("Video") : t("Şəkil")}
            required
            description={
              mediaKind === "video"
                ? t("MP4 və ya WebM. Tövsiyə: 1920 px, 20 MB-dan az.")
                : t("JPG və ya WebP. Yan-yana düzülüşdə eni ən azı 1200 px olsun.")
            }
            render={({ field, id, invalid: wrong, describedBy }) => (
              <ImagePicker
                id={id}
                kind={mediaKind}
                label={mediaKind === "video" ? t("Video") : t("Şəkil")}
                value={media}
                invalid={wrong}
                describedBy={describedBy}
                onChange={(picked) => {
                  if (picked) remember(picked);
                  field.onChange(picked?.id ?? "");
                }}
              />
            )}
          />
          {mediaKind === "video" && (
            <FormField
              control={form.control}
              name={`sections.${index}.block.posterId`}
              label={t("Poster şəkli")}
              description={t("Video yüklənənə qədər göstərilir. İstəyə bağlıdır.")}
              render={({ field, id, invalid: wrong, describedBy }) => (
                <ImagePicker
                  id={id}
                  label={t("Poster şəkli")}
                  value={poster}
                  invalid={wrong}
                  describedBy={describedBy}
                  onChange={(picked) => {
                    if (picked) remember(picked);
                    field.onChange(picked?.id ?? "");
                  }}
                />
              )}
            />
          )}
        </div>
      )}

      {mediaKind === "video" && (
        <div className="grid gap-5 md:grid-cols-2">
          <FormField
            control={form.control}
            name={`sections.${index}.block.autoplay`}
            label={t("Avtomatik başlasın")}
            description={
              layout === "background"
                ? t("Fon düzülüşündə video həmişə özü başlayır.")
                : block?.autoplay
                  ? t("Bölmə ekranda görünəndə özü başlayır və təkrar oynayır.")
                  : t("Ziyarətçi oynatma düyməsinə basanda başlayır.")
            }
            render={({ field, id, describedBy }) => (
              <div className="flex min-h-11 items-center gap-3">
                <Switch
                  id={id}
                  checked={layout === "background" ? true : (field.value ?? true)}
                  disabled={layout === "background"}
                  onCheckedChange={field.onChange}
                  onBlur={field.onBlur}
                  aria-describedby={describedBy}
                />
                <span className="text-meta text-muted-foreground">
                  {layout === "background" || field.value ? t("Bəli") : t("Xeyr")}
                </span>
              </div>
            )}
          />
          <FormField
            control={form.control}
            name={`sections.${index}.block.sound`}
            label={t("Səsli")}
            description={
              block?.sound && (layout === "background" || block.autoplay)
                ? t(
                    "Brauzerlər səsli videonu özü başlatmağa icazə vermir: video səssiz başlayır, küncdəki düymə ilə ziyarətçi səsi açır.",
                  )
                : t("Söndürülübsə video səssiz oynayır.")
            }
            render={({ field, id, describedBy }) => (
              <div className="flex min-h-11 items-center gap-3">
                <Switch
                  id={id}
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                  onBlur={field.onBlur}
                  aria-describedby={describedBy}
                />
                <span className="text-meta text-muted-foreground">
                  {field.value ? t("Səsli") : t("Səssiz")}
                </span>
              </div>
            )}
          />
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <FormField
          control={form.control}
          name={`sections.${index}.block.layout`}
          label={t("Düzülüş")}
          render={({ field, id, invalid: wrong, describedBy }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger
                id={id}
                className="w-full"
                aria-invalid={wrong}
                aria-describedby={describedBy}
                onBlur={field.onBlur}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {customBlockLayouts.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(layoutLabels[value])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FormField
          control={form.control}
          name={`sections.${index}.block.mediaWidth`}
          label={t("Medianın eni: {value}%", { value: mediaWidth })}
          description={
            sideBySide
              ? t("Kompüterdə sətrin neçə faizini media tutur. Telefonda media tam endədir.")
              : t("Yalnız yan-yana düzülüşdə istifadə olunur.")
          }
          render={({ field, id, describedBy }) => (
            <input
              id={id}
              type="range"
              min={mediaWidthRange.min}
              max={mediaWidthRange.max}
              step={mediaWidthRange.step}
              value={field.value ?? mediaWidthRange.fallback}
              disabled={!sideBySide || mediaKind === "none"}
              onChange={(event) => field.onChange(Number(event.target.value))}
              onBlur={field.onBlur}
              aria-describedby={describedBy}
              aria-valuetext={`${field.value ?? mediaWidthRange.fallback}%`}
              className={cn("h-11 w-full accent-foreground", !sideBySide && "opacity-50")}
            />
          )}
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-meta font-medium">{t("Görünüş sxemi")}</p>
        <LayoutPreview layout={layout} mediaWidth={mediaWidth} hasMedia={mediaKind !== "none"} />
      </div>
    </div>
  );
}
