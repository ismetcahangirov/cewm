import {
  BadgeCheck,
  Clapperboard,
  Cog,
  Contact,
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
  Type,
  Users,
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
      { title: "Məhsullar", href: "/admin/products", icon: Cog, ready: true },
      { title: "Kateqoriyalar", href: "/admin/categories", icon: FolderTree, ready: true },
      { title: "Brendlər", href: "/admin/brands", icon: BadgeCheck, ready: true },
    ],
  },
  {
    label: "Məzmun#nav",
    items: [
      { title: "Səhifələr", href: "/admin/pages", icon: FileText, ready: true },
      { title: "Bloq", href: "/admin/blog", icon: Newspaper, ready: true },
      { title: "Müştərilər", href: "/admin/clients", icon: Handshake, ready: true },
      { title: "Əlaqə şəxsləri", href: "/admin/contacts", icon: Contact, ready: true },
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
      { title: "Hero filmləri", href: "/admin/hero-films", icon: Clapperboard, ready: true },
      { title: "Menyular", href: "/admin/menus", icon: Menu, ready: true },
      {
        title: "Sayt mətnləri",
        href: "/admin/site-texts",
        icon: Type,
        ownerOnly: true,
        ready: true,
      },
      {
        title: "Yönləndirmələr",
        href: "/admin/redirects",
        icon: Route,
        ownerOnly: true,
        ready: true,
      },
      {
        title: "SEO və tənzimləmələr",
        href: "/admin/settings",
        icon: Settings,
        ownerOnly: true,
        ready: true,
      },
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
