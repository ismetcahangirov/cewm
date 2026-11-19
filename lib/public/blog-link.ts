import "server-only";

import { localePath, type Locale } from "@/lib/i18n/config";
import { routes } from "@/lib/routes";

import { getLatestPosts } from "./home";
import type { PublicMenuItem } from "./menus";

function withoutHref(items: PublicMenuItem[], href: string): PublicMenuItem[] {
  return items.flatMap((item) => {
    const children = withoutHref(item.children, href);
    if (item.href === href) return children.length ? [{ ...item, href: null, children }] : [];
    return [{ ...item, children }];
  });
}

export async function hideBlogWithoutPosts(
  items: PublicMenuItem[],
  locale: Locale,
): Promise<PublicMenuItem[]> {
  const posts = await getLatestPosts(locale);
  return posts.length ? items : withoutHref(items, localePath(locale, routes.blog()));
}
