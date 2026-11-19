import {
  Armchair,
  BriefcaseBusiness,
  Building2,
  FileText,
  FolderTree,
  Handshake,
  Images,
  Inbox,
  LayoutDashboard,
  Menu,
  Newspaper,
  PanelsTopLeft,
  Route,
  Settings,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import type { MessageKey } from "@/lib/admin/i18n";

export type AdminNavItem = {
  title: MessageKey;
  href: string;
  icon: LucideIcon;
  ownerOnly?: boolean;
  counter?: "unreadRequests";
  ready?: boolean;
};

export type AdminNavGroup = {
  label?: MessageKey;
  items: AdminNavItem[];
};

export const adminNavigation: AdminNavGroup[] = [
  {
    items: [{ title: "İdarə paneli", href: "/admin", icon: LayoutDashboard, ready: true }],
  },
  {
    label: "Kataloq",
    items: [
      { title: "Məhsullar", href: "/admin/products", icon: Armchair, ready: true },
      { title: "Kateqoriyalar", href: "/admin/categories", icon: FolderTree, ready: true },
    ],
  },
  {
    label: "Məzmun#nav",
    items: [
      { title: "Layihələr", href: "/admin/projects", icon: Building2, ready: true },
      { title: "Səhifələr", href: "/admin/pages", icon: FileText, ready: true },
      { title: "Bloq", href: "/admin/blog", icon: Newspaper, ready: true },
      {
        title: "Vakansiyalar",
        href: "/admin/vacancies",
        icon: BriefcaseBusiness,
        ready: true,
      },
      { title: "Partnyorlar", href: "/admin/logos", icon: Handshake, ready: true },
      { title: "Komanda", href: "/admin/team", icon: UsersRound, ready: true },
      { title: "Media", href: "/admin/media", icon: Images, ready: true },
    ],
  },
  {
    label: "Satış",
    items: [
      {
        title: "Müraciətlər",
        href: "/admin/requests",
        icon: Inbox,
        counter: "unreadRequests",
        ready: true,
      },
    ],
  },
  {
    label: "Sayt",
    items: [
      {
        title: "Ana səhifə bölmələri",
        href: "/admin/home-sections",
        icon: PanelsTopLeft,
        ready: true,
      },
      { title: "Menyular", href: "/admin/menus", icon: Menu, ready: true },
      { title: "Yönləndirmələr", href: "/admin/redirects", icon: Route, ready: true },
      { title: "SEO və tənzimləmələr", href: "/admin/settings", icon: Settings, ready: true },
    ],
  },
  {
    label: "Sistem",
    items: [
      { title: "İstifadəçilər", href: "/admin/users", icon: Users, ownerOnly: true, ready: true },
    ],
  },
];

export const adminNavItems: AdminNavItem[] = adminNavigation.flatMap((group) => group.items);

export function findNavItem(pathname: string): { item: AdminNavItem; group?: MessageKey } | null {
  let best: { item: AdminNavItem; group?: MessageKey } | null = null;
  for (const group of adminNavigation) {
    for (const item of group.items) {
      const matches =
        item.href === "/admin"
          ? pathname === "/admin"
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
      if (matches && (!best || item.href.length > best.item.href.length)) {
        best = { item, group: group.label };
      }
    }
  }
  return best;
}
