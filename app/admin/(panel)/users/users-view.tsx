"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Ellipsis, Mail, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import {
  DataTable,
  useListState,
  type DataTableColumn,
  type DataTableFeatures,
} from "@/components/admin/data-table";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { UserAvatar } from "@/components/admin/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateTime } from "@/lib/admin/format";
import { useT, type Translate } from "@/lib/admin/i18n/use-t";
import { useGetUsersQuery, useResendInviteMutation, useUpdateUserMutation } from "@/lib/api/admin";
import { apiErrorMessage, type Page } from "@/lib/api/types";
import { roleLabels, type UserRole } from "@/lib/auth/roles";
import type { UserDto, UserSortField } from "@/lib/validation/users";

import { InviteUserDialog } from "./invite-user-dialog";

const column = createColumnHelper<DataTableFeatures, UserDto>();

const emptyPage: Page<UserDto> = { rows: [], rowCount: 0 };

type PendingAction =
  | { kind: "role"; user: UserDto; role: UserRole }
  | { kind: "active"; user: UserDto; active: boolean };

function UserStatus({ user }: { user: UserDto }) {
  const t = useT();
  if (!user.active) return <Badge variant="outline">{t("Deaktiv")}</Badge>;
  if (user.invitePending) return <Badge variant="chip">{t("Dəvət gözləyir")}</Badge>;
  return <Badge variant="accent">{t("Aktiv")}</Badge>;
}

function actionCopy(action: PendingAction, t: Translate) {
  const name = action.user.name;
  if (action.kind === "role") {
    return {
      title:
        action.role === "owner"
          ? t("«{name}» üçün rol sahib olsun?", { name })
          : t("«{name}» üçün rol redaktor olsun?", { name }),
      description:
        action.role === "owner"
          ? t("Sahib bütün bölmələri və istifadəçiləri idarə edə bilir.")
          : t("Redaktor istifadəçiləri görmür və onları idarə edə bilmir."),
      confirm: t("Rolu dəyiş"),
      destructive: false,
    };
  }
  return action.active
    ? {
        title: t("«{name}» yenidən aktiv edilsin?", { name }),
        description: t("İstifadəçi öz şifrəsi ilə yenidən daxil ola biləcək."),
        confirm: t("Aktiv et"),
        destructive: false,
      }
    : {
        title: t("«{name}» deaktiv edilsin?", { name }),
        description: t("Bütün açıq sessiyaları bağlanacaq və daxil ola bilməyəcək."),
        confirm: t("Deaktiv et"),
        destructive: true,
      };
}

export function UsersView({ currentUserId }: { currentUserId: string }) {
  const t = useT();
  const list = useListState<UserSortField>({ sort: "name" });
  const { data = emptyPage, isLoading, isFetching, isError, refetch } = useGetUsersQuery(list.args);
  const [updateUser] = useUpdateUserMutation();
  const [resendInvite] = useResendInviteMutation();
  const [pending, setPending] = useState<PendingAction | null>(null);

  const columns = useMemo<DataTableColumn<UserDto>[]>(
    () =>
      column.columns([
        column.accessor("name", {
          header: t("Ad"),
          meta: { label: t("Ad"), mobile: "title" },
          enableHiding: false,
          cell: ({ row }) => (
            <span className="flex min-w-0 items-center gap-3">
              <UserAvatar name={row.original.name} />
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {row.original.name}
                  {row.original.id === currentUserId ? (
                    <span className="font-normal text-muted-foreground"> {t("(siz)")}</span>
                  ) : null}
                </span>
                <span className="block truncate text-muted-foreground md:hidden">
                  {row.original.email}
                </span>
              </span>
            </span>
          ),
        }),
        column.accessor("email", {
          header: t("E-poçt"),
          meta: { label: t("E-poçt"), mobile: "hidden" },
        }),
        column.accessor("role", {
          header: t("Rol"),
          meta: { label: t("Rol"), mobile: "detail" },
          cell: ({ row }) => t(roleLabels[row.original.role]),
        }),
        column.display({
          id: "status",
          header: t("Status"),
          meta: { label: t("Status"), mobile: "detail" },
          cell: ({ row }) => <UserStatus user={row.original} />,
        }),
        column.accessor("lastSignInAt", {
          header: t("Son giriş"),
          meta: { label: t("Son giriş"), mobile: "detail", className: "whitespace-nowrap" },
          cell: ({ getValue }) => formatDateTime(getValue<string | null>(), t.locale),
        }),
        column.accessor("createdAt", {
          header: t("Əlavə olunub"),
          meta: { label: t("Əlavə olunub"), mobile: "hidden", className: "whitespace-nowrap" },
          cell: ({ getValue }) => formatDateTime(getValue<string | null>(), t.locale),
        }),
      ]),
    [currentUserId, t],
  );

  async function runPending(action: PendingAction): Promise<boolean> {
    try {
      if (action.kind === "role") {
        await updateUser({ id: action.user.id, role: action.role }).unwrap();
        toast.success(t("{name}: rol dəyişdi.", { name: action.user.name }));
      } else {
        await updateUser({ id: action.user.id, active: action.active }).unwrap();
        toast.success(
          action.active
            ? t("{name} aktiv edildi.", { name: action.user.name })
            : t("{name} deaktiv edildi.", { name: action.user.name }),
        );
      }
      return true;
    } catch (error) {
      toast.error(apiErrorMessage(error));
      return false;
    }
  }

  async function resend(user: UserDto) {
    try {
      await resendInvite(user.id).unwrap();
      toast.success(t("Dəvət yenidən göndərildi: {email}", { email: user.email }));
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  function rowActions(user: UserDto) {
    if (user.id === currentUserId) return null;
    const otherRole: UserRole = user.role === "owner" ? "editor" : "owner";
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("{name}: əməliyyatlar", { name: user.name })}
          >
            <Ellipsis strokeWidth={1.5} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuLabel className="truncate text-muted-foreground">
            {user.email}
          </DropdownMenuLabel>
          <DropdownMenuItem
            disabled={!user.active}
            onSelect={() => setPending({ kind: "role", user, role: otherRole })}
          >
            <ShieldCheck strokeWidth={1.5} />
            {otherRole === "owner" ? t("Sahib et") : t("Redaktor et")}
          </DropdownMenuItem>
          {user.invitePending && user.active ? (
            <DropdownMenuItem onSelect={() => resend(user)}>
              <Mail strokeWidth={1.5} />
              {t("Dəvəti yenidən göndər")}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          {user.active ? (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setPending({ kind: "active", user, active: false })}
            >
              <UserX strokeWidth={1.5} />
              {t("Deaktiv et")}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => setPending({ kind: "active", user, active: true })}>
              <UserCheck strokeWidth={1.5} />
              {t("Aktiv et")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const copy = pending ? actionCopy(pending, t) : null;

  return (
    <>
      <PageHeader
        title={t("İstifadəçilər")}
        description={t("İdarə panelinə kimin daxil ola biləcəyini burada idarə edin.")}
        actions={<InviteUserDialog />}
      />
      {isError ? (
        <EmptyState
          action={
            <Button variant="outline" onClick={() => refetch()}>
              {t("Yenidən yüklə")}
            </Button>
          }
        >
          {t("İstifadəçilər yüklənmədi.")}
        </EmptyState>
      ) : (
        <DataTable
          columns={columns}
          rows={data.rows}
          rowCount={data.rowCount}
          getRowId={(user) => user.id}
          list={list}
          loading={isLoading}
          fetching={isFetching}
          searchPlaceholder={t("Ad və ya e-poçt ilə axtar")}
          rowActions={rowActions}
          empty={
            <EmptyState>
              {list.args.search
                ? t("Axtarışa uyğun istifadəçi tapılmadı.")
                : t("Hələ istifadəçi yoxdur.")}
            </EmptyState>
          }
        />
      )}
      {pending && copy ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setPending(null);
          }}
          title={copy.title}
          description={copy.description}
          confirmLabel={copy.confirm}
          destructive={copy.destructive}
          onConfirm={() => runPending(pending)}
        />
      ) : null}
    </>
  );
}
