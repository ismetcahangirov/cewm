"use client";

import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";

import { FormField } from "@/components/admin/form";
import { LocaleTabs } from "@/components/admin/locale-tabs";
import { DragHandle, SortableList } from "@/components/admin/sortable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { hasLocaleError } from "@/lib/admin/form-values";
import type { MessageKey } from "@/lib/admin/i18n";
import { useT } from "@/lib/admin/i18n/use-t";
import { locales, type Locale } from "@/lib/i18n/config";
import {
  customSectionLimit,
  homeSectionLabels,
  mediaWidthRange,
  titledHomeSections,
  type HomeSectionKey,
  type HomeSectionsInput,
} from "@/lib/validation/home-sections";
import type { MediaDto } from "@/lib/validation/media";

import { CustomSectionFields } from "./custom-section-fields";

export type SectionDefaults = Record<HomeSectionKey, Record<Locale, string> | null>;

const sources: Record<HomeSectionKey, { text: MessageKey; href: string; link: MessageKey }> = {
  categories: {
    text: "Aktiv üst kateqoriyalar, kateqoriyalar səhifəsindəki sıra ilə.",
    href: "/admin/categories",
    link: "Kateqoriyalar",
  },
  products: {
    text: "Aşağıdakı «Seçilmiş məhsullar» siyahısı.",
    href: "#featured-products",
    link: "Siyahıya keç",
  },
  projects: {
    text: "Dərc olunmuş ilk 8 layihə, layihələr səhifəsindəki sıra ilə. Bölmə gizlədiləndə «Təklif al» bloku qalır.",
    href: "/admin/projects",
    link: "Layihələr",
  },
  logos: {
    text: "Aktiv referans və partnyor loqoları, hərəkət edən lent kimi.",
    href: "/admin/logos",
    link: "Partnyorlar",
  },
};

type SectionInput = HomeSectionsInput["sections"][number];

function newCustomSection(id: string): SectionInput {
  return {
    key: "custom",
    id,
    visible: true,
    title: { az: "", ru: "", en: "" },
    block: {
      eyebrow: { az: "", ru: "", en: "" },
      body: null,
      linkLabel: { az: "", ru: "", en: "" },
      href: "",
      mediaKind: "image",
      mediaId: "",
      posterId: "",
      autoplay: true,
      sound: false,
      layout: "media-left",
      mediaWidth: mediaWidthRange.fallback,
      tone: "white",
    },
  };
}

export function SectionList({
  defaults,
  mediaById,
  remember,
}: {
  defaults: SectionDefaults;
  mediaById: Map<string, MediaDto>;
  remember: (media: MediaDto) => void;
}) {
  const t = useT();
  const form = useFormContext<HomeSectionsInput>();
  const { fields, move, append, remove } = useFieldArray({
    control: form.control,
    name: "sections",
  });
  const sections = useWatch({ control: form.control, name: "sections" }) ?? [];
  const errors = form.formState.errors.sections;
  const rowErrors = Array.isArray(errors) ? errors : [];
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const customCount = sections.filter((section) => section?.key === "custom").length;

  function labelOf(index: number): string {
    const section = sections[index];
    if (!section) return "";
    if (section.key !== "custom") return t(homeSectionLabels[section.key]);
    const order = sections.slice(0, index + 1).filter((item) => item?.key === "custom").length;
    return section.title?.az?.trim() || t("Əlavə bölmə {number}", { number: order });
  }

  function toggle(id: string) {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addSection() {
    const id = crypto.randomUUID();
    append(newCustomSection(id));
    setOpen((current) => new Set(current).add(id));
  }

  return (
    <div className="flex flex-col gap-3">
      <SortableList
        items={fields}
        getId={(field) => field.id}
        getLabel={(field) => labelOf(fields.findIndex((item) => item.id === field.id))}
        onReorder={(from, to) => move(from, to)}
        className="flex flex-col gap-3"
        itemClassName="rounded-sm border border-border bg-white"
      >
        {(_field, index, { handle }) => {
          const section = sections[index];
          const label = labelOf(index);
          const visible = section?.visible ?? true;
          const custom = section?.key === "custom" ? section : null;
          const expanded = custom ? open.has(custom.id) || Boolean(rowErrors[index]) : false;
          const key = section && section.key !== "custom" ? section.key : null;
          const fallback = key ? defaults[key] : null;
          const source = key ? sources[key] : null;
          return (
            <div className="flex flex-col gap-4 p-3 md:p-4">
              <div className="flex items-center gap-1">
                <DragHandle label={t("{name}: yerini dəyiş", { name: label })} {...handle} />
                <h3 className="mr-auto min-w-0 truncate text-meta font-medium">
                  {index + 1}. {label}
                  {custom ? (
                    <span className="ml-2 font-normal text-muted-foreground">{t("əlavə")}</span>
                  ) : null}
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("{name}: yuxarı", { name: label })}
                  disabled={index === 0}
                  onClick={() => move(index, index - 1)}
                  className="max-md:size-11"
                >
                  <ArrowUp strokeWidth={1.5} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("{name}: aşağı", { name: label })}
                  disabled={index === fields.length - 1}
                  onClick={() => move(index, index + 1)}
                  className="max-md:size-11"
                >
                  <ArrowDown strokeWidth={1.5} />
                </Button>
                {custom ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("{name}: sil", { name: label })}
                      onClick={() => remove(index)}
                      className="max-md:size-11"
                    >
                      <Trash2 strokeWidth={1.5} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-expanded={expanded}
                      aria-label={
                        expanded
                          ? t("{name}: bağla", { name: label })
                          : t("{name}: redaktə et", { name: label })
                      }
                      onClick={() => toggle(custom.id)}
                      className="max-md:size-11"
                    >
                      <ChevronDown
                        strokeWidth={1.5}
                        className={cn("transition-transform", expanded && "rotate-180")}
                      />
                    </Button>
                  </>
                ) : null}
              </div>
              <FormField
                control={form.control}
                name={`sections.${index}.visible`}
                label={t("Saytda göstər")}
                render={({ field: control, id, describedBy }) => (
                  <div className="flex min-h-11 items-center gap-3">
                    <Switch
                      id={id}
                      checked={control.value}
                      onCheckedChange={control.onChange}
                      onBlur={control.onBlur}
                      aria-describedby={describedBy}
                    />
                    <span className="text-meta text-muted-foreground">
                      {visible ? t("Görünür") : t("Gizlədilib")}
                    </span>
                  </div>
                )}
              />
              {custom && expanded ? (
                <CustomSectionFields index={index} mediaById={mediaById} remember={remember} />
              ) : null}
              {key && fallback && titledHomeSections.includes(key) ? (
                <LocaleTabs
                  key={_field.id}
                  required={false}
                  emptyNote={t("Boş qalsa, saytda standart başlıq göstərilir.")}
                  invalid={Object.fromEntries(
                    locales.map((locale) => [
                      locale,
                      hasLocaleError(rowErrors[index]?.title, locale),
                    ]),
                  )}
                  filled={{
                    ru: Boolean(section?.title?.ru),
                    en: Boolean(section?.title?.en),
                  }}
                >
                  {(locale) => (
                    <FormField
                      control={form.control}
                      name={`sections.${index}.title.${locale}`}
                      label={t("Başlıq ({locale})", { locale: locale.toUpperCase() })}
                      description={t("Boş qalsa: «{title}».", { title: fallback[locale] })}
                      render={({ field: control, id, invalid, describedBy }) => (
                        <Input
                          {...control}
                          value={control.value ?? ""}
                          id={id}
                          maxLength={120}
                          placeholder={fallback[locale]}
                          aria-invalid={invalid}
                          aria-describedby={describedBy}
                        />
                      )}
                    />
                  )}
                </LocaleTabs>
              ) : null}
              {source ? (
                <p className="text-meta text-muted-foreground">
                  {t(source.text)}{" "}
                  <Link href={source.href} className="text-foreground underline underline-offset-4">
                    {t(source.link)}
                  </Link>
                </p>
              ) : null}
            </div>
          );
        }}
      </SortableList>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        disabled={customCount >= customSectionLimit}
        onClick={addSection}
      >
        <Plus strokeWidth={1.5} />
        {t("Bölmə əlavə et")}
      </Button>
    </div>
  );
}
