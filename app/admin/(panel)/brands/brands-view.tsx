"use client";

import { LocaleCompleteness } from "@/components/admin/locale-tabs";
import { filledLocales } from "@/lib/admin/form-values";
import { ArrowDown, ArrowUp, Ellipsis, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, type ComponentProps } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { MediaThumb } from "@/components/admin/image-picker";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { arrayMove, DragHandle, SortableList } from "@/components/admin/sortable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/lib/admin/i18n/use-t";
import {
  useDeleteBrandMutation,
  useGetBrandsQuery,
  useReorderBrandsMutation,
  useToggleBrandMutation,
} from "@/lib/api/brands";
import { apiErrorMessage } from "@/lib/api/types";
import type { BrandDto } from "@/lib/validation/brands";

import { BrandDialog } from "./brand-dialog";

function LogoCard({
  logo,
  handle,
  isFirst,
  isLast,
  onEdit,
  onMove,
  onToggle,
  onDelete,
}: {
  logo: BrandDto;
  handle: ComponentProps<"button">;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onMove: (direction: -1 | 1) => void;
  onToggle: (isActive: boolean) => void;
  onDelete: () => void;
}) {
  const t = useT();
  return (
    <div className="flex w-full flex-col border border-border bg-white">
      <div className="flex items-center gap-1 border-b border-border p-1">
        <DragHandle label={t("{name}: yerini dəyiş", { name: logo.name })} {...handle} />
        <span className="min-w-0 flex-1 truncate text-meta font-medium">{logo.name}</span>
        <Switch
          checked={logo.isActive}
          onCheckedChange={onToggle}
          aria-label={t("{name}: saytda göstər", { name: logo.name })}
          title={logo.isActive ? t("Saytda görünür") : t("Saytda gizlədilib")}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("{name}: əməliyyatlar", { name: logo.name })}
            >
              <Ellipsis strokeWidth={1.5} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48">
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil strokeWidth={1.5} />
              {t("Redaktə et")}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isFirst} onSelect={() => onMove(-1)}>
              <ArrowUp strokeWidth={1.5} />
              {t("Əvvələ")}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isLast} onSelect={() => onMove(1)}>
              <ArrowDown strokeWidth={1.5} />
              {t("Sona")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 strokeWidth={1.5} />
              {t("Sil")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <button
        type="button"
        onClick={onEdit}
        aria-label={t("{name}: redaktə et", { name: logo.name })}
        className="flex h-24 items-center justify-center bg-surface px-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="relative block h-16 w-full">
          {logo.logo ? <MediaThumb media={logo.logo} sizes="240px" /> : null}
        </span>
      </button>
      <div className="flex min-h-11 items-center gap-2 px-3 py-2 text-meta">
        <span className="min-w-0 flex-1 truncate text-muted-foreground">
          {t("{count} məhsul", { count: logo.productCount })}
        </span>
        <LocaleCompleteness filled={filledLocales(logo.description)} />
        {logo.isActive ? null : <Badge variant="outline">{t("Gizli")}</Badge>}
      </div>
    </div>
  );
}

export function BrandsView() {
  const t = useT();
  const { data, isLoading, isError, refetch } = useGetBrandsQuery();
  const [reorder] = useReorderBrandsMutation();
  const [toggle] = useToggleBrandMutation();
  const [remove] = useDeleteBrandMutation();
  const [editing, setEditing] = useState<BrandDto | "new" | null>(null);
  const [deleting, setDeleting] = useState<BrandDto | null>(null);

  const logos = useMemo(() => [...(data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder), [data]);

  async function move(from: number, to: number) {
    if (to < 0 || to >= logos.length || from === to) return;
    const moved = logos[from];
    const orderedIds = arrayMove(logos, from, to).map((logo) => logo.id);
    try {
      await reorder({ orderedIds }).unwrap();
      if (moved) toast.success(t("«{name}» yerləşdirildi.", { name: moved.name }));
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  async function setActive(logo: BrandDto, isActive: boolean) {
    try {
      await toggle({ id: logo.id, isActive }).unwrap();
      toast.success(
        isActive
          ? t("«{name}» saytda göstərilir.", { name: logo.name })
          : t("«{name}» saytda gizlədildi.", { name: logo.name }),
      );
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  async function confirmDelete(): Promise<boolean> {
    if (!deleting) return true;
    try {
      await remove(deleting.id).unwrap();
      toast.success(t("«{name}» silindi.", { name: deleting.name }));
      return true;
    } catch (error) {
      toast.error(apiErrorMessage(error));
      return false;
    }
  }

  return (
    <>
      <PageHeader
        title={t("Brendlər")}
        description={t(
          "Təmsil etdiyimiz brendlər saytda bu sırada göstərilir. Sürüşdürərək və ya kart menyusundan sıranı dəyişin.",
        )}
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus strokeWidth={1.5} />
            {t("Yeni brend")}
          </Button>
        }
      />
      {isError ? (
        <EmptyState
          action={
            <Button variant="outline" onClick={() => refetch()}>
              {t("Yenidən yüklə")}
            </Button>
          }
        >
          {t("Brendlər yüklənmədi.")}
        </EmptyState>
      ) : isLoading ? (
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
          aria-busy="true"
        >
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-44 w-full" />
          ))}
        </div>
      ) : logos.length === 0 ? (
        <EmptyState action={<Button onClick={() => setEditing("new")}>{t("Yeni brend")}</Button>}>
          {t("Hələ brend əlavə olunmayıb.")}
        </EmptyState>
      ) : (
        <SortableList
          layout="grid"
          items={logos}
          getId={(logo) => logo.id}
          getLabel={(logo) => logo.name}
          onReorder={(from, to) => void move(from, to)}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
          itemClassName="flex"
        >
          {(logo, index, { handle }) => (
            <LogoCard
              logo={logo}
              handle={handle}
              isFirst={index === 0}
              isLast={index === logos.length - 1}
              onEdit={() => setEditing(logo)}
              onMove={(direction) => void move(index, index + direction)}
              onToggle={(isActive) => void setActive(logo, isActive)}
              onDelete={() => setDeleting(logo)}
            />
          )}
        </SortableList>
      )}
      {editing ? (
        <BrandDialog brand={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      ) : null}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={deleting ? t("«{name}» silinsin?", { name: deleting.name }) : ""}
        description={t(
          "Brend silinəcək, onun məhsulları brendsiz qalacaq. Loqo media kitabxanasında qalır.",
        )}
        confirmLabel={t("Sil")}
        destructive
        onConfirm={confirmDelete}
      />
    </>
  );
}
