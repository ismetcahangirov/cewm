"use client";

import { FileText, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";

import { fileName, MediaPickerDialog } from "@/components/admin/image-picker";
import { LocaleTabs } from "@/components/admin/locale-tabs";
import { MediaDropzone, UploadProgressList, useMediaUpload } from "@/components/admin/media-upload";
import { DragHandle, SortableList } from "@/components/admin/sortable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/admin/i18n/use-t";
import type { Locale } from "@/lib/i18n/config";
import { formatFileSize, type MediaDto } from "@/lib/validation/media";
import { productLimits, type ProductInput } from "@/lib/validation/products";

function titleFromFile(media: MediaDto): string {
  return fileName(media.key)
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();
}

export function ProductDocuments({
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
    name: "documents",
    keyName: "key",
  });
  const [picking, setPicking] = useState(false);
  const uploads = useMediaUpload(["document"]);
  const documents = useWatch({ control: form.control, name: "documents" }) ?? [];
  const errors = form.formState.errors.documents;
  const errorAt = (index: number, locale: Locale) =>
    Array.isArray(errors) ? errors[index]?.title?.[locale]?.message : undefined;

  function add(media: MediaDto[]) {
    remember(media);
    const present = new Set(form.getValues("documents").map((item) => item.mediaId));
    for (const item of media) {
      if (present.has(item.id) || present.size >= productLimits.documents) continue;
      present.add(item.id);
      append({ mediaId: item.id, title: { az: titleFromFile(item), ru: "", en: "", de: "" } });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-meta text-muted-foreground">
        {t("PDF broşürlər və kataloqlar. Fayl bir dəfə yüklənir, adı hər dil üçün ayrıca yazılır.")}
      </p>
      {fields.length ? (
        <LocaleTabs
          invalid={{ az: fields.some((_, index) => errorAt(index, "az")) }}
          filled={{
            ru: documents.every((item) => item.title?.ru),
            en: documents.every((item) => item.title?.en),
            de: documents.every((item) => item.title?.de),
          }}
        >
          {(locale) => (
            <SortableList
              items={fields}
              getId={(field) => field.key}
              getLabel={(field) => {
                const index = fields.findIndex((item) => item.key === field.key);
                return documents[index]?.title?.az || t("Sənəd {number}", { number: index + 1 });
              }}
              onReorder={(from, to) => move(from, to)}
              className="flex flex-col border border-border"
              itemClassName="border-b border-border bg-white last:border-0"
            >
              {(field, index, { handle }) => {
                const media = mediaById.get(documents[index]?.mediaId ?? "");
                const id = `document-${field.key}-${locale}`;
                const message = errorAt(index, locale);
                return (
                  <div className="flex items-start gap-2 p-2">
                    <DragHandle
                      label={t("{label}: yerini dəyiş", {
                        label: t("Sənəd {number}", { number: index + 1 }),
                      })}
                      {...handle}
                    />
                    <FileText
                      aria-hidden="true"
                      strokeWidth={1.5}
                      className="mt-2.5 size-5 shrink-0 text-muted-foreground"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <label htmlFor={id} className="text-meta font-medium">
                        {t("Sənədin adı ({locale})", { locale: locale.toUpperCase() })}
                        {locale === "az" ? (
                          <span aria-hidden="true" className="text-destructive">
                            *
                          </span>
                        ) : null}
                      </label>
                      <Input
                        id={id}
                        maxLength={160}
                        aria-invalid={Boolean(message)}
                        {...form.register(`documents.${index}.title.${locale}`)}
                      />
                      {message ? (
                        <p className="text-meta text-destructive">{t.message(message)}</p>
                      ) : null}
                      {media ? (
                        <a
                          href={media.src}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate text-meta text-muted-foreground hover:underline"
                        >
                          {fileName(media.key)} · {formatFileSize(media.size)}
                        </a>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("Sənəd {number}: çıxar", { number: index + 1 })}
                      onClick={() => remove(index)}
                      className="max-md:size-11"
                    >
                      <Trash2 strokeWidth={1.5} />
                    </Button>
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
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <MediaDropzone
          kinds={["document"]}
          onFiles={async (files) => add(await uploads.upload(files))}
        />
        <Button
          type="button"
          variant="outline"
          className="self-center justify-self-start"
          disabled={fields.length >= productLimits.documents}
          onClick={() => setPicking(true)}
        >
          <FileText strokeWidth={1.5} />
          {t("Kitabxanadan seç")}
        </Button>
      </div>
      <UploadProgressList items={uploads.items} onDismiss={uploads.dismiss} />
      <MediaPickerDialog
        open={picking}
        onOpenChange={setPicking}
        kind="document"
        multiple
        title={t("Sənəd əlavə edin")}
        onConfirm={add}
      />
    </div>
  );
}
