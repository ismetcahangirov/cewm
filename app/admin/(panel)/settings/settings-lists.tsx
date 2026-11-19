"use client";

import { Plus, Trash2 } from "lucide-react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";

import { LocaleTabs } from "@/components/admin/locale-tabs";
import { DragHandle, SortableList } from "@/components/admin/sortable";
import { Button } from "@/components/ui/button";
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
import {
  settingsLimits,
  socialNetworkLabels,
  socialNetworks,
  type SettingsInput,
  type SocialNetwork,
} from "@/lib/validation/settings";

function FieldMessage({ id, message }: { id: string; message: string | undefined }) {
  const t = useT();
  if (!message) return null;
  return (
    <p id={id} className="text-meta text-destructive">
      {t.message(message)}
    </p>
  );
}

function ListMessage({ message }: { message: string | undefined }) {
  const t = useT();
  if (!message) return null;
  return (
    <p role="alert" className="text-meta text-destructive">
      {t.message(message)}
    </p>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      onClick={onClick}
      className="max-md:size-11"
    >
      <Trash2 strokeWidth={1.5} />
    </Button>
  );
}

type ArrayErrors = { message?: string; root?: { message?: string } } | undefined;

function arrayMessage(errors: ArrayErrors): string | undefined {
  return errors?.message ?? errors?.root?.message;
}

export function PhoneRows() {
  const t = useT();
  const form = useFormContext<SettingsInput>();
  const { fields, append, remove, move } = useFieldArray({ control: form.control, name: "phones" });
  const phones = useWatch({ control: form.control, name: "phones" }) ?? [];
  const errors = form.formState.errors.phones;
  const rowErrors = Array.isArray(errors) ? errors : [];
  const labelError = (index: number, locale: Locale) =>
    rowErrors[index]?.label?.[locale]?.message as string | undefined;
  const numberError = (index: number) => rowErrors[index]?.number?.message as string | undefined;
  const name = (index: number) => phones[index]?.label?.az || `${t("Nömrə")} ${index + 1}`;

  return (
    <div className="flex flex-col gap-3">
      <LocaleTabs
        invalid={{
          az: fields.some((_, index) => labelError(index, "az") || numberError(index)),
        }}
        filled={{
          ru: phones.every((phone) => phone.label?.ru),
          en: phones.every((phone) => phone.label?.en),
        }}
      >
        {(locale) => (
          <SortableList
            items={fields}
            getId={(field) => field.id}
            getLabel={(field) => name(fields.findIndex((item) => item.id === field.id))}
            onReorder={(from, to) => move(from, to)}
            className="flex flex-col border border-border"
            itemClassName="border-b border-border bg-white last:border-0"
          >
            {(field, index, { handle }) => {
              const labelId = `phone-${field.id}-label-${locale}`;
              const numberId = `phone-${field.id}-number-${locale}`;
              const labelMessage = labelError(index, locale);
              const numberMessage = numberError(index);
              return (
                <div className="flex items-start gap-1 p-2">
                  <DragHandle
                    label={t("{name}: yerini dəyiş", { name: name(index) })}
                    {...handle}
                  />
                  <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label htmlFor={labelId} className="text-meta text-muted-foreground">
                        {t("Ad ({locale})", { locale: locale.toUpperCase() })}
                      </label>
                      <Input
                        id={labelId}
                        placeholder={
                          locale === "az" ? t("Məsələn, Ofis") : phones[index]?.label?.az
                        }
                        maxLength={60}
                        aria-invalid={Boolean(labelMessage)}
                        aria-describedby={labelMessage ? `${labelId}-error` : undefined}
                        {...form.register(`phones.${index}.label.${locale}`)}
                      />
                      <FieldMessage id={`${labelId}-error`} message={labelMessage} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor={numberId} className="text-meta text-muted-foreground">
                        {t("Nömrə")}
                      </label>
                      <Input
                        id={numberId}
                        type="tel"
                        inputMode="tel"
                        autoComplete="off"
                        placeholder="+994 12 526 54 23"
                        maxLength={32}
                        aria-invalid={Boolean(numberMessage)}
                        aria-describedby={numberMessage ? `${numberId}-error` : undefined}
                        {...form.register(`phones.${index}.number`)}
                      />
                      <FieldMessage id={`${numberId}-error`} message={numberMessage} />
                    </div>
                  </div>
                  <RemoveButton
                    label={t("{name}: sil", { name: name(index) })}
                    onClick={() => remove(index)}
                  />
                </div>
              );
            }}
          </SortableList>
        )}
      </LocaleTabs>
      <ListMessage message={arrayMessage(errors as ArrayErrors)} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        disabled={fields.length >= settingsLimits.phones}
        onClick={() => append({ label: { az: "", ru: "", en: "", de: "" }, number: "" })}
      >
        <Plus strokeWidth={1.5} />
        {t("Nömrə əlavə et")}
      </Button>
    </div>
  );
}

export function EmailRows() {
  const t = useT();
  const form = useFormContext<SettingsInput>();
  const { fields, append, remove, move } = useFieldArray({ control: form.control, name: "emails" });
  const emails = useWatch({ control: form.control, name: "emails" }) ?? [];
  const errors = form.formState.errors.emails;
  const rowErrors = Array.isArray(errors) ? errors : [];
  const name = (index: number) => emails[index]?.address || `${t("E-poçt")} ${index + 1}`;

  return (
    <div className="flex flex-col gap-3">
      {fields.length ? (
        <SortableList
          items={fields}
          getId={(field) => field.id}
          getLabel={(field) => name(fields.findIndex((item) => item.id === field.id))}
          onReorder={(from, to) => move(from, to)}
          className="flex flex-col border border-border"
          itemClassName="border-b border-border bg-white last:border-0"
        >
          {(field, index, { handle }) => {
            const inputId = `email-${field.id}`;
            const message = rowErrors[index]?.address?.message as string | undefined;
            return (
              <div className="flex items-start gap-1 p-2">
                <DragHandle label={t("{name}: yerini dəyiş", { name: name(index) })} {...handle} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <label htmlFor={inputId} className="sr-only">
                    {`${t("E-poçt")} ${index + 1}`}
                  </label>
                  <Input
                    id={inputId}
                    type="email"
                    inputMode="email"
                    autoComplete="off"
                    placeholder="info@example.com"
                    maxLength={254}
                    aria-invalid={Boolean(message)}
                    aria-describedby={message ? `${inputId}-error` : undefined}
                    {...form.register(`emails.${index}.address`)}
                  />
                  <FieldMessage id={`${inputId}-error`} message={message} />
                </div>
                <RemoveButton
                  label={t("{name}: sil", { name: name(index) })}
                  onClick={() => remove(index)}
                />
              </div>
            );
          }}
        </SortableList>
      ) : (
        <p className="text-meta text-muted-foreground">
          {t("Saytda göstəriləcək e-poçt ünvanı yoxdur.")}
        </p>
      )}
      <ListMessage message={arrayMessage(errors as ArrayErrors)} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        disabled={fields.length >= settingsLimits.emails}
        onClick={() => append({ address: "" })}
      >
        <Plus strokeWidth={1.5} />
        {t("E-poçt əlavə et")}
      </Button>
    </div>
  );
}

export function SocialRows() {
  const t = useT();
  const form = useFormContext<SettingsInput>();
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "socials",
  });
  const socials = useWatch({ control: form.control, name: "socials" }) ?? [];
  const errors = form.formState.errors.socials;
  const rowErrors = Array.isArray(errors) ? errors : [];
  const used = new Set(socials.map((social) => social.network));
  const free = socialNetworks.filter((network) => !used.has(network));
  const name = (index: number) => {
    const network = socials[index]?.network;
    return network ? socialNetworkLabels[network] : `${t("Şəbəkə")} ${index + 1}`;
  };

  return (
    <div className="flex flex-col gap-3">
      {fields.length ? (
        <SortableList
          items={fields}
          getId={(field) => field.id}
          getLabel={(field) => name(fields.findIndex((item) => item.id === field.id))}
          onReorder={(from, to) => move(from, to)}
          className="flex flex-col border border-border"
          itemClassName="border-b border-border bg-white last:border-0"
        >
          {(field, index, { handle }) => {
            const networkId = `social-${field.id}-network`;
            const urlId = `social-${field.id}-url`;
            const networkMessage = rowErrors[index]?.network?.message as string | undefined;
            const urlMessage = rowErrors[index]?.url?.message as string | undefined;
            return (
              <div className="flex items-start gap-1 p-2">
                <DragHandle label={t("{name}: yerini dəyiş", { name: name(index) })} {...handle} />
                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-3">
                  <div className="flex flex-col gap-1">
                    <label htmlFor={networkId} className="sr-only">
                      {`${t("Şəbəkə")} ${index + 1}`}
                    </label>
                    <Controller
                      control={form.control}
                      name={`socials.${index}.network`}
                      render={({ field: control }) => (
                        <Select
                          value={control.value}
                          onValueChange={(value) => control.onChange(value as SocialNetwork)}
                        >
                          <SelectTrigger
                            id={networkId}
                            className="w-full"
                            aria-invalid={Boolean(networkMessage)}
                            onBlur={control.onBlur}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {socialNetworks.map((network) => (
                              <SelectItem
                                key={network}
                                value={network}
                                disabled={network !== control.value && used.has(network)}
                              >
                                {socialNetworkLabels[network]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FieldMessage id={`${networkId}-error`} message={networkMessage} />
                  </div>
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label htmlFor={urlId} className="sr-only">
                      {t("{name}: link", { name: name(index) })}
                    </label>
                    <Input
                      id={urlId}
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      placeholder="https://www.instagram.com/..."
                      maxLength={500}
                      aria-invalid={Boolean(urlMessage)}
                      aria-describedby={urlMessage ? `${urlId}-error` : undefined}
                      {...form.register(`socials.${index}.url`)}
                    />
                    <FieldMessage id={`${urlId}-error`} message={urlMessage} />
                  </div>
                </div>
                <RemoveButton
                  label={t("{name}: sil", { name: name(index) })}
                  onClick={() => remove(index)}
                />
              </div>
            );
          }}
        </SortableList>
      ) : (
        <p className="text-meta text-muted-foreground">
          {t("Sosial şəbəkə linki əlavə olunmayıb.")}
        </p>
      )}
      <ListMessage message={arrayMessage(errors as ArrayErrors)} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        disabled={!free.length}
        onClick={() => {
          const [network] = free;
          if (network) append({ network, url: "" });
        }}
      >
        <Plus strokeWidth={1.5} />
        {t("Şəbəkə əlavə et")}
      </Button>
    </div>
  );
}
