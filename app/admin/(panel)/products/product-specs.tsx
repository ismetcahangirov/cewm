"use client";

import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";

import { LocaleTabs } from "@/components/admin/locale-tabs";
import { DragHandle, SortableList } from "@/components/admin/sortable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/admin/i18n/use-t";
import type { Locale } from "@/lib/i18n/config";
import { productLimits, type ProductInput } from "@/lib/validation/products";

const emptyText = { az: "", ru: "", en: "", de: "" };

type Part = "label" | "value" | "unit";

export function ProductSpecs() {
  const t = useT();
  const form = useFormContext<ProductInput>();
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "specs",
    keyName: "key",
  });
  const specs = useWatch({ control: form.control, name: "specs" }) ?? [];
  const errors = form.formState.errors.specs;
  const errorAt = (index: number, part: Part, locale: Locale) =>
    Array.isArray(errors) ? errors[index]?.[part]?.[locale]?.message : undefined;

  const invalid: Partial<Record<Locale, boolean>> = {
    az: fields.some((_, index) => errorAt(index, "label", "az") || errorAt(index, "value", "az")),
  };
  const filled = {
    ru: specs.every((spec) => spec.label?.ru && spec.value?.ru),
    en: specs.every((spec) => spec.label?.en && spec.value?.en),
    de: specs.every((spec) => spec.label?.de && spec.value?.de),
  };
  const labelOf = (index: number) =>
    specs[index]?.label?.az || t("Göstərici {number}", { number: index + 1 });

  return (
    <div className="flex flex-col gap-4">
      {fields.length ? (
        <LocaleTabs filled={filled} invalid={invalid}>
          {(locale) => (
            <SortableList
              items={fields}
              getId={(field) => field.key}
              getLabel={(field) => labelOf(fields.findIndex((item) => item.key === field.key))}
              onReorder={(from, to) => move(from, to)}
              className="flex flex-col border border-border"
              itemClassName="border-b border-border bg-white last:border-0"
            >
              {(field, index, { handle }) => {
                const cell = (
                  part: Part,
                  maxLength: number,
                  placeholder: string,
                  label: string,
                ) => {
                  const id = `spec-${field.key}-${part}-${locale}`;
                  const message = errorAt(index, part, locale);
                  return (
                    <div className="flex flex-col gap-1">
                      <label htmlFor={id} className="sr-only">
                        {label}
                      </label>
                      <Input
                        id={id}
                        placeholder={placeholder}
                        maxLength={maxLength}
                        aria-invalid={Boolean(message)}
                        {...form.register(`specs.${index}.${part}.${locale}`)}
                      />
                      {message ? (
                        <p className="text-meta text-destructive">{t.message(message)}</p>
                      ) : null}
                    </div>
                  );
                };
                const params = { number: index + 1, locale: locale.toUpperCase() };
                return (
                  <div className="flex items-start gap-1 p-2">
                    <DragHandle
                      label={t("{label}: yerini dəyiş", { label: labelOf(index) })}
                      {...handle}
                    />
                    <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[2fr_2fr_1fr]">
                      {cell(
                        "label",
                        120,
                        locale === "az"
                          ? t("Göstərici, məs. Kəsmə uzunluğu")
                          : (specs[index]?.label?.az ?? ""),
                        t("Göstərici {number} ({locale})", params),
                      )}
                      {cell(
                        "value",
                        250,
                        locale === "az" ? t("Dəyər, məs. 3200") : (specs[index]?.value?.az ?? ""),
                        t("Dəyər {number} ({locale})", params),
                      )}
                      {cell(
                        "unit",
                        30,
                        locale === "az" ? t("Vahid, məs. mm") : (specs[index]?.unit?.az ?? ""),
                        t("Vahid {number} ({locale})", params),
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("Göstərici {number}: sil", { number: index + 1 })}
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
      ) : (
        <p className="text-meta text-muted-foreground">
          {t(
            "Kəsmə uzunluğu, güc, çəki kimi texniki göstəriciləri sətir-sətir əlavə edin: ad, dəyər və vahid.",
          )}
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        disabled={fields.length >= productLimits.specs}
        onClick={() =>
          append({ label: { ...emptyText }, value: { ...emptyText }, unit: { ...emptyText } })
        }
      >
        <Plus strokeWidth={1.5} />
        {t("Göstərici əlavə et")}
      </Button>
    </div>
  );
}
