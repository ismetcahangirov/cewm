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

export function ProductBenefits() {
  const t = useT();
  const form = useFormContext<ProductInput>();
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "benefits",
    keyName: "key",
  });
  const benefits = useWatch({ control: form.control, name: "benefits" }) ?? [];
  const errors = form.formState.errors.benefits;
  const errorAt = (index: number, locale: Locale) =>
    Array.isArray(errors) ? errors[index]?.text?.[locale]?.message : undefined;
  const labelOf = (index: number) =>
    benefits[index]?.text?.az || t("Üstünlük {number}", { number: index + 1 });

  return (
    <div className="flex flex-col gap-4">
      {fields.length ? (
        <LocaleTabs
          invalid={{ az: fields.some((_, index) => errorAt(index, "az")) }}
          filled={{
            ru: benefits.every((item) => item.text?.ru),
            en: benefits.every((item) => item.text?.en),
            de: benefits.every((item) => item.text?.de),
          }}
        >
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
                const id = `benefit-${field.key}-${locale}`;
                const message = errorAt(index, locale);
                return (
                  <div className="flex items-start gap-1 p-2">
                    <DragHandle
                      label={t("{label}: yerini dəyiş", { label: labelOf(index) })}
                      {...handle}
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <label htmlFor={id} className="sr-only">
                        {t("Üstünlük {number} ({locale})", {
                          number: index + 1,
                          locale: locale.toUpperCase(),
                        })}
                      </label>
                      <Input
                        id={id}
                        maxLength={200}
                        placeholder={locale === "az" ? "" : (benefits[index]?.text?.az ?? "")}
                        aria-invalid={Boolean(message)}
                        {...form.register(`benefits.${index}.text.${locale}`)}
                      />
                      {message ? (
                        <p className="text-meta text-destructive">{t.message(message)}</p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("Üstünlük {number}: sil", { number: index + 1 })}
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
          {t("Maşının əsas üstünlüklərini qısa cümlələrlə əlavə edin, hər sətirdə bir üstünlük.")}
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        disabled={fields.length >= productLimits.benefits}
        onClick={() => append({ text: { az: "", ru: "", en: "", de: "" } })}
      >
        <Plus strokeWidth={1.5} />
        {t("Üstünlük əlavə et")}
      </Button>
    </div>
  );
}
