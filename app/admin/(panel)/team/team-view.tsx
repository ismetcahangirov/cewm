"use client";

import { ArrowDown, ArrowUp, Ellipsis, Pencil, Plus, Trash2, UserRound } from "lucide-react";
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
  useDeleteTeamMemberMutation,
  useGetTeamMembersQuery,
  useReorderTeamMembersMutation,
  useToggleTeamMemberMutation,
} from "@/lib/api/team";
import { apiErrorMessage } from "@/lib/api/types";
import { useContentText } from "@/lib/store/hooks";
import { yearsSince, type TeamMemberDto } from "@/lib/validation/team";

import { MemberDialog } from "./member-dialog";

const gridClass = "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4";

function MemberCard({
  member,
  handle,
  isFirst,
  isLast,
  onEdit,
  onMove,
  onToggle,
  onDelete,
}: {
  member: TeamMemberDto;
  handle: ComponentProps<"button">;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onMove: (direction: -1 | 1) => void;
  onToggle: (isActive: boolean) => void;
  onDelete: () => void;
}) {
  const t = useT();
  const text = useContentText();
  return (
    <div className="flex w-full flex-col border border-border bg-white">
      <div className="flex items-center gap-1 border-b border-border p-1">
        <DragHandle label={t("{name}: yerini dəyiş", { name: member.name })} {...handle} />
        <span className="min-w-0 flex-1 truncate text-meta font-medium">{member.name}</span>
        <Switch
          checked={member.isActive}
          onCheckedChange={onToggle}
          aria-label={t("{name}: saytda göstər", { name: member.name })}
          title={member.isActive ? t("Saytda görünür") : t("Saytda gizlədilib")}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("{name}: əməliyyatlar", { name: member.name })}
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
        aria-label={t("{name}: redaktə et", { name: member.name })}
        className="relative aspect-square w-full bg-surface outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {member.photo ? (
          <MediaThumb media={member.photo} sizes="(min-width: 640px) 320px, 100vw" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <UserRound aria-hidden="true" strokeWidth={1.5} className="size-10" />
          </span>
        )}
      </button>
      <div className="flex min-h-11 flex-col gap-0.5 px-3 py-2 text-meta">
        <span className="truncate">{text(member.role)}</span>
        <span className="flex items-center gap-2 text-muted-foreground">
          <span className="min-w-0 flex-1 truncate">
            {member.startedYear === null
              ? t("İl göstərilməyib")
              : t("{year} · {count} il", {
                  year: member.startedYear,
                  count: yearsSince(member.startedYear),
                })}
          </span>
          {member.isActive ? null : <Badge variant="outline">{t("Gizli")}</Badge>}
        </span>
      </div>
    </div>
  );
}

export function TeamView() {
  const t = useT();
  const { data, isLoading, isError, refetch } = useGetTeamMembersQuery();
  const [reorder] = useReorderTeamMembersMutation();
  const [toggle] = useToggleTeamMemberMutation();
  const [remove] = useDeleteTeamMemberMutation();
  const [editing, setEditing] = useState<TeamMemberDto | "new" | null>(null);
  const [deleting, setDeleting] = useState<TeamMemberDto | null>(null);

  const members = useMemo(
    () => [...(data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [data],
  );

  async function move(from: number, to: number) {
    if (to < 0 || to >= members.length || from === to) return;
    const moved = members[from];
    const orderedIds = arrayMove(members, from, to).map((member) => member.id);
    try {
      await reorder({ orderedIds }).unwrap();
      if (moved) toast.success(t("«{name}» yerləşdirildi.", { name: moved.name }));
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  async function setActive(member: TeamMemberDto, isActive: boolean) {
    try {
      await toggle({ id: member.id, isActive }).unwrap();
      toast.success(
        isActive
          ? t("«{name}» saytda göstərilir.", { name: member.name })
          : t("«{name}» saytda gizlədildi.", { name: member.name }),
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
        title={t("Komanda")}
        description={t(
          "İşçilər «Haqqımızda» səhifəsində bu sırada göstərilir. Sürüşdürərək və ya kart menyusundan sıranı dəyişin.",
        )}
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus strokeWidth={1.5} />
            {t("Yeni işçi")}
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
          {t("Komanda yüklənmədi.")}
        </EmptyState>
      ) : isLoading ? (
        <div className={gridClass} aria-busy="true">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="aspect-square w-full" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <EmptyState action={<Button onClick={() => setEditing("new")}>{t("Yeni işçi")}</Button>}>
          {t("Komandaya hələ işçi əlavə olunmayıb.")}
        </EmptyState>
      ) : (
        <SortableList
          layout="grid"
          items={members}
          getId={(member) => member.id}
          getLabel={(member) => member.name}
          onReorder={(from, to) => void move(from, to)}
          className={gridClass}
          itemClassName="flex"
        >
          {(member, index, { handle }) => (
            <MemberCard
              member={member}
              handle={handle}
              isFirst={index === 0}
              isLast={index === members.length - 1}
              onEdit={() => setEditing(member)}
              onMove={(direction) => void move(index, index + direction)}
              onToggle={(isActive) => void setActive(member, isActive)}
              onDelete={() => setDeleting(member)}
            />
          )}
        </SortableList>
      )}
      {editing ? (
        <MemberDialog
          member={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={deleting ? t("«{name}» silinsin?", { name: deleting.name }) : ""}
        description={t("İşçi saytdan götürüləcək. Foto media kitabxanasında qalır.")}
        confirmLabel={t("Sil")}
        destructive
        onConfirm={confirmDelete}
      />
    </>
  );
}
