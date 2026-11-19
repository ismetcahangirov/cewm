"use client";

import { ChevronLeft, ChevronRight, Copy, RefreshCw, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { fileName, MediaThumb } from "@/components/admin/image-picker";
import { LocaleTabs } from "@/components/admin/locale-tabs";
import {
  MediaDropzone,
  putWithProgress,
  UploadProgressList,
  useMediaUpload,
} from "@/components/admin/media-upload";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { formatDateTime } from "@/lib/admin/format";
import type { MessageKey } from "@/lib/admin/i18n";
import { filledLocales } from "@/lib/admin/form-values";
import { useT } from "@/lib/admin/i18n/use-t";
import { usageParts, usageSummary } from "@/lib/admin/media-labels";
import {
  useDeleteMediaMutation,
  useGetMediaQuery,
  useGetMediaUsageQuery,
  useReplaceMediaMutation,
  useRequestUploadMutation,
  useUpdateMediaMutation,
} from "@/lib/api/admin";
import { apiErrorMessage } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import {
  acceptByKind,
  formatFileSize,
  mediaKindOf,
  mediaTypeOf,
  mediaTypes,
  type MediaKind,
  type MediaLibraryItem,
  type MediaSortField,
} from "@/lib/validation/media";

const pageSize = 50;

const kindOptions: { value: MediaKind | "all"; label: MessageKey }[] = [
  { value: "image", label: "Şəkillər" },
  { value: "video", label: "Videolar" },
  { value: "document", label: "Sənədlər" },
  { value: "all", label: "Bütün fayllar" },
];

const sortOptions: {
  value: string;
  label: MessageKey;
  sort: MediaSortField;
  order: "asc" | "desc";
}[] = [
  { value: "new", label: "Əvvəlcə yenilər", sort: "createdAt", order: "desc" },
  { value: "old", label: "Əvvəlcə köhnələr", sort: "createdAt", order: "asc" },
  { value: "name", label: "Ada görə", sort: "key", order: "asc" },
  { value: "size", label: "Əvvəlcə böyüklər", sort: "size", order: "desc" },
];

function MediaDetails({ item, onClose }: { item: MediaLibraryItem; onClose: () => void }) {
  const t = useT();
  const [alt, setAlt] = useState<Record<Locale, string>>({
    az: item.alts?.az ?? "",
    ru: item.alts?.ru ?? "",
    en: item.alts?.en ?? "",
    de: item.alts?.de ?? "",
  });
  const [caption, setCaption] = useState<Record<Locale, string>>({
    az: item.captions?.az ?? "",
    ru: item.captions?.ru ?? "",
    en: item.captions?.en ?? "",
    de: item.captions?.de ?? "",
  });
  const [confirming, setConfirming] = useState(false);
  const [replaceProgress, setReplaceProgress] = useState<number | null>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const { data: usageItems = [] } = useGetMediaUsageQuery(item.id, {
    skip: item.usageTotal === 0,
  });
  const [requestUpload] = useRequestUploadMutation();
  const [replaceMedia] = useReplaceMediaMutation();
  const [updateMedia, { isLoading: saving }] = useUpdateMediaMutation();
  const [deleteMedia] = useDeleteMediaMutation();
  const parts = usageParts(item.usage, t);
  const isImage = item.mimeType.startsWith("image/");

  async function save() {
    try {
      await updateMedia({ id: item.id, alt, caption }).unwrap();
      toast.success(t("Alt mətn saxlanıldı."));
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  async function remove(): Promise<boolean> {
    try {
      await deleteMedia(item.id).unwrap();
      toast.success(t("{name} silindi.", { name: fileName(item.key) }));
      onClose();
      return true;
    } catch (error) {
      toast.error(apiErrorMessage(error));
      return false;
    }
  }

  async function replace(file: File) {
    const type = mediaTypeOf(file);
    if (!type || mediaTypes[type].kind !== mediaKindOf(item.mimeType)) {
      toast.error(t("Yeni fayl köhnə ilə eyni növdə olmalıdır."));
      return;
    }
    if (file.size > mediaTypes[type].maxSize) {
      toast.error(t("Fayl icazə verilən ölçüdən böyükdür."));
      return;
    }
    setReplaceProgress(0);
    try {
      const ticket = await requestUpload({
        fileName: file.name,
        contentType: type,
        size: file.size,
      }).unwrap();
      await putWithProgress(ticket.url, file, ticket.headers, (fraction) =>
        setReplaceProgress(Math.round(fraction * 100)),
      );
      await replaceMedia({ id: item.id, key: ticket.key }).unwrap();
      toast.success(t("Fayl əvəz olundu. Saytda hər yerdə yenisi görünür."));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : apiErrorMessage(error));
    } finally {
      setReplaceProgress(null);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(new URL(item.src, window.location.origin).href);
      toast.success(t("Keçid kopyalandı."));
    } catch {
      toast.error(t("Keçid kopyalanmadı."));
    }
  }

  return (
    <>
      <SheetHeader className="border-b border-border">
        <SheetTitle className="pr-10 break-all">{fileName(item.key)}</SheetTitle>
        <SheetDescription>{usageSummary(item.usage, t)}</SheetDescription>
      </SheetHeader>
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4">
        <div className="relative aspect-square w-full border border-border bg-surface">
          <MediaThumb media={item} sizes="(min-width: 640px) 384px, 75vw" />
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-meta">
          <dt className="text-muted-foreground">{t("Növ")}</dt>
          <dd>{item.mimeType}</dd>
          {item.width && item.height ? (
            <>
              <dt className="text-muted-foreground">{t("Ölçü")}</dt>
              <dd className="tabular-nums">
                {item.width} × {item.height} px
              </dd>
            </>
          ) : null}
          <dt className="text-muted-foreground">{t("Həcm")}</dt>
          <dd className="tabular-nums">{formatFileSize(item.size)}</dd>
          <dt className="text-muted-foreground">{t("Yüklənib")}</dt>
          <dd>{formatDateTime(item.createdAt, t.locale)}</dd>
          {parts.length ? (
            <>
              <dt className="text-muted-foreground">{t("İstifadə")}</dt>
              <dd>{parts.join(", ")}</dd>
            </>
          ) : null}
        </dl>
        {usageItems.length ? (
          <section className="flex flex-col gap-2">
            <h3 className="text-meta font-medium">{t("Harada istifadə olunur")}</h3>
            <ul className="flex flex-col gap-1 text-meta">
              {usageItems.map((usage) => (
                <li key={`${usage.kind}-${usage.id}`}>
                  <Link
                    href={usage.href}
                    className="underline underline-offset-4 hover:no-underline"
                  >
                    {usage.label ??
                      (usage.id === "home-sections"
                        ? t("Ana səhifə bölmələri")
                        : t("sayt tənzimləmələri"))}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {isImage ? (
          <section className="flex flex-col gap-3">
            <h3 className="text-meta font-medium">{t("Alt mətn")}</h3>
            <LocaleTabs filled={filledLocales(alt)}>
              {(locale) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`alt-${locale}`} className="text-meta font-medium">
                    {t("Şəklin təsviri ({locale})", { locale: locale.toUpperCase() })}
                  </Label>
                  <Input
                    id={`alt-${locale}`}
                    value={alt[locale]}
                    maxLength={250}
                    onChange={(event) =>
                      setAlt((current) => ({ ...current, [locale]: event.target.value }))
                    }
                  />
                </div>
              )}
            </LocaleTabs>
            <p className="text-meta text-muted-foreground">
              {t("Görmə imkanı məhdud insanlar və axtarış sistemləri üçün şəkli qısa təsvir edin.")}
            </p>
          </section>
        ) : null}
        {isImage ? (
          <section className="flex flex-col gap-3">
            <h3 className="text-meta font-medium">{t("Şəkil altı yazı")}</h3>
            <LocaleTabs filled={filledLocales(caption)} required={false}>
              {(locale) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`caption-${locale}`} className="text-meta font-medium">
                    {t("Şəkil altı yazı ({locale})", { locale: locale.toUpperCase() })}
                  </Label>
                  <Input
                    id={`caption-${locale}`}
                    value={caption[locale]}
                    maxLength={500}
                    onChange={(event) =>
                      setCaption((current) => ({ ...current, [locale]: event.target.value }))
                    }
                  />
                </div>
              )}
            </LocaleTabs>
          </section>
        ) : null}
      </div>
      <SheetFooter className="flex-row flex-wrap border-t border-border">
        {isImage ? (
          <Button type="button" onClick={save} disabled={saving}>
            {t("Saxla")}
          </Button>
        ) : null}
        <input
          ref={replaceInput}
          type="file"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          accept={acceptByKind[mediaKindOf(item.mimeType) ?? "image"]}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void replace(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={replaceProgress !== null}
          onClick={() => replaceInput.current?.click()}
        >
          <RefreshCw strokeWidth={1.5} />
          {replaceProgress === null
            ? t("Faylı əvəz et")
            : t("Əvəz edilir {progress}%", { progress: replaceProgress })}
        </Button>
        <Button type="button" variant="outline" onClick={copyLink}>
          <Copy strokeWidth={1.5} />
          {t("Keçidi kopyala")}
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={item.usageTotal > 0}
          title={item.usageTotal > 0 ? t("İstifadə olunan faylı silmək olmaz.") : undefined}
          onClick={() => setConfirming(true)}
        >
          <Trash2 strokeWidth={1.5} />
          {t("Sil")}
        </Button>
        {item.usageTotal > 0 ? (
          <p className="w-full text-meta text-muted-foreground">
            {t(
              "İstifadə olunan faylı silmək olmaz. Əvvəlcə yuxarıdakı yerlərdən çıxarın və ya faylı əvəz edin.",
            )}
          </p>
        ) : null}
      </SheetFooter>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t("«{name}» silinsin?", { name: fileName(item.key) })}
        description={t("Fayl kitabxanadan və yaddaşdan birdəfəlik silinəcək.")}
        confirmLabel={t("Sil")}
        destructive
        onConfirm={remove}
      />
    </>
  );
}

export function MediaView() {
  const t = useT();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<MediaKind | "all">("image");
  const [sort, setSort] = useState("new");
  const [unused, setUnused] = useState(false);
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const uploads = useMediaUpload(["image", "video", "document"]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const order = sortOptions.find((option) => option.value === sort) ?? sortOptions[0];
  const { data, isLoading, isFetching, isError, refetch } = useGetMediaQuery({
    search: query,
    sort: order?.sort ?? "createdAt",
    order: order?.order ?? "desc",
    page,
    pageSize,
    kind,
    unused,
  });
  const rows = data?.rows ?? [];
  const pageCount = Math.max(1, Math.ceil((data?.rowCount ?? 0) / pageSize));
  const open = rows.find((row) => row.id === openId) ?? null;

  async function uploadFiles(files: File[]) {
    const uploaded = await uploads.upload(files);
    if (uploaded.length) {
      toast.success(
        uploaded.length === 1
          ? t("Fayl yükləndi.")
          : t("{count} fayl yükləndi.", { count: uploaded.length }),
      );
      setPage(0);
      setSort("new");
    }
  }

  return (
    <>
      <PageHeader
        title={t("Media")}
        description={t(
          "Saytdakı bütün şəkillər, videolar və sənədlər. Hər fayl bir dəfə yüklənir və bütün dillərdə istifadə olunur. Şəkillər saytda avtomatik WebP və AVIF ölçülərinə çevrilir.",
        )}
      />
      <div className="flex flex-col gap-4">
        <MediaDropzone kinds={["image", "video", "document"]} onFiles={uploadFiles} />
        <UploadProgressList items={uploads.items} onDismiss={uploads.dismiss} />

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-0 flex-1 basis-60">
            <span className="sr-only">{t("Fayl axtar")}</span>
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
          <Select
            value={kind}
            onValueChange={(value) => {
              setKind(value as MediaKind | "all");
              setPage(0);
            }}
          >
            <SelectTrigger aria-label={t("Fayl növü")} className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {kindOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sort}
            onValueChange={(value) => {
              setSort(value);
              setPage(0);
            }}
          >
            <SelectTrigger aria-label={t("Sıralama")} className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex h-11 items-center gap-2 px-1 text-meta md:h-10">
            <Switch
              checked={unused}
              onCheckedChange={(checked) => {
                setUnused(checked);
                setPage(0);
              }}
            />
            {t("İstifadə olunmayanlar")}
          </label>
        </div>

        {isError ? (
          <EmptyState
            action={
              <Button variant="outline" onClick={() => refetch()}>
                {t("Yenidən yüklə")}
              </Button>
            }
          >
            {t("Fayllar yüklənmədi.")}
          </EmptyState>
        ) : !isLoading && rows.length === 0 ? (
          <EmptyState>
            {query || unused ? t("Axtarışa uyğun fayl tapılmadı.") : t("Hələ fayl yoxdur.")}
          </EmptyState>
        ) : (
          <ul
            className={cn(
              "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6",
              isFetching && !isLoading ? "opacity-60" : "opacity-100",
            )}
            aria-busy={isFetching}
          >
            {isLoading
              ? Array.from({ length: 12 }, (_, index) => (
                  <li key={index}>
                    <Skeleton className="aspect-square w-full" />
                  </li>
                ))
              : rows.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(item.id)}
                      className="group flex w-full flex-col border border-border bg-white text-left hover:border-graphite"
                    >
                      <span className="relative block aspect-square w-full bg-surface">
                        <MediaThumb
                          media={item}
                          sizes="(min-width: 1200px) 220px, (min-width: 768px) 25vw, 50vw"
                        />
                      </span>
                      <span className="flex flex-col gap-0.5 p-2 text-meta">
                        <span className="truncate">{fileName(item.key)}</span>
                        <span className="truncate text-muted-foreground">
                          {item.usageTotal
                            ? usageParts(item.usage, t).join(", ")
                            : t("İstifadə olunmur")}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
          </ul>
        )}

        {pageCount > 1 ? (
          <div className="flex items-center justify-between gap-2 text-meta">
            <p className="text-muted-foreground">
              {t("{count} fayl", { count: data?.rowCount ?? 0 })}
            </p>
            <div className="flex items-center gap-2">
              <Button
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
                variant="outline"
                size="icon"
                aria-label={t("Növbəti səhifə")}
                disabled={page + 1 >= pageCount}
                onClick={() => setPage((value) => value + 1)}
              >
                <ChevronRight strokeWidth={1.5} />
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <Sheet open={Boolean(open)} onOpenChange={(next) => (next ? null : setOpenId(null))}>
        <SheetContent className="w-full gap-0 sm:max-w-md">
          {open ? <MediaDetails key={open.id} item={open} onClose={() => setOpenId(null)} /> : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
