"use client";

import { ChevronsUpDown, ExternalLink, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth/client";
import { roleLabels } from "@/lib/auth/roles";
import type { AdminUser } from "@/lib/auth/session";
import { useT } from "@/lib/admin/i18n/use-t";

import { UserAvatar } from "./user-avatar";

function Identity({ user }: { user: AdminUser }) {
  const t = useT();
  return (
    <>
      <UserAvatar name={user.name} />
      <span className="grid flex-1 text-left leading-tight">
        <span className="truncate text-meta font-medium">{user.name}</span>
        <span className="truncate text-meta">{t(roleLabels[user.role])}</span>
      </span>
    </>
  );
}

export function NavUser({ user }: { user: AdminUser }) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const t = useT();

  async function signOut() {
    setPending(true);
    const { error } = await authClient.signOut();
    if (error) {
      setPending(false);
      toast.error(t("Çıxış alınmadı. Yenidən cəhd edin."));
      return;
    }
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip={user.name}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Identity user={user} />
              <ChevronsUpDown className="ml-auto" strokeWidth={1.5} />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="font-normal">
              <span className="block truncate text-meta font-medium">{user.name}</span>
              <span className="block truncate text-meta text-muted-foreground">{user.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/" target="_blank" rel="noreferrer">
                <ExternalLink strokeWidth={1.5} />
                {t("Sayta bax")}
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem disabled={pending} onSelect={signOut}>
              <LogOut strokeWidth={1.5} />
              {t("Çıxış")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
