"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useWatch } from "react-hook-form";
import { toast } from "sonner";

import { applyServerErrors, FormAlert, FormField, useZodForm } from "@/components/admin/form";
import { LocaleTabs } from "@/components/admin/locale-tabs";
import { arrayMove, DragHandle, SortableList } from "@/components/admin/sortable";
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
import { filledLocales } from "@/lib/admin/form-values";
import { useT } from "@/lib/admin/i18n/use-t";
import { useCreateMenuMutation, useReorderMenusMutation } from "@/lib/api/menus";
import { apiErrorMessage } from "@/lib/api/types";
import { createMenuSchema, type MenuSummaryDto } from "@/lib/validation/menus";
import { useContentText } from "@/lib/store/hooks";

export function NewFooterColumnDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const text = useContentText();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [createMenu] = useCreateMenuMutation();
  const form = useZodForm(createMenuSchema, {
    defaultValues: { title: { az: "", ru: "", en: "", de: "" } },
  });
  const title = useWatch({ control: form.control, name: "title" });
  const { isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const menu = await createMenu(values).unwrap();
      toast.success(t("«{name}» sütunu yaradıldı.", { name: text(menu.title) }));
      onClose();
      router.push(`/admin/menus?menu=${menu.id}`);
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Yeni altbilgi sütunu")}</DialogTitle>
          <DialogDescription>
            {t("Başlıq saytın altbilgisində sütunun üstündə göstərilir.")}
          </DialogDescription>
        </DialogHeader>
        <form
          id="footer-column-form"
          onSubmit={onSubmit}
          noValidate
          className="flex flex-col gap-5"
        >
          <FormAlert message={error} />
          <LocaleTabs filled={filledLocales(title)}>
            {(locale) => (
              <FormField
                control={form.control}
                name={`title.${locale}`}
                label={t("Başlıq ({locale})", { locale: locale.toUpperCase() })}
                required={locale === "az"}
                render={({ field, id, invalid, describedBy }) => (
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    id={id}
                    maxLength={120}
                    autoComplete="off"
                    aria-invalid={invalid}
                    aria-describedby={describedBy}
                  />
                )}
              />
            )}
          </LocaleTabs>
        </form>
        <DialogFooter>
          <Button variant="outline" type="button" disabled={isSubmitting} onClick={onClose}>
            {t("Ləğv et")}
          </Button>
          <Button type="submit" form="footer-column-form" disabled={isSubmitting}>
            {isSubmitting ? t("Yaradılır") : t("Yarat")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FooterOrderDialog({
  columns,
  onClose,
}: {
  columns: MenuSummaryDto[];
  onClose: () => void;
}) {
  const t = useT();
  const text = useContentText();
  const [reorder, { isLoading }] = useReorderMenusMutation();

  async function move(from: number, to: number) {
    if (to < 0 || to >= columns.length || from === to) return;
    try {
      await reorder({ orderedIds: arrayMove(columns, from, to).map((menu) => menu.id) }).unwrap();
      toast.success(t("Sütunların sırası saxlanıldı."));
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Sütunların sırası")}</DialogTitle>
          <DialogDescription>
            {t(
              "Altbilgidə sütunlar soldan sağa bu sırada göstərilir. Dəyişiklik dərhal saxlanılır.",
            )}
          </DialogDescription>
        </DialogHeader>
        <SortableList
          items={columns}
          getId={(menu) => menu.id}
          getLabel={(menu) => text(menu.title)}
          onReorder={(from, to) => void move(from, to)}
          className="border border-border"
          itemClassName="border-b border-border bg-white last:border-0"
        >
          {(menu, index, { handle }) => (
            <div className="flex min-h-14 items-center gap-1 py-1 pr-1">
              <DragHandle
                label={t("{name}: yerini dəyiş", { name: text(menu.title) })}
                {...handle}
              />
              <span className="min-w-0 flex-1 truncate text-meta">{text(menu.title)}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("{name}: sola", { name: text(menu.title) })}
                title={t("Sola")}
                disabled={index === 0 || isLoading}
                onClick={() => void move(index, index - 1)}
              >
                <ArrowUp strokeWidth={1.5} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("{name}: sağa", { name: text(menu.title) })}
                title={t("Sağa")}
                disabled={index === columns.length - 1 || isLoading}
                onClick={() => void move(index, index + 1)}
              >
                <ArrowDown strokeWidth={1.5} />
              </Button>
            </div>
          )}
        </SortableList>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t("Bağla")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
