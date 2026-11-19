"use client";

import { useState } from "react";
import { toast } from "sonner";

import { applyServerErrors, FormAlert, FormField, useZodForm } from "@/components/admin/form";
import { ImagePicker } from "@/components/admin/image-picker";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/admin/i18n/use-t";
import { useCreateHeroFilmMutation, useUpdateHeroFilmMutation } from "@/lib/api/hero-films";
import {
  heroFilmFormats,
  heroFilmFrameKey,
  heroFilmInputSchema,
  type HeroFilmDto,
} from "@/lib/validation/hero-films";
import type { MediaDto } from "@/lib/validation/media";

export function HeroFilmDialog({
  film,
  onClose,
}: {
  film: HeroFilmDto | null;
  onClose: () => void;
}) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [poster, setPoster] = useState<MediaDto | null>(film?.poster ?? null);
  const [createFilm] = useCreateHeroFilmMutation();
  const [updateFilm] = useUpdateHeroFilmMutation();
  const form = useZodForm(heroFilmInputSchema, {
    defaultValues: {
      name: film?.name ?? "",
      keyPrefix: film?.keyPrefix ?? "",
      frameCount: film?.frameCount ?? "",
      frameWidth: film?.frameWidth ?? 1920,
      frameHeight: film?.frameHeight ?? 1080,
      format: film?.format ?? "webp",
      posterId: film?.poster?.id ?? "",
    },
  });
  const { isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      if (film) {
        await updateFilm({ id: film.id, ...values }).unwrap();
        toast.success(t("«{name}» saxlanıldı.", { name: values.name }));
      } else {
        await createFilm(values).unwrap();
        toast.success(t("«{name}» əlavə olundu.", { name: values.name }));
      }
      onClose();
    } catch (caught) {
      setError(applyServerErrors(form, caught));
    }
  });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose();
      }}
    >
      <DialogContent className="max-h-dvh overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{film ? t("Filmi redaktə et") : t("Yeni hero filmi")}</DialogTitle>
          <DialogDescription>
            {t(
              "Kadrlar bir dəfə yaddaşa yüklənir və bütün dillərdə eyni film göstərilir. Kadr adları: {example}",
              { example: heroFilmFrameKey("films/house", 0, "webp") },
            )}
          </DialogDescription>
        </DialogHeader>
        <form id="hero-film-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <FormAlert message={error} />
          <FormField
            control={form.control}
            name="name"
            label={t("Ad#film")}
            required
            render={({ field, id, invalid, describedBy }) => (
              <Input
                {...field}
                id={id}
                maxLength={120}
                autoComplete="off"
                aria-invalid={invalid}
                aria-describedby={describedBy}
              />
            )}
          />
          <FormField
            control={form.control}
            name="keyPrefix"
            label={t("Kadrların qovluğu")}
            required
            description={t("Yaddaşdakı qovluq, məsələn films/house. Sonunda «/» olmur.")}
            render={({ field, id, invalid, describedBy }) => (
              <Input
                {...field}
                id={id}
                maxLength={200}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={invalid}
                aria-describedby={describedBy}
              />
            )}
          />
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <FormField
              control={form.control}
              name="frameCount"
              label={t("Kadr sayı")}
              required
              render={({ field, id, invalid, describedBy }) => (
                <Input
                  {...field}
                  value={String(field.value ?? "")}
                  id={id}
                  type="number"
                  inputMode="numeric"
                  min={2}
                  aria-invalid={invalid}
                  aria-describedby={describedBy}
                />
              )}
            />
            <FormField
              control={form.control}
              name="frameWidth"
              label={t("En, px")}
              required
              render={({ field, id, invalid, describedBy }) => (
                <Input
                  {...field}
                  value={String(field.value ?? "")}
                  id={id}
                  type="number"
                  inputMode="numeric"
                  aria-invalid={invalid}
                  aria-describedby={describedBy}
                />
              )}
            />
            <FormField
              control={form.control}
              name="frameHeight"
              label={t("Hündürlük, px")}
              required
              render={({ field, id, invalid, describedBy }) => (
                <Input
                  {...field}
                  value={String(field.value ?? "")}
                  id={id}
                  type="number"
                  inputMode="numeric"
                  aria-invalid={invalid}
                  aria-describedby={describedBy}
                />
              )}
            />
            <FormField
              control={form.control}
              name="format"
              label={t("Format")}
              required
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
                    {heroFilmFormats.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="posterId"
            label={t("Poster")}
            description={t("Film yüklənənə qədər və hərəkət azaldılanda göstərilən şəkil.")}
            render={({ field, id, invalid, describedBy }) => (
              <ImagePicker
                id={id}
                label={t("Poster")}
                value={poster}
                invalid={invalid}
                describedBy={describedBy}
                onChange={(media) => {
                  setPoster(media);
                  field.onChange(media?.id ?? "");
                  field.onBlur();
                }}
              />
            )}
          />
        </form>
        <DialogFooter>
          <Button variant="outline" type="button" disabled={isSubmitting} onClick={onClose}>
            {t("Ləğv et")}
          </Button>
          <Button type="submit" form="hero-film-form" disabled={isSubmitting}>
            {isSubmitting ? t("Saxlanılır") : film ? t("Saxla") : t("Əlavə et")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
