"use client";

import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";

import { LocaleTabs } from "@/components/admin/locale-tabs";
import { DragHandle, SortableList } from "@/components/admin/sortable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/admin/i18n/use-t";
import type { Locale } from "@/lib/i18n/config";
import type { ProductInput } from "@/lib/validation/products";

export function ProductSpecs() {
  const t = useT();
  const form = useFormContext<ProductInput>();
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "specs",
    keyName: "key",
  });
  const specs = form.watch("specs");
  const errors = form.formState.errors.specs;
  const errorAt = (index: number, part: "key" | "value", locale: Locale) =>
    Array.isArray(errors) ? errors[index]?.[part]?.[locale]?.message : undefined;

  const invalid: Partial<Record<Locale, boolean>> = {
    az: fields.some((_, index) => errorAt(index, "key", "az") || errorAt(index, "value", "az")),
  };
  const filled = {
    ru: specs.every((spec) => spec.key.ru && spec.value.ru),
    en: specs.every((spec) => spec.key.en && spec.value.en),
  };

  return (
    <div className="flex flex-col gap-4">
      {fields.length ? (
        <LocaleTabs filled={filled} invalid={invalid}>
          {(locale) => (
            <SortableList
              items={fields}
              getId={(field) => field.key}
              getLabel={(field) => {
                const index = fields.findIndex((item) => item.key === field.key);
                return specs[index]?.key.az || t("Göstərici {number}", { number: index + 1 });
              }}
              onReorder={(from, to) => move(from, to)}
              className="flex flex-col border border-border"
              itemClassName="border-b border-border bg-white last:border-0"
            >
              {(field, index, { handle }) => {
                const keyId = `spec-${field.key}-key-${locale}`;
                const valueId = `spec-${field.key}-value-${locale}`;
                const keyError = errorAt(index, "key", locale);
                const valueError = errorAt(index, "value", locale);
                return (
                  <div className="flex items-start gap-1 p-2">
                    <DragHandle
                      label={t("{label}: yerini dəyiş", {
                        label:
                          specs[index]?.key.az || t("Göstərici {number}", { number: index + 1 }),
                      })}
                      {...handle}
                    />
                    <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                      <div className="flex flex-col gap-1">
                        <label htmlFor={keyId} className="sr-only">
                          {t("Göstərici {number} ({locale})", {
                            number: index + 1,
                            locale: locale.toUpperCase(),
                          })}
                        </label>
                        <Input
                          id={keyId}
                          placeholder={
                            locale === "az" ? t("Göstərici, məs. Hündürlük") : specs[index]?.key.az
                          }
                          maxLength={120}
                          aria-invalid={Boolean(keyError)}
                          {...form.register(`specs.${index}.key.${locale}`)}
                        />
                        {keyError ? (
                          <p className="text-meta text-destructive">{t.message(keyError)}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-col gap-1">
                        <label htmlFor={valueId} className="sr-only">
                          {t("Dəyər {number} ({locale})", {
                            number: index + 1,
                            locale: locale.toUpperCase(),
                          })}
                        </label>
                        <Input
                          id={valueId}
                          placeholder={
                            locale === "az" ? t("Dəyər, məs. 75 sm") : specs[index]?.value.az
                          }
                          maxLength={250}
                          aria-invalid={Boolean(valueError)}
                          {...form.register(`specs.${index}.value.${locale}`)}
                        />
                        {valueError ? (
                          <p className="text-meta text-destructive">{t.message(valueError)}</p>
                        ) : null}
                      </div>
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
          {t("Ölçü, material, rəng kimi texniki göstəriciləri sətir-sətir əlavə edin.")}
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        disabled={fields.length >= 60}
        onClick={() =>
          append({ key: { az: "", ru: "", en: "" }, value: { az: "", ru: "", en: "" } })
        }
      >
        <Plus strokeWidth={1.5} />
        {t("Göstərici əlavə et")}
      </Button>
    </div>
  );
}
