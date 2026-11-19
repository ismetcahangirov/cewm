"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { adminNavigation, findNavItem, type AdminNavItem } from "@/lib/admin/navigation";
import { useGetUnreadRequestCountQuery } from "@/lib/api/admin";
import type { AdminUser } from "@/lib/auth/session";
import { useT } from "@/lib/admin/i18n/use-t";

import { AdminBrand } from "./brand";
import { NavUser } from "./nav-user";

function UnreadBadge() {
  const t = useT();
  const { data } = useGetUnreadRequestCountQuery(undefined, { pollingInterval: 60_000 });
  if (!data?.count) return null;
  return (
    <SidebarMenuBadge aria-label={t("{count} oxunmamış müraciət", { count: data.count })}>
      {data.count > 99 ? "99+" : data.count}
    </SidebarMenuBadge>
  );
}

function NavLink({ item, active }: { item: AdminNavItem; active: boolean }) {
  const { isMobile, setOpenMobile } = useSidebar();
  const t = useT();
  const Icon = item.icon;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={t(item.title)}>
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          onClick={() => {
            if (isMobile) setOpenMobile(false);
          }}
        >
          <Icon strokeWidth={1.5} />
          <span>{t(item.title)}</span>
        </Link>
      </SidebarMenuButton>
      {item.counter === "unreadRequests" ? <UnreadBadge /> : null}
    </SidebarMenuItem>
  );
}

export function AppSidebar({
  user,
  ...props
}: ComponentProps<typeof Sidebar> & { user: AdminUser }) {
  const pathname = usePathname();
  const t = useT();
  const activeHref = findNavItem(pathname)?.item.href;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip={t("İdarə paneli")}>
              <Link href="/admin" aria-label={t("CEWM idarə paneli")}>
                <AdminBrand />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {adminNavigation.map((group, index) => {
          const items = group.items.filter((item) => !item.ownerOnly || user.role === "owner");
          if (!items.length) return null;
          return (
            <SidebarGroup key={group.label ?? index}>
              {group.label ? <SidebarGroupLabel>{t(group.label)}</SidebarGroupLabel> : null}
              <SidebarMenu>
                {items.map((item) => (
                  <NavLink key={item.href} item={item} active={item.href === activeHref} />
                ))}
              </SidebarMenu>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
