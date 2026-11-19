"use client";

import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseLineIcon,
  MailIcon,
  MenuLineIcon,
  PhoneIcon,
} from "@/components/icons/iconsax";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { WhatsAppIcon } from "@/components/icons/whatsapp";
import type { Locale } from "@/lib/i18n/config";
import type { PublicMenuItem } from "@/lib/public/menus";
import { cx } from "@/lib/cx";

import { LanguageMenu } from "./language-switch";
import { pill } from "./pill";

export type HeaderLabels = {
  home: string;
  mainNavigation: string;
  openMenu: string;
  closeMenu: string;
  back: string;
  requestQuote: string;
  language: string;
  whatsapp: string;
  locales: Record<Locale, string>;
};

export type HeaderContacts = {
  phones: { label: string; number: string; href: string }[];
  email: { address: string; href: string } | null;
  whatsappHref: string | null;
};

type Props = {
  locale: Locale;
  homeHref: string;
  items: PublicMenuItem[];
  quoteHref: string | null;
  contacts: HeaderContacts;
  labels: HeaderLabels;
};

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isCurrent(item: PublicMenuItem, pathname: string): boolean {
  if (item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`))) return true;
  return item.children.some((child) => isCurrent(child, pathname));
}

function Logo({ homeHref, label }: { homeHref: string; label: string }) {
  return (
    <Link
      href={homeHref}
      aria-label={label}
      className="flex h-11 shrink-0 items-center"
      prefetch={false}
    >
      <span className="relative block origin-left transition-transform duration-350 ease-out motion-reduce:transition-none over-hero:scale-110">
        <Image
          src="/brand/logo-color.svg"
          alt=""
          width={1357}
          height={320}
          unoptimized
          loading="eager"
          className="h-9.75 w-auto transition-opacity duration-350 over-hero:opacity-0"
        />
        <Image
          src="/brand/logo-white.svg"
          alt=""
          width={1357}
          height={320}
          unoptimized
          loading="eager"
          className="absolute inset-0 h-9.75 w-auto opacity-0 transition-opacity duration-350 over-hero:opacity-100"
        />
      </span>
    </Link>
  );
}

function PanelIn({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("motion-safe:animate-panel-in", className)}>{children}</div>;
}

export function HeaderShell(props: Props) {
  const { locale, items, quoteHref, labels } = props;
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [hoverOpen, setHoverOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [pastHero, setPastHero] = useState(false);

  const navItems = items.filter((item) => !quoteHref || item.href !== quoteHref);
  const anyOpen = (openId !== null && !hoverOpen) || drawerOpen;

  const closeAll = useCallback((restoreFocus: boolean) => {
    setOpenId(null);
    setHoverOpen(false);
    setDrawerOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  const [renderedPath, setRenderedPath] = useState(pathname);
  if (renderedPath !== pathname) {
    setRenderedPath(pathname);
    setOpenId(null);
    setHoverOpen(false);
    setDrawerOpen(false);
  }

  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const focusInside = headerRef.current?.contains(document.activeElement) ?? false;
      if (y > lastY && y > 200 && !focusInside) setHidden(true);
      else if (y < lastY) setHidden(false);
      lastY = y;
      const hero = [...document.querySelectorAll("main > [data-hero]")].find(
        (element) => element.getClientRects().length > 0,
      );
      const headerHeight = headerRef.current?.offsetHeight ?? 0;
      setPastHero(!hero || hero.getBoundingClientRect().bottom <= headerHeight);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pathname]);

  useEffect(() => {
    if (!anyOpen) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeAll(true);
        return;
      }
      if (event.key !== "Tab" || !headerRef.current) return;
      const focusables = [
        ...headerRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      ].filter((element) => element.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [anyOpen, closeAll]);

  const toggle = (id: string, button: HTMLButtonElement) => {
    triggerRef.current = button;
    setDrawerOpen(false);
    setHoverOpen(false);
    setOpenId((current) => (current === id ? null : id));
  };

  const hoverItem = (id: string | null) => {
    if (drawerOpen || (openId !== null && !hoverOpen)) return;
    setOpenId(id);
    setHoverOpen(id !== null);
  };

  const openItem = navItems.find((item) => item.id === openId) ?? null;

  return (
    <header
      ref={headerRef}
      data-site-header=""
      data-hidden={hidden && !anyOpen ? "" : undefined}
      data-solid={pastHero || openId !== null || drawerOpen ? "" : undefined}
      className="fixed inset-x-0 top-0 z-50 text-black transition-[transform,color] duration-350 ease-out before:absolute before:inset-0 before:bg-white before:shadow-header before:transition-opacity before:duration-350 data-hidden:-translate-y-full data-hidden:before:opacity-0 over-hero:text-white over-hero:before:opacity-0"
      onMouseLeave={() => hoverOpen && hoverItem(null)}
    >
      <div
        className={cx(
          "relative container-page flex h-16 items-center gap-6 xl:h-20",
          drawerOpen && "border-b border-black",
        )}
      >
        <Logo homeHref={props.homeHref} label={labels.home} />

        <nav aria-label={labels.mainNavigation} className="ml-17.5 hidden xl:block">
          <ul className="flex items-center gap-9">
            {navItems.map((item) => {
              const current = isCurrent(item, pathname);
              if (!item.children.length || item.href) {
                return (
                  <li key={item.id} onMouseEnter={() => hoverItem(null)}>
                    <Link
                      href={item.href ?? "#"}
                      aria-current={current ? "page" : undefined}
                      className={cx(
                        "nav-line inline-flex min-h-11 items-center text-base",
                        current && "font-medium",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              }
              const open = openId === item.id;
              return (
                <li key={item.id} onMouseEnter={() => hoverItem(item.id)}>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={`menu-${item.id}`}
                    onClick={(event) => {
                      if (event.detail > 0 && hoverOpen && open) return;
                      toggle(item.id, event.currentTarget);
                    }}
                    className={cx(
                      "nav-line inline-flex min-h-11 items-center gap-1.5 text-base",
                      (current || open) && "font-medium",
                    )}
                  >
                    {item.label}
                    <ChevronDownIcon
                      aria-hidden="true"
                      className={cx(
                        "size-4 transition-transform duration-300",
                        open && "rotate-180",
                      )}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <LanguageMenu locale={locale} label={labels.language} names={labels.locales} />
          {quoteHref && (
            <Link
              href={quoteHref}
              className={cx(
                pill({ variant: "filled" }),
                "max-sm:hidden over-hero:bg-white over-hero:text-graphite",
              )}
            >
              {labels.requestQuote}
            </Link>
          )}
          <button
            type="button"
            aria-expanded={drawerOpen}
            aria-controls="site-drawer"
            aria-label={drawerOpen ? labels.closeMenu : labels.openMenu}
            onClick={(event) => {
              triggerRef.current = event.currentTarget;
              setOpenId(null);
              setDrawerOpen((open) => !open);
            }}
            className="-mr-2.5 inline-flex size-11 items-center justify-center xl:hidden"
          >
            {drawerOpen ? (
              <CloseLineIcon aria-hidden="true" className="size-6" />
            ) : (
              <MenuLineIcon aria-hidden="true" className="size-6" />
            )}
          </button>
        </div>
      </div>

      {openItem && <DropdownPanel key={openItem.id} item={openItem} autoFocus={!hoverOpen} />}

      {drawerOpen && (
        <Drawer items={navItems} quoteHref={quoteHref} contacts={props.contacts} labels={labels} />
      )}
    </header>
  );
}

function DropdownPanel({ item, autoFocus }: { item: PublicMenuItem; autoFocus: boolean }) {
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (autoFocus) listRef.current?.querySelector<HTMLElement>("a")?.focus();
  }, [autoFocus]);

  return (
    <div
      id={`menu-${item.id}`}
      className="absolute inset-x-0 top-full hidden border-t border-line bg-white text-black shadow-header xl:block"
    >
      <PanelIn className="container-page py-10">
        <ul ref={listRef} className="flex flex-col gap-1.5">
          {item.href && (
            <li>
              <Link href={item.href} className="block text-h4 hover:opacity-70">
                {item.label}
              </Link>
            </li>
          )}
          {item.children.map((child) => (
            <li key={child.id}>
              <Link
                href={child.href ?? "#"}
                className="block text-h4 transition-opacity duration-200 hover:opacity-70"
              >
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      </PanelIn>
    </div>
  );
}

function Drawer({
  items,
  quoteHref,
  contacts,
  labels,
}: {
  items: PublicMenuItem[];
  quoteHref: string | null;
  contacts: HeaderContacts;
  labels: HeaderLabels;
}) {
  const [stack, setStack] = useState<PublicMenuItem[]>([]);
  const parent = stack.at(-1) ?? null;
  const list = parent ? parent.children : items;
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (stack.length) listRef.current?.querySelector<HTMLElement>("a, button")?.focus();
  }, [stack]);

  return (
    <div
      id="site-drawer"
      className="fixed inset-x-0 top-16 bottom-0 flex flex-col overflow-y-auto bg-white text-black xl:hidden"
    >
      <PanelIn key={parent?.id ?? "root"} className="container-page py-5">
        <div ref={listRef}>
          {parent && (
            <div className="mb-3 flex flex-col items-start border-b border-line pb-3">
              <button
                type="button"
                onClick={() => setStack((current) => current.slice(0, -1))}
                className="inline-flex min-h-11 items-center gap-2.5 text-small text-graphite"
              >
                <ChevronLeftIcon aria-hidden="true" className="size-4" />
                {labels.back}
              </button>
              {parent.href ? (
                <Link href={parent.href} className="flex min-h-11 items-center text-h4">
                  {parent.label}
                </Link>
              ) : (
                <p className="flex min-h-11 items-center text-h4">{parent.label}</p>
              )}
            </div>
          )}
          <ul>
            {list.map((item) => (
              <li key={item.id}>
                {item.children.length && !(parent === null && item.href) ? (
                  <button
                    type="button"
                    onClick={() => setStack((current) => [...current, item])}
                    className="flex min-h-11 w-full items-center justify-between gap-4 py-1 text-left text-card"
                  >
                    {item.label}
                    <ChevronRightIcon aria-hidden="true" className="size-5" />
                  </button>
                ) : (
                  <Link
                    href={item.href ?? "#"}
                    className="flex min-h-11 items-center py-1 text-card"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      </PanelIn>
      <div className="container-page flex flex-col gap-4 border-t border-line pt-6 pb-24">
        <ul className="flex flex-col">
          {contacts.phones.map((phone) => (
            <li key={phone.number}>
              <a href={phone.href} className="flex min-h-11 items-center gap-2.5 text-small">
                <PhoneIcon aria-hidden="true" className="size-4 text-graphite" />
                {phone.number}
                <span className="text-muted">{phone.label}</span>
              </a>
            </li>
          ))}
          {contacts.email && (
            <li>
              <a
                href={contacts.email.href}
                className="flex min-h-11 items-center gap-2.5 text-small"
              >
                <MailIcon aria-hidden="true" className="size-4 text-graphite" />
                {contacts.email.address}
              </a>
            </li>
          )}
        </ul>
        {contacts.whatsappHref && (
          <a
            href={contacts.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={labels.whatsapp}
            className="-ml-2.5 inline-flex size-11 items-center justify-center text-graphite"
          >
            <WhatsAppIcon className="size-5" />
          </a>
        )}
        {quoteHref && (
          <Link href={quoteHref} className={cx(pill({ variant: "filled" }), "w-full")}>
            {labels.requestQuote}
          </Link>
        )}
      </div>
    </div>
  );
}
