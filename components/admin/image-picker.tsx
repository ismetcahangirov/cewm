"use client";

import { ChevronLeft, ChevronRight, FileText, Film, ImagePlus, Search, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetMediaQuery } from "@/lib/api/admin";
import { cn } from "@/lib/utils";
import { mediaKindOf, type MediaDto, type MediaKind } from "@/lib/validation/media";
import { useT } from "@/lib/admin/i18n/use-t";

import { MediaDropzone, UploadProgressList, useMediaUpload } from "./media-upload";

const pageSize = 20;

export function fileName(key: string): string {
  return key.split("/").pop() ?? key;
}

export function MediaThumb({ media, sizes }: { media: MediaDto; sizes: string }) {
  const kind = mediaKindOf(media.mimeType);
  if (kind === "image" || media.mimeType === "image/svg+xml") {
    return (
      <Image src={media.src} alt={media.alt ?? ""} fill sizes={sizes} className="object-contain" />
    );
  }
  const Icon = kind === "video" ? Film : FileText;
  return (
    <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2 text-center text-meta text-muted-foreground">
      <Icon className="size-6" strokeWidth={1.5} aria-hidden="true" />
      <span className="line-clamp-2 break-all">{fileName(media.key)}</span>
    </span>
  );
}

export function MediaBrowser({
  kind,
  selectedIds,
  onPick,
  multiple = false,
}: {
  kind: MediaKind;
  selectedIds: string[];
  onPick: (media: MediaDto) => void;
  multiple?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const t = useT();
  const uploads = useMediaUpload([kind]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isFetching, isError } = useGetMediaQuery({
    search: query,
    sort: "createdAt",
    order: "desc",
    page,
    pageSize,
    kind,
  });
  const pageCount = Math.max(1, Math.ceil((data?.rowCount ?? 0) / pageSize));

  async function uploadFiles(files: File[]) {
    const uploaded = await uploads.upload(files);
    setSearch("");
    setPage(0);
    for (const media of multiple ? uploaded : uploaded.slice(-1)) onPick(media);
  }

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <MediaDropzone
        kinds={[kind]}
        multiple={multiple}
        onFiles={uploadFiles}
        className="py-4"
        label={multiple ? t("Yeni faylları bura atın və ya") : t("Yeni faylı bura atın və ya")}
      />
      <UploadProgressList items={uploads.items} onDismiss={uploads.dismiss} />
      <label className="relative">
        <span className="sr-only">{t("Kitabxanada axtar")}</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          strokeWidth={1.5}
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("Fayl adı və ya alt mətn")}
          className="pl-9"
        />
      </label>
      {isError ? (
        <p className="text-meta text-destructive">{t("Fayllar yüklənmədi. Yenidən cəhd edin.")}</p>
      ) : null}
      {!isLoading && data?.rowCount === 0 ? (
        <p className="text-meta">{t("Heç nə tapılmadı.")}</p>
      ) : null}
      <ul
        className={cn(
          "grid max-h-80 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4 md:grid-cols-5",
          isFetching && !isLoading ? "opacity-60" : "opacity-100",
        )}
      >
        {isLoading
          ? Array.from({ length: 10 }, (_, index) => (
              <li key={index}>
                <Skeleton className="aspect-square w-full" />
              </li>
            ))
          : data?.rows.map((media) => {
              const selected = selectedIds.includes(media.id);
              return (
                <li key={media.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onPick(media)}
                    title={media.alt ?? media.key}
                    className={cn(
                      "relative block aspect-square w-full border bg-surface",
                      selected ? "border-graphite outline-2 outline-graphite" : "border-border",
                    )}
                  >
                    <MediaThumb media={media} sizes="(min-width: 768px) 120px, 30vw" />
                    <span className="sr-only">{media.alt ?? fileName(media.key)}</span>
                  </button>
                </li>
              );
            })}
      </ul>
      {pageCount > 1 ? (
        <div className="flex items-center justify-end gap-2 text-meta">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t("Əvvəlki səhifə")}
            disabled={page === 0}
            onClick={() => setPage((value) => value - 1)}
          >
            <ChevronLeft strokeWidth={1.5} />
          </Button>
          <span className="min-w-14 text-center tabular-nums">
            {page + 1} / {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t("Növbəti səhifə")}
            disabled={page + 1 >= pageCount}
            onClick={() => setPage((value) => value + 1)}
          >
            <ChevronRight strokeWidth={1.5} />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

type PickerProps = {
  kind: MediaKind;
  multiple?: boolean;
  initial?: MediaDto[];
  onConfirm: (media: MediaDto[]) => void;
  onClose: () => void;
};

function PickerBody({ kind, multiple = false, initial = [], onConfirm, onClose }: PickerProps) {
  const [draft, setDraft] = useState<MediaDto[]>(initial);
  const t = useT();

  function pick(media: MediaDto) {
    setDraft((current) => {
      if (!multiple) return [media];
      return current.some((item) => item.id === media.id)
        ? current.filter((item) => item.id !== media.id)
        : [...current, media];
    });
  }

  return (
    <>
      <MediaBrowser
        kind={kind}
        multiple={multiple}
        selectedIds={draft.map((item) => item.id)}
        onPick={pick}
      />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          {t("Ləğv et")}
        </Button>
        <Button
          type="button"
          disabled={!draft.length}
          onClick={() => {
            onConfirm(draft);
            onClose();
          }}
        >
          {multiple && draft.length ? t("Seç ({count})", { count: draft.length }) : t("Seç")}
        </Button>
      </DialogFooter>
    </>
  );
}

export function MediaPickerDialog({
  open,
  onOpenChange,
  title,
  description,
  ...props
}: Omit<PickerProps, "onClose"> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
}) {
  const t = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description ??
              (props.multiple
                ? t("Kitabxanadan bir neçə fayl seçin və ya yenisini yükləyin.")
                : t("Kitabxanadan fayl seçin və ya yenisini yükləyin."))}
          </DialogDescription>
        </DialogHeader>
        {open ? <PickerBody {...props} onClose={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

export function ImagePicker({
  value,
  onChange,
  label = "Şəkil",
  kind = "image",
  id,
  invalid,
  describedBy,
}: {
  value: MediaDto | null;
  onChange: (value: MediaDto | null) => void;
  label?: string;
  kind?: MediaKind;
  id?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [open, setOpen] = useState(false);
  const t = useT();
  const noun = t.message(label);
  const lowered = t.locale === "az" ? noun : noun.toLocaleLowerCase(t.locale);

  return (
    <div className="flex flex-wrap items-start gap-3">
      {value ? (
        <div className="relative size-28 shrink-0 border border-border bg-surface">
          <MediaThumb media={value} sizes="112px" />
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          id={id}
          type="button"
          variant="outline"
          size="sm"
          aria-invalid={invalid}
          aria-describedby={describedBy}
          onClick={() => setOpen(true)}
        >
          <ImagePlus strokeWidth={1.5} />
          {value ? t("Dəyiş") : t("{label} seç", { label: lowered })}
        </Button>
        {value ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            <X strokeWidth={1.5} />
            {t("Çıxar")}
          </Button>
        ) : null}
      </div>
      <MediaPickerDialog
        open={open}
        onOpenChange={setOpen}
        kind={kind}
        title={t("{label} seçin", { label: lowered })}
        initial={value ? [value] : []}
        onConfirm={(media) => onChange(media[0] ?? null)}
      />
    </div>
  );
}
