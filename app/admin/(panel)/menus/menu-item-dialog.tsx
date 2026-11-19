"use client";

import { useWatch } from "react-hook-form";

import { FormField, useZodForm } from "@/components/admin/form";
import { LocaleTabs } from "@/components/admin/locale-tabs";
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
import type { Locale } from "@/lib/i18n/config";
import { locales } from "@/lib/i18n/config";
import type { Localized } from "@/lib/i18n/localized";
import { useContentText } from "@/lib/store/hooks";
import {
  menuItemFieldsSchema,
  menuItemTargetLabels,
  menuItemTargets,
  type MenuContentOption,
  type MenuItemFields,
  type MenuItemFieldsInput,
  type MenuItemTarget,
  type MenuTargetsDto,
} from "@/lib/validation/menus";

import { CategoryTargetSelect } from "./category-target-select";

function toFormValues(item: MenuItemFields | null): MenuItemFieldsInput {
  return {
    label: { az: item?.label.az ?? "", ru: item?.label.ru ?? "", en: item?.label.en ?? "" },
    target: item?.target ?? "category",
    categoryId: item?.categoryId ?? null,
    pageId: item?.pageId ?? null,
    projectId: item?.projectId ?? null,
    url: item?.url ?? "",
  };
}

function hasLocaleError(value: unknown, locale: Locale): boolean {
  return Boolean(value && typeof value === "object" && locale in value);
}

function ContentSelect({
  options,
  value,
  onChange,
  placeholder,
  empty,
  id,
  invalid,
  describedBy,
  onBlur,
}: {
  options: MenuContentOption[];
  value: string | null | undefined;
  onChange: (option: MenuContentOption) => void;
  placeholder: string;
  empty: string;
  id: string;
  invalid: boolean;
  describedBy: string | undefined;
  onBlur: () => void;
}) {
  const t = useT();
  const text = useContentText();
  if (!options.length) {
    return (
      <p id={id} className="text-meta text-muted-foreground">
        {empty}
      </p>
    );
  }
  return (
    <Select
      value={value ?? ""}
      onValueChange={(next) => {
        const option = options.find((entry) => entry.id === next);
        if (option) onChange(option);
      }}
    >
      <SelectTrigger
        id={id}
        className="w-full"
        aria-invalid={invalid}
        aria-describedby={describedBy}
        onBlur={onBlur}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {text(option.title)}
            {option.isPublished ? null : (
              <span className="text-muted-foreground"> {t("(dərc olunmayıb)")}</span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function MenuItemDialog({
  item,
  targets,
  allowHeading,
  title,
  onSave,
  onClose,
}: {
  item: MenuItemFields | null;
  targets: MenuTargetsDto;
  allowHeading: boolean;
  title: string;
  onSave: (fields: MenuItemFields) => void;
  onClose: () => void;
}) {
  const t = useT();
  const form = useZodForm(menuItemFieldsSchema, { defaultValues: toFormValues(item) });
  const target = useWatch({ control: form.control, name: "target" });
  const label = useWatch({ control: form.control, name: "label" });
  const { errors } = form.formState;
  const choices = menuItemTargets.filter((value) => allowHeading || value !== "none");

  function fillLabel(title: Localized) {
    if (form.getValues("label.az").trim()) return;
    form.setValue(
      "label",
      { az: title.az, ru: title.ru ?? "", en: title.en ?? "" },
      { shouldDirty: true, shouldValidate: true },
    );
  }

  const invalid: Partial<Record<Locale, boolean>> = {};
  for (const locale of locales) invalid[locale] = hasLocaleError(errors.label, locale);

  const onSubmit = form.handleSubmit((values) => {
    onSave(values);
    onClose();
  });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-dvh overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {t("Dəyişiklik menyunu «Saxla» ilə saxlayanda saytda görünəcək.")}
          </DialogDescription>
        </DialogHeader>
        <form
          id="menu-item-form"
          onSubmit={(event) => {
            event.stopPropagation();
            void onSubmit(event);
          }}
          noValidate
          className="flex flex-col gap-5"
        >
          <FormField
            control={form.control}
            name="target"
            label={t("Hara aparır")}
            required
            render={({ field, id, invalid: fieldInvalid, describedBy }) => (
              <Select
                value={field.value}
                onValueChange={(value) => field.onChange(value as MenuItemTarget)}
              >
                <SelectTrigger
                  id={id}
                  className="w-full"
                  aria-invalid={fieldInvalid}
                  aria-describedby={describedBy}
                  onBlur={field.onBlur}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {choices.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(menuItemTargetLabels[value])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {target === "category" ? (
            <FormField
              control={form.control}
              name="categoryId"
              label={t("Kateqoriya")}
              required
              description={t("Gizli kateqoriya saytda göstərilmir.")}
              render={({ field, id, invalid: fieldInvalid, describedBy }) => (
                <CategoryTargetSelect
                  id={id}
                  categories={targets.categories}
                  value={field.value ?? null}
                  invalid={fieldInvalid}
                  describedBy={describedBy}
                  onChange={(category) => {
                    field.onChange(category.id);
                    field.onBlur();
                    fillLabel(category.title);
                  }}
                />
              )}
            />
          ) : null}
          {target === "page" ? (
            <FormField
              control={form.control}
              name="pageId"
              label={t("Səhifə")}
              required
              render={({ field, id, invalid: fieldInvalid, describedBy }) => (
                <ContentSelect
                  id={id}
                  options={targets.pages}
                  value={field.value}
                  placeholder={t("Səhifə seçin")}
                  empty={t("Hələ səhifə yoxdur.")}
                  invalid={fieldInvalid}
                  describedBy={describedBy}
                  onBlur={field.onBlur}
                  onChange={(option) => {
                    field.onChange(option.id);
                    fillLabel(option.title);
                  }}
                />
              )}
            />
          ) : null}
          {target === "project" ? (
            <FormField
              control={form.control}
              name="projectId"
              label={t("Layihə")}
              required
              render={({ field, id, invalid: fieldInvalid, describedBy }) => (
                <ContentSelect
                  id={id}
                  options={targets.projects}
                  value={field.value}
                  placeholder={t("Layihə seçin")}
                  empty={t("Hələ layihə yoxdur.")}
                  invalid={fieldInvalid}
                  describedBy={describedBy}
                  onBlur={field.onBlur}
                  onChange={(option) => {
                    field.onChange(option.id);
                    fillLabel(option.title);
                  }}
                />
              )}
            />
          ) : null}
          {target === "url" ? (
            <FormField
              control={form.control}
              name="url"
              label={t("Ünvan")}
              required
              description={t(
                "https:// ilə tam ünvan, saytdakı yol (/layiheler), tel:+994... və ya mailto:...",
              )}
              render={({ field, id, invalid: fieldInvalid, describedBy }) => (
                <Input
                  {...field}
                  value={field.value ?? ""}
                  id={id}
                  inputMode="url"
                  autoComplete="off"
                  placeholder="https://"
                  aria-invalid={fieldInvalid}
                  aria-describedby={describedBy}
                />
              )}
            />
          ) : null}
          {target === "none" ? (
            <p className="text-meta text-muted-foreground">
              {t(
                "Başlıq keçid deyil: altındakı elementləri qruplaşdırır. Alt elementi olmayan başlıq saytda göstərilmir.",
              )}
            </p>
          ) : null}
          <LocaleTabs invalid={invalid} filled={{ ru: Boolean(label?.ru), en: Boolean(label?.en) }}>
            {(locale) => (
              <FormField
                control={form.control}
                name={`label.${locale}`}
                label={t("Ad ({locale})", { locale: locale.toUpperCase() })}
                required={locale === "az"}
                render={({ field, id, invalid: fieldInvalid, describedBy }) => (
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    id={id}
                    maxLength={120}
                    autoComplete="off"
                    aria-invalid={fieldInvalid}
                    aria-describedby={describedBy}
                  />
                )}
              />
            )}
          </LocaleTabs>
        </form>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose}>
            {t("Ləğv et")}
          </Button>
          <Button type="submit" form="menu-item-form">
            {item ? t("Tətbiq et") : t("Əlavə et")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
