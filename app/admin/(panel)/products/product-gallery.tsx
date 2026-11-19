"use client";

import { ArrowUpToLine, Images, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";

import { MediaPickerDialog, MediaThumb } from "@/components/admin/image-picker";
import { LocaleTabs } from "@/components/admin/locale-tabs";
import { MediaDropzone, UploadProgressList, useMediaUpload } from "@/components/admin/media-upload";
import { DragHandle, SortableList } from "@/components/admin/sortable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MessageKey } from "@/lib/admin/i18n";
import { useT } from "@/lib/admin/i18n/use-t";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import type { MediaDto } from "@/lib/validation/media";
import type { ProductInput } from "@/lib/validation/products";

const roleLabels: MessageKey[] = ["Əsas şəkil", "Hover şəkli"];

export function ProductGallery({
  mediaById,
  remember,
}: {
  mediaById: Map<string, MediaDto>;
  remember: (media: MediaDto[]) => void;
}) {
  const t = useT();
  const form = useFormContext<ProductInput>();
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "images",
    keyName: "key",
  });
  const [picking, setPicking] = useState(false);
  const uploads = useMediaUpload(["image"]);
  const images = form.watch("images");
  const errors = form.formState.errors.images;

  function add(media: MediaDto[]) {
    remember(media);
    const present = new Set(form.getValues("images").map((image) => image.mediaId));
    for (const item of media) {
      if (present.has(item.id)) continue;
      present.add(item.id);
      append({
        mediaId: item.id,
        alt: {
          az: item.alts?.az ?? "",
          ru: item.alts?.ru ?? "",
          en: item.alts?.en ?? "",
        },
      });
    }
  }

  async function upload(files: File[]) {
    add(await uploads.upload(files));
  }

  const invalidLocales: Partial<Record<Locale, boolean>> = {
    az: Array.isArray(errors) && errors.some((error) => error?.alt?.az),
  };
  const filled = {
    ru: images.every((image) => image.alt.ru),
    en: images.every((image) => image.alt.en),
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-meta text-muted-foreground">
        {t(
          "Birinci şəkil kataloqda və məhsul səhifəsində əsas şəkildir, ikincisi kartın üzərinə gələndə görünür. Sırasını sürüşdürərək dəyişin.",
        )}
      </p>
      {fields.length ? (
        <LocaleTabs filled={filled} invalid={invalidLocales}>
          {(locale) => (
            <SortableList
              layout="grid"
              items={fields}
              getId={(field) => field.key}
              getLabel={(field) => {
                const index = fields.findIndex((item) => item.key === field.key);
                return t("Şəkil {number}", { number: index + 1 });
              }}
              onReorder={(from, to) => move(from, to)}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
              itemClassName="flex"
            >
              {(field, index, { handle }) => {
                const image = images[index];
                const media = image ? mediaById.get(image.mediaId) : undefined;
                const altError = Array.isArray(errors)
                  ? errors[index]?.alt?.[locale]?.message
                  : undefined;
                const inputId = `image-${field.key}-alt-${locale}`;
                const role = roleLabels[index];
                return (
                  <div className="flex w-full flex-col border border-border bg-white">
                    <div className="flex items-center gap-1 border-b border-border p-1">
                      <DragHandle
                        label={t("{label}: yerini dəyiş", {
                          label: t("Şəkil {number}", { number: index + 1 }),
                        })}
                        {...handle}
                      />
                      <span className="min-w-0 flex-1 truncate text-meta">
                        {role ? t(role) : t("Şəkil {number}", { number: index + 1 })}
                      </span>
                      {index > 0 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("Şəkil {number}: əsas et", { number: index + 1 })}
                          title={t("Əsas şəkil et")}
                          onClick={() => move(index, 0)}
                        >
                          <ArrowUpToLine strokeWidth={1.5} />
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("Şəkil {number}: çıxar", { number: index + 1 })}
                        title={t("Qalereyadan çıxar")}
                        onClick={() => remove(index)}
                      >
                        <Trash2 strokeWidth={1.5} />
                      </Button>
                    </div>
                    <div className="relative aspect-square w-full bg-surface">
                      {media ? (
                        <MediaThumb media={media} sizes="(min-width: 1200px) 220px, 45vw" />
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-1 p-2">
                      <label htmlFor={inputId} className="text-meta font-medium">
                        {t("Alt mətn ({locale})", { locale: locale.toUpperCase() })}
                        {locale === "az" ? (
                          <span aria-hidden="true" className="text-destructive">
                            *
                          </span>
                        ) : null}
                      </label>
                      <Input
                        id={inputId}
                        maxLength={250}
                        aria-invalid={Boolean(altError)}
                        aria-describedby={altError ? `${inputId}-error` : undefined}
                        {...form.register(`images.${index}.alt.${locale}`)}
                      />
                      {altError ? (
                        <p id={`${inputId}-error`} className="text-meta text-destructive">
                          {t.message(altError)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              }}
            </SortableList>
          )}
        </LocaleTabs>
      ) : null}
      {typeof errors?.message === "string" ? (
        <p className="text-meta text-destructive" role="alert">
          {t.message(errors.message)}
        </p>
      ) : null}
      {typeof errors?.root?.message === "string" ? (
        <p className="text-meta text-destructive" role="alert">
          {t.message(errors.root.message)}
        </p>
      ) : null}
      <div className={cn("grid gap-3", fields.length ? "md:grid-cols-[1fr_auto]" : null)}>
        <MediaDropzone kinds={["image"]} onFiles={upload} />
        <Button
          type="button"
          variant="outline"
          className="self-center justify-self-start"
          onClick={() => setPicking(true)}
        >
          <Images strokeWidth={1.5} />
          {t("Kitabxanadan seç")}
        </Button>
      </div>
      <UploadProgressList items={uploads.items} onDismiss={uploads.dismiss} />
      <MediaPickerDialog
        open={picking}
        onOpenChange={setPicking}
        kind="image"
        multiple
        title={t("Qalereyaya şəkil əlavə edin")}
        onConfirm={add}
      />
    </div>
  );
}
