"use client";

import { ArrowLeftRight, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { FormActions, FormAlert, FormSection } from "@/components/admin/form";
import { LocaleTabs } from "@/components/admin/locale-tabs";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { useUnsavedChangesGuard } from "@/components/admin/unsaved-changes";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useT, type Translate } from "@/lib/admin/i18n/use-t";
import {
  appendItem,
  countItems,
  flattenItems,
  fromDto,
  indentItem,
  itemAtPath,
  moveSibling,
  outdentItem,
  removeItem,
  replaceItem,
  toInput,
  type EditorItem,
} from "@/lib/admin/menu-tree";
import {
  useDeleteMenuMutation,
  useGetMenuQuery,
  useGetMenuTargetsQuery,
  useSaveMenuMutation,
} from "@/lib/api/menus";
import { isApiError } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/config";
import type { Localized } from "@/lib/i18n/localized";
import { cn } from "@/lib/utils";
import { useContentText } from "@/lib/store/hooks";
import {
  isFooterMenu,
  mainMenuKey,
  menuMaxDepth,
  menuMaxItems,
  saveMenuSchema,
  type MenuDetailDto,
  type MenuItemFields,
  type MenuSummaryDto,
  type MenuTargetsDto,
} from "@/lib/validation/menus";

import { FooterOrderDialog, NewFooterColumnDialog } from "./footer-column-dialogs";
import { MenuItemDialog } from "./menu-item-dialog";
import { MenuTreeList } from "./menu-tree-list";

type TitleState = Record<Locale, string>;

type Editing = { mode: "edit"; key: string } | { mode: "add"; parentKey: string | null };

function titleState(title: Localized): TitleState {
  return { az: title.az, ru: title.ru ?? "", en: title.en ?? "" };
}

function titleValue(title: TitleState): Localized {
  return { az: title.az.trim(), ru: title.ru.trim() || null, en: title.en.trim() || null };
}

function snapshot(title: TitleState, items: EditorItem[]): string {
  return JSON.stringify({ title: titleValue(title), items: toInput(items) });
}

function menuLabel(menu: MenuSummaryDto, text: (value: Localized) => string, t: Translate): string {
  return isFooterMenu(menu.key)
    ? t("Altbilgi: {name}", { name: text(menu.title) })
    : text(menu.title);
}

function MenuSwitcher({ menus, currentId }: { menus: MenuSummaryDto[]; currentId: string }) {
  const t = useT();
  const text = useContentText();
  return (
    <nav aria-label={t("Menyular")} className="mb-6">
      <ul className="flex w-fit max-w-full flex-wrap gap-1 rounded-sm bg-secondary p-0.5">
        {menus.map((menu) => {
          const current = menu.id === currentId;
          return (
            <li key={menu.id} className="min-w-0">
              <Link
                href={`/admin/menus?menu=${menu.id}`}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-sm px-3 text-meta font-medium text-graphite hover:text-foreground md:min-h-9",
                  current ? "bg-background text-foreground" : null,
                )}
              >
                <span className="truncate">{menuLabel(menu, text, t)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function EditorForm({
  detail,
  targets,
  menus,
}: {
  detail: MenuDetailDto;
  targets: MenuTargetsDto | undefined;
  menus: MenuSummaryDto[];
}) {
  const t = useT();
  const text = useContentText();
  const router = useRouter();
  const isFooter = isFooterMenu(detail.key);
  const maxDepth = menuMaxDepth(detail.key) - 1;
  const [items, setItems] = useState<EditorItem[]>(() => fromDto(detail.items));
  const [title, setTitle] = useState<TitleState>(() => titleState(detail.title));
  const [saved, setSaved] = useState(() =>
    snapshot(titleState(detail.title), fromDto(detail.items)),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [titleError, setTitleError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [deletingMenu, setDeletingMenu] = useState(false);
  const [creatingColumn, setCreatingColumn] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const counter = useRef(0);
  const [saveMenu, { isLoading: saving }] = useSaveMenuMutation();
  const [deleteMenu] = useDeleteMenuMutation();

  const dirty = snapshot(title, items) !== saved;
  const guard = useUnsavedChangesGuard(dirty && !saving);
  const footerColumns = menus.filter((menu) => isFooterMenu(menu.key));
  const flat = flattenItems(items);
  const editingItem =
    editing?.mode === "edit" ? flat.find((entry) => entry.key === editing.key)?.item : undefined;
  const deletingItem = deletingKey ? flat.find((entry) => entry.key === deletingKey) : undefined;

  function change(next: EditorItem[]) {
    setItems(next);
    setFormError(null);
  }

  function clearError(key: string) {
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function applyFieldErrors(fields: Record<string, string>) {
    const next: Record<string, string> = {};
    let nextTitleError: string | null = null;
    for (const [path, message] of Object.entries(fields)) {
      if (path.startsWith("title")) {
        nextTitleError = message;
        continue;
      }
      const found = itemAtPath(items, path);
      if (found && !next[found.key]) next[found.key] = message;
    }
    setErrors(next);
    setTitleError(nextTitleError);
  }

  function addItem(fields: MenuItemFields, parentKey: string | null) {
    if (countItems(items) >= menuMaxItems) {
      toast.error(t("Menyuda ən çox {max} element ola bilər.", { max: menuMaxItems }));
      return;
    }
    counter.current += 1;
    const item: EditorItem = { ...fields, key: `new-${counter.current}`, id: null, children: [] };
    change(appendItem(items, parentKey, item));
  }

  function discard() {
    setItems(fromDto(detail.items));
    setTitle(titleState(detail.title));
    setErrors({});
    setTitleError(null);
    setFormError(null);
  }

  async function save() {
    setFormError(null);
    const payload = { title: titleValue(title), items: toInput(items) };
    const parsed = saveMenuSchema.safeParse(payload);
    if (!parsed.success) {
      applyFieldErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [issue.path.join("."), issue.message]),
        ),
      );
      setFormError(t("Menyuda səhvlər var. Qeyd olunan yerləri düzəldin."));
      return;
    }
    try {
      const result = await saveMenu({ id: detail.id, ...payload }).unwrap();
      const nextItems = fromDto(result.items);
      const nextTitle = titleState(result.title);
      setItems(nextItems);
      setTitle(nextTitle);
      setSaved(snapshot(nextTitle, nextItems));
      setErrors({});
      setTitleError(null);
      toast.success(t("Menyu saxlanıldı, saytda yeniləndi."));
    } catch (caught) {
      if (!isApiError(caught)) {
        setFormError(t("Xəta baş verdi. Yenidən cəhd edin."));
        return;
      }
      applyFieldErrors(caught.data.fields ?? {});
      setFormError(t.message(caught.data.message));
    }
  }

  async function confirmDeleteMenu(): Promise<boolean> {
    try {
      await deleteMenu(detail.id).unwrap();
      guard.release();
      toast.success(t("«{name}» sütunu silindi.", { name: text(detail.title) }));
      router.replace("/admin/menus");
      return true;
    } catch (caught) {
      toast.error(
        isApiError(caught)
          ? t.message(caught.data.message)
          : t("Xəta baş verdi. Yenidən cəhd edin."),
      );
      return false;
    }
  }

  const saveButton = (
    <Button type="button" disabled={!dirty || saving} onClick={() => void save()}>
      {saving ? t("Saxlanılır") : t("Saxla")}
    </Button>
  );

  const discardButton = dirty ? (
    <Button type="button" variant="ghost" disabled={saving} onClick={discard}>
      {t("Ləğv et")}
    </Button>
  ) : null;

  const blockedHint = dirty ? t("Əvvəlcə dəyişiklikləri saxlayın.") : undefined;

  return (
    <>
      <PageHeader
        title={t("Menyular")}
        description={t("Yuxarı menyu (mobil menyu da) və altbilgi sütunları.")}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={dirty}
              title={blockedHint}
              onClick={() => setCreatingColumn(true)}
            >
              <Plus strokeWidth={1.5} />
              {t("Yeni sütun")}
            </Button>
            {footerColumns.length > 1 ? (
              <Button
                type="button"
                variant="outline"
                disabled={dirty}
                title={blockedHint}
                onClick={() => setOrdering(true)}
              >
                <ArrowLeftRight strokeWidth={1.5} />
                {t("Sütunların sırası")}
              </Button>
            ) : null}
            <span className="flex gap-2 max-md:hidden">
              {discardButton}
              {saveButton}
            </span>
          </>
        }
      />
      <MenuSwitcher menus={menus} currentId={detail.id} />
      <div className="flex flex-col gap-6">
        <FormAlert message={formError} />
        {isFooter ? (
          <FormSection title={t("Sütunun başlığı")}>
            <LocaleTabs
              invalid={{ az: Boolean(titleError) }}
              filled={{ ru: Boolean(title.ru), en: Boolean(title.en) }}
            >
              {(locale) => (
                <Field data-invalid={locale === "az" && Boolean(titleError)}>
                  <FieldLabel htmlFor={`menu-title-${locale}`} className="text-meta font-medium">
                    {t("Başlıq ({locale})", { locale: locale.toUpperCase() })}
                    {locale === "az" ? (
                      <span aria-hidden="true" className="text-destructive">
                        *
                      </span>
                    ) : null}
                  </FieldLabel>
                  <Input
                    id={`menu-title-${locale}`}
                    value={title[locale]}
                    maxLength={120}
                    autoComplete="off"
                    aria-invalid={locale === "az" && Boolean(titleError)}
                    aria-describedby={
                      locale === "az" && titleError ? "menu-title-error" : undefined
                    }
                    onChange={(event) => {
                      const value = event.target.value;
                      setTitle((current) => ({ ...current, [locale]: value }));
                      if (locale === "az") setTitleError(null);
                    }}
                  />
                  {locale === "az" && titleError ? (
                    <FieldError
                      id="menu-title-error"
                      errors={[{ message: t.message(titleError) }]}
                      className="text-meta"
                    />
                  ) : null}
                </Field>
              )}
            </LocaleTabs>
          </FormSection>
        ) : null}
        <FormSection title={t("Elementlər")}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="max-w-2xl text-meta text-muted-foreground">
              {detail.key === mainMenuKey
                ? t(
                    "Saytın yuxarı menyusu və mobil menyu. Ən çox 3 səviyyə: sürüşdürərək sıranı dəyişin, sağa çəkərək alt element edin. Telefonda sətir menyusundan istifadə edin.",
                  )
                : t(
                    "Altbilgi sütununda keçidlər bir səviyyəlidir. Sürüşdürərək və ya sətir menyusundan sıranı dəyişin.",
                  )}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditing({ mode: "add", parentKey: null })}
            >
              <Plus strokeWidth={1.5} />
              {t("Element əlavə et")}
            </Button>
          </div>
          {items.length ? (
            <MenuTreeList
              items={items}
              maxDepth={maxDepth}
              targets={targets}
              errors={errors}
              onChange={change}
              actions={{
                onEdit: (key) => setEditing({ mode: "edit", key }),
                onAddChild: (key) => setEditing({ mode: "add", parentKey: key }),
                onMove: (key, direction) => change(moveSibling(items, key, direction)),
                onIndent: (key) => change(indentItem(items, key)),
                onOutdent: (key) => change(outdentItem(items, key)),
                onDelete: (key) => setDeletingKey(key),
              }}
            />
          ) : (
            <EmptyState>{t("Bu menyuda hələ element yoxdur.")}</EmptyState>
          )}
        </FormSection>
        {isFooter ? (
          <div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setDeletingMenu(true)}
            >
              <Trash2 strokeWidth={1.5} />
              {t("Sütunu sil")}
            </Button>
          </div>
        ) : null}
        <FormActions className="md:hidden">
          {discardButton}
          {saveButton}
        </FormActions>
      </div>
      {editing && targets ? (
        <MenuItemDialog
          item={editingItem ?? null}
          targets={targets}
          allowHeading={!isFooter}
          title={
            editing.mode === "edit"
              ? t("Elementi redaktə et")
              : editing.parentKey
                ? t("Alt element əlavə et")
                : t("Element əlavə et")
          }
          onClose={() => setEditing(null)}
          onSave={(fields) => {
            if (editing.mode === "edit") {
              change(replaceItem(items, editing.key, fields));
              clearError(editing.key);
            } else {
              addItem(fields, editing.parentKey);
            }
          }}
        />
      ) : null}
      <ConfirmDialog
        open={deletingItem !== undefined}
        onOpenChange={(open) => {
          if (!open) setDeletingKey(null);
        }}
        title={deletingItem ? t("«{name}» silinsin?", { name: text(deletingItem.item.label) }) : ""}
        description={
          deletingItem
            ? `${
                deletingItem.item.children.length
                  ? `${t("Alt elementləri ilə birlikdə ({count}) silinəcək.", {
                      count: countItems(deletingItem.item.children),
                    })} `
                  : ""
              }${t("Dəyişiklik «Saxla» basılanda saytda tətbiq olunur.")}`
            : undefined
        }
        confirmLabel={t("Sil")}
        destructive
        onConfirm={() => {
          if (deletingKey) {
            change(removeItem(items, deletingKey));
            clearError(deletingKey);
          }
        }}
      />
      <ConfirmDialog
        open={deletingMenu}
        onOpenChange={setDeletingMenu}
        title={t("«{name}» sütunu silinsin?", { name: text(detail.title) })}
        description={t("Sütun və içindəki bütün keçidlər saytın altbilgisindən götürüləcək.")}
        confirmLabel={t("Sütunu sil")}
        destructive
        onConfirm={confirmDeleteMenu}
      />
      {creatingColumn ? <NewFooterColumnDialog onClose={() => setCreatingColumn(false)} /> : null}
      {ordering ? (
        <FooterOrderDialog columns={footerColumns} onClose={() => setOrdering(false)} />
      ) : null}
      {guard.dialog}
    </>
  );
}

export function MenuEditor({ menu, menus }: { menu: MenuSummaryDto; menus: MenuSummaryDto[] }) {
  const t = useT();
  const detail = useGetMenuQuery(menu.id, { refetchOnMountOrArgChange: true });
  const targets = useGetMenuTargetsQuery();

  if (detail.isLoading) {
    return (
      <>
        <PageHeader title={t("Menyular")} />
        <MenuSwitcher menus={menus} currentId={menu.id} />
        <div className="flex flex-col gap-px border border-border" aria-busy="true">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      </>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <>
        <PageHeader title={t("Menyular")} />
        <MenuSwitcher menus={menus} currentId={menu.id} />
        <EmptyState
          action={
            <Button variant="outline" onClick={() => detail.refetch()}>
              {t("Yenidən yüklə")}
            </Button>
          }
        >
          {t("Menyu yüklənmədi.")}
        </EmptyState>
      </>
    );
  }

  return (
    <>
      {targets.isError ? (
        <FormAlert message={t("Kateqoriya və səhifə siyahısı yüklənmədi. Səhifəni yeniləyin.")} />
      ) : null}
      <EditorForm
        key={detail.data.updatedAt}
        detail={detail.data}
        targets={targets.data}
        menus={menus}
      />
    </>
  );
}
