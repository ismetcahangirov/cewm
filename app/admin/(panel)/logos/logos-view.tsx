"use client";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/lib/admin/i18n/use-t";
import {
  useDeleteLogoMutation,
  useGetLogosQuery,
  useReorderLogosMutation,
  useToggleLogoMutation,
} from "@/lib/api/logos";
import { apiErrorMessage } from "@/lib/api/types";
import { logoGroupLabels, logoGroups, type LogoDto, type LogoGroup } from "@/lib/validation/logos";

import { LogoDialog } from "./logo-dialog";

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
  logo: LogoDto;
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
          {logo.image ? <MediaThumb media={logo.image} sizes="240px" /> : null}
        </span>
      </button>
      <div className="flex min-h-11 items-center gap-2 px-3 py-2 text-meta">
        {logo.url ? (
          <a
            href={logo.url}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 flex-1 truncate text-muted-foreground hover:underline"
          >
            {logo.url.replace(/^https?:\/\//, "")}
          </a>
        ) : (
          <span className="min-w-0 flex-1 truncate text-muted-foreground">{t("Keçid yoxdur")}</span>
        )}
        {logo.isActive ? null : <Badge variant="outline">{t("Gizli")}</Badge>}
      </div>
    </div>
  );
}

export function LogosView() {
  const t = useT();
  const { data, isLoading, isError, refetch } = useGetLogosQuery();
  const [reorder] = useReorderLogosMutation();
  const [toggle] = useToggleLogoMutation();
  const [remove] = useDeleteLogoMutation();
  const [chosen, setChosen] = useState<LogoGroup | null>(null);
  const [editing, setEditing] = useState<LogoDto | "new" | null>(null);
  const [deleting, setDeleting] = useState<LogoDto | null>(null);

  const byGroup = useMemo(() => {
    const groups: Record<LogoGroup, LogoDto[]> = { references: [], partners: [] };
    for (const logo of data ?? []) groups[logo.group].push(logo);
    for (const key of logoGroups) groups[key].sort((a, b) => a.sortOrder - b.sortOrder);
    return groups;
  }, [data]);

  const group: LogoGroup =
    chosen ??
    (data && !byGroup.references.length && byGroup.partners.length ? "partners" : "references");

  async function move(logos: LogoDto[], from: number, to: number) {
    if (to < 0 || to >= logos.length || from === to) return;
    const moved = logos[from];
    const orderedIds = arrayMove(logos, from, to).map((logo) => logo.id);
    try {
      await reorder({ group, orderedIds }).unwrap();
      if (moved) toast.success(t("«{name}» yerləşdirildi.", { name: moved.name }));
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  async function setActive(logo: LogoDto, isActive: boolean) {
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
        title={t("Partnyorlar")}
        description={t(
          "Referans və partnyor loqoları saytda bu sırada göstərilir. Sürüşdürərək və ya kart menyusundan sıranı dəyişin.",
        )}
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus strokeWidth={1.5} />
            {t("Yeni loqo")}
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
          {t("Loqolar yüklənmədi.")}
        </EmptyState>
      ) : (
        <Tabs value={group} onValueChange={(value) => setChosen(value as LogoGroup)}>
          <TabsList aria-label={t("Loqo bölməsi")}>
            {logoGroups.map((value) => (
              <TabsTrigger key={value} value={value}>
                {t.message(logoGroupLabels[value])}
                <span className="text-muted-foreground tabular-nums">
                  {isLoading ? "" : byGroup[value].length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          {logoGroups.map((value) => (
            <TabsContent key={value} value={value} className="mt-4">
              {isLoading ? (
                <div
                  className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
                  aria-busy="true"
                >
                  {Array.from({ length: 4 }, (_, index) => (
                    <Skeleton key={index} className="h-44 w-full" />
                  ))}
                </div>
              ) : byGroup[value].length === 0 ? (
                <EmptyState
                  action={<Button onClick={() => setEditing("new")}>{t("Yeni loqo")}</Button>}
                >
                  {t("«{name}» bölməsində hələ loqo yoxdur.", {
                    name: t.message(logoGroupLabels[value]),
                  })}
                </EmptyState>
              ) : (
                <SortableList
                  layout="grid"
                  items={byGroup[value]}
                  getId={(logo) => logo.id}
                  getLabel={(logo) => logo.name}
                  onReorder={(from, to) => void move(byGroup[value], from, to)}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
                  itemClassName="flex"
                >
                  {(logo, index, { handle }) => (
                    <LogoCard
                      logo={logo}
                      handle={handle}
                      isFirst={index === 0}
                      isLast={index === byGroup[value].length - 1}
                      onEdit={() => setEditing(logo)}
                      onMove={(direction) => void move(byGroup[value], index, index + direction)}
                      onToggle={(isActive) => void setActive(logo, isActive)}
                      onDelete={() => setDeleting(logo)}
                    />
                  )}
                </SortableList>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
      {editing ? (
        <LogoDialog
          logo={editing === "new" ? null : editing}
          group={group}
          onClose={() => setEditing(null)}
        />
      ) : null}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={deleting ? t("«{name}» silinsin?", { name: deleting.name }) : ""}
        description={t("Loqo saytdan götürüləcək. Şəkil media kitabxanasında qalır.")}
        confirmLabel={t("Sil")}
        destructive
        onConfirm={confirmDelete}
      />
    </>
  );
}
