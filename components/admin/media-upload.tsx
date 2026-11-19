"use client";

import { CircleAlert, Check, Upload } from "lucide-react";
import { useCallback, useId, useState, type DragEvent } from "react";

import { useCompleteUploadMutation, useRequestUploadMutation } from "@/lib/api/admin";
import { apiErrorMessage } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/admin/i18n/use-t";
import {
  acceptByKind,
  formatFileSize,
  mediaTypeOf,
  mediaTypes,
  type MediaDto,
  type MediaKind,
} from "@/lib/validation/media";

export type UploadItem = {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: "uploading" | "processing" | "done" | "error";
  error?: string;
  media?: MediaDto;
};

const kindLabels: Record<MediaKind, string> = {
  image: "JPG, PNG, WebP, AVIF, GIF",
  video: "MP4, WebM",
  document: "PDF",
};

export function putWithProgress(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    for (const [name, value] of Object.entries(headers)) request.setRequestHeader(name, value);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(new Error(`Yaddaş ${request.status} cavabı verdi.`));
    request.onerror = () => reject(new Error("Fayl yaddaşa göndərilmədi. Şəbəkəni yoxlayın."));
    request.send(file);
  });
}

export function useMediaUpload(kinds: MediaKind[]) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [requestUpload] = useRequestUploadMutation();
  const [completeUpload] = useCompleteUploadMutation();

  const patch = useCallback((id: string, next: Partial<UploadItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...next } : item)));
  }, []);

  const uploadOne = useCallback(
    async (file: File, id: string): Promise<MediaDto | null> => {
      const type = mediaTypeOf(file);
      if (!type || !kinds.includes(mediaTypes[type].kind)) {
        patch(id, { status: "error", error: "Bu fayl növü burada qəbul olunmur." });
        return null;
      }
      if (file.size > mediaTypes[type].maxSize) {
        patch(id, {
          status: "error",
          error: `Fayl ${formatFileSize(mediaTypes[type].maxSize)}-dan böyükdür.`,
        });
        return null;
      }
      try {
        const ticket = await requestUpload({
          fileName: file.name,
          contentType: type,
          size: file.size,
        }).unwrap();
        await putWithProgress(ticket.url, file, ticket.headers, (fraction) =>
          patch(id, { progress: Math.round(fraction * 100) }),
        );
        patch(id, { status: "processing", progress: 100 });
        const media = await completeUpload({ key: ticket.key }).unwrap();
        patch(id, { status: "done", media });
        return media;
      } catch (error) {
        patch(id, {
          status: "error",
          error: error instanceof Error ? error.message : apiErrorMessage(error),
        });
        return null;
      }
    },
    [completeUpload, kinds, patch, requestUpload],
  );

  const upload = useCallback(
    async (files: File[]): Promise<MediaDto[]> => {
      const queued = files.map((file) => ({
        file,
        item: {
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          progress: 0,
          status: "uploading" as const,
        },
      }));
      setItems((current) => [
        ...current.filter((item) => item.status !== "done"),
        ...queued.map((entry) => entry.item),
      ]);
      const results: (MediaDto | null)[] = new Array(queued.length).fill(null);
      let next = 0;
      async function worker() {
        while (next < queued.length) {
          const index = next++;
          const entry = queued[index];
          if (entry) results[index] = await uploadOne(entry.file, entry.item.id);
        }
      }
      await Promise.all(Array.from({ length: Math.min(3, queued.length) }, worker));
      return results.filter((media): media is MediaDto => media !== null);
    },
    [uploadOne],
  );

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  return {
    items,
    upload,
    dismiss,
    busy: items.some((item) => item.status === "uploading" || item.status === "processing"),
  };
}

export function UploadProgressList({
  items,
  onDismiss,
}: {
  items: UploadItem[];
  onDismiss: (id: string) => void;
}) {
  const t = useT();
  if (!items.length) return null;
  return (
    <ul className="flex flex-col gap-2 text-meta" aria-live="polite">
      {items.map((item) => (
        <li key={item.id} className="flex flex-col gap-1 border border-border bg-white px-3 py-2">
          <div className="flex items-center gap-2">
            {item.status === "done" ? (
              <Check className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
            ) : item.status === "error" ? (
              <CircleAlert
                className="size-4 shrink-0 text-destructive"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            ) : null}
            <span className="min-w-0 flex-1 truncate">{item.name}</span>
            <span className="shrink-0 text-muted-foreground tabular-nums">
              {item.status === "uploading"
                ? `${item.progress}%`
                : item.status === "processing"
                  ? t("Emal olunur")
                  : item.status === "done"
                    ? t("Hazırdır")
                    : formatFileSize(item.size)}
            </span>
            {item.status === "error" || item.status === "done" ? (
              <button
                type="button"
                onClick={() => onDismiss(item.id)}
                className="-my-2 -mr-2 h-10 shrink-0 rounded-sm px-2 text-muted-foreground hover:bg-secondary"
              >
                {t("Bağla")}
              </button>
            ) : null}
          </div>
          {item.status === "uploading" || item.status === "processing" ? (
            <div
              className="h-1 w-full overflow-hidden bg-secondary"
              role="progressbar"
              aria-label={item.name}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={item.progress}
            >
              <div
                className="h-full w-full origin-left bg-primary transition-transform motion-reduce:transition-none"
                style={{ transform: `scaleX(${item.progress / 100})` }}
              />
            </div>
          ) : null}
          {item.error ? <p className="text-destructive">{t.message(item.error)}</p> : null}
        </li>
      ))}
    </ul>
  );
}

export function MediaDropzone({
  kinds,
  multiple = true,
  onFiles,
  disabled,
  className,
  label,
}: {
  kinds: MediaKind[];
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}) {
  const inputId = useId();
  const [over, setOver] = useState(false);
  const t = useT();

  function take(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setOver(false);
    if (!disabled) take(event.dataTransfer.files);
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-border bg-white px-4 py-6 text-center text-meta transition-colors",
        over ? "border-graphite bg-secondary" : null,
        disabled ? "opacity-50" : null,
        className,
      )}
    >
      <Upload className="size-5 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
      <p>
        {label ?? (multiple ? t("Faylları bura atın və ya") : t("Faylı bura atın və ya"))}{" "}
        <label
          htmlFor={inputId}
          className="cursor-pointer text-graphite underline underline-offset-4 hover:no-underline"
        >
          {t("kompüterdən seçin")}
        </label>
      </p>
      <p className="text-muted-foreground">{kinds.map((kind) => kindLabels[kind]).join(", ")}</p>
      <input
        id={inputId}
        type="file"
        className="sr-only"
        multiple={multiple}
        disabled={disabled}
        accept={kinds.map((kind) => acceptByKind[kind]).join(",")}
        onChange={(event) => {
          take(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
