"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import {
  ArrowRightIcon,
  CallIcon,
  CloseIcon,
  MailIcon,
  MenuIcon,
} from "@/components/icons/iconsax";
import { mailtoHref, telHref } from "@/lib/contact-links";
import { cx } from "@/lib/cx";
import type { Locale } from "@/lib/i18n/config";
import { documentTop, measure, onScroll, readScroll } from "@/lib/motion/loop";
import { lockScroll } from "@/lib/motion/smooth-scroll";
import { formatAzerbaijaniPhone } from "@/lib/phone";

import { button, buttonArrow } from "./button";
import { LanguageMenu, LanguageList } from "./language-switch";

export type HeaderLink = { id: string; label: string; href: string };

type HeaderState = "clear" | "solid";

type Labels = {
  navigation: string;
  language: string;
  openMenu: string;
  closeMenu: string;
  home: string;
};

function isCurrent(pathname: string, href: string) {
  if (href === "/" || /^\/(ru|en|de)$/.test(href)) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function focusable(root: HTMLElement) {
  return [
    ...root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ];
}

function filmEnd(header: HTMLElement): number | null {
  const film = document.querySelector<HTMLElement>("[data-hero-film]");
  const stage = film?.querySelector<HTMLElement>(".hero-stage");
  if (!film || !stage) return null;
  if (getComputedStyle(stage).position !== "sticky") return 1;
  const unpinned = documentTop(film) + film.offsetHeight - window.innerHeight;
  const panel = film.querySelector<HTMLElement>(".panel-push");
  const covered = panel ? documentTop(panel) - header.offsetHeight : unpinned;
  return Math.min(unpinned, covered);
}

function useHeaderState(headerRef: React.RefObject<HTMLElement | null>, pathname: string) {
  const [state, setState] = useState<HeaderState>("clear");

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    let limit = filmEnd(header);
    const update = (y: number) => setState(limit !== null && y < limit ? "clear" : "solid");
    const remeasure = () => {
      limit = filmEnd(header);
      update(Math.max(readScroll().y, window.scrollY));
    };
    const stopMeasure = measure(document.body, remeasure);
    addEventListener("resize", remeasure, { passive: true });
    remeasure();
    const stopScroll = onScroll(update);
    return () => {
      stopMeasure();
      removeEventListener("resize", remeasure);
      stopScroll();
    };
  }, [headerRef, pathname]);

  return state;
}

export function HeaderBar({
  locale,
  home,
  items,
  logo,
  siteName,
  contact,
  names,
  labels,
  phones,
  emails,
}: {
  locale: Locale;
  home: string;
  items: HeaderLink[];
  logo: ReactNode;
  siteName: string;
  contact: { href: string; label: string } | null;
  names: Record<Locale, string>;
  labels: Labels;
  phones: string[];
  emails: string[];
}) {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const state = useHeaderState(headerRef, pathname);

  const close = useCallback(() => {
    setOpenPath(null);
    menuButtonRef.current?.focus();
  }, []);

  const brand = logo ?? <span className="text-h4 font-semibold">{siteName}</span>;

  return (
    <header
      ref={headerRef}
      data-site-header=""
      data-state={open ? "solid" : state}
      style={{ viewTransitionName: "site-header" } as CSSProperties}
      className="site-header h-header fixed inset-x-0 top-0 z-50 text-white"
    >
      <div aria-hidden="true" className="site-header-scrim" />
      <div aria-hidden="true" className="site-header-bg" />
      <div data-header-row="" className="relative container-page flex h-full items-center gap-6">
        <Link
          href={home}
          aria-label={`${siteName}: ${labels.home}`}
          className="inline-flex min-h-11 shrink-0 items-center"
        >
          {brand}
        </Link>
        <nav aria-label={labels.navigation} className="mx-auto hidden xl:block">
          <ul className="flex items-center gap-1">
            {items.map((item) => {
              const current = isCurrent(pathname, item.href);
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    className={cx(
                      "inline-flex min-h-11 items-center px-3 text-small font-medium transition-colors duration-200 ease-standard hover:text-cyan",
                      current ? "text-cyan" : "text-white",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2 xl:ml-0">
          <LanguageMenu locale={locale} label={labels.language} names={names} />
          {contact ? (
            <Link
              href={contact.href}
              className={cx(button({ variant: "accent" }), "min-h-11 max-md:hidden")}
            >
              {contact.label}
              <ArrowRightIcon size={20} className={buttonArrow} />
            </Link>
          ) : null}
          <button
            ref={menuButtonRef}
            type="button"
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? labels.closeMenu : labels.openMenu}
            onClick={() => setOpenPath(open ? null : pathname)}
            className="inline-flex size-11 items-center justify-center rounded-full border border-white/40 transition-colors duration-200 ease-standard hover:border-white xl:hidden"
          >
            {open ? <CloseIcon size={24} /> : <MenuIcon size={24} />}
          </button>
        </div>
      </div>
      {open ? (
        <MobileMenu
          locale={locale}
          items={items}
          pathname={pathname}
          contact={contact}
          names={names}
          labels={labels}
          phones={phones}
          emails={emails}
          onClose={close}
        />
      ) : null}
    </header>
  );
}

function MobileMenu({
  locale,
  items,
  pathname,
  contact,
  names,
  labels,
  phones,
  emails,
  onClose,
}: {
  locale: Locale;
  items: HeaderLink[];
  pathname: string;
  contact: { href: string; label: string } | null;
  names: Record<Locale, string>;
  labels: Labels;
  phones: string[];
  emails: string[];
  onClose: () => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sheet = sheetRef.current;
    lockScroll(true);
    focusable(sheet ?? document.body)[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !sheet) return;
      const header = sheet.closest("header");
      const targets = header ? focusable(header) : [];
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      lockScroll(false);
    };
  }, [onClose]);

  return (
    <div
      ref={sheetRef}
      id="site-menu"
      data-lenis-prevent=""
      className="surface-navy top-header fixed inset-x-0 bottom-0 overflow-y-auto overscroll-contain xl:hidden"
    >
      <div className="container-page flex min-h-full flex-col gap-12 py-8">
        <nav aria-label={labels.navigation}>
          <ul className="flex flex-col">
            {items.map((item, index) => {
              const current = isCurrent(pathname, item.href);
              return (
                <li
                  key={item.id}
                  className="animate-rise border-b border-white/15"
                  style={{ animationDelay: `${Math.min(index, 4) * 120}ms` }}
                >
                  <Link
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    onClick={onClose}
                    className={cx(
                      "flex min-h-16 items-center justify-between gap-4 py-3 text-h3",
                      current ? "text-cyan" : "text-white",
                    )}
                  >
                    {item.label}
                    <ArrowRightIcon size={24} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mt-auto flex flex-col gap-8">
          <LanguageList locale={locale} names={names} label={labels.language} />
          <ul className="flex flex-col gap-1 text-small">
            {phones.map((phone) => (
              <li key={phone}>
                <a href={telHref(phone)} className="inline-flex min-h-11 items-center gap-3">
                  <CallIcon size={20} className="text-cyan" />
                  {formatAzerbaijaniPhone(phone)}
                </a>
              </li>
            ))}
            {emails.map((email) => (
              <li key={email}>
                <a href={mailtoHref(email)} className="inline-flex min-h-11 items-center gap-3">
                  <MailIcon size={20} className="text-cyan" />
                  {email}
                </a>
              </li>
            ))}
          </ul>
          {contact ? (
            <Link
              href={contact.href}
              onClick={onClose}
              className={cx(button({ variant: "accent" }), "w-full")}
            >
              {contact.label}
              <ArrowRightIcon size={20} className={buttonArrow} />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
