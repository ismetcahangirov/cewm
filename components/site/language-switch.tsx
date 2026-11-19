"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";

import { ArrowDownIcon, GlobeIcon } from "@/components/icons/iconsax";
import { cx } from "@/lib/cx";
import { localePath, locales, type Locale } from "@/lib/i18n/config";

function stripLocale(pathname: string): string {
  const [, first, ...rest] = pathname.split("/");
  if ((locales as readonly string[]).includes(first)) return `/${rest.join("/")}`;
  return pathname;
}

function swapHrefs(pathname: string): Record<Locale, string> {
  const path = stripLocale(pathname);
  return Object.fromEntries(locales.map((code) => [code, localePath(code, path)])) as Record<
    Locale,
    string
  >;
}

function alternateHref(code: Locale): string | null {
  const link = document.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${code}"]`);
  if (!link?.href) return null;
  const url = new URL(link.href);
  return url.origin === location.origin ? url.pathname + url.search : null;
}

function follow(event: MouseEvent<HTMLAnchorElement>, code: Locale, fallback: string) {
  const target = alternateHref(code);
  if (!target || target === fallback) return;
  event.preventDefault();
  location.assign(target);
}

function useLocaleHrefs() {
  return swapHrefs(usePathname());
}

export function LanguageMenu({
  locale,
  label,
  names,
}: {
  locale: Locale;
  label: string;
  names: Record<Locale, string>;
}) {
  const hrefs = useLocaleHrefs();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
      className="relative"
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="language-menu"
        aria-label={`${label}: ${names[locale]}`}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-small font-medium uppercase transition-colors duration-200 ease-standard hover:text-cyan"
      >
        <GlobeIcon size={20} />
        <span lang={locale}>{locale}</span>
        <ArrowDownIcon
          size={16}
          className={cx("transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      {open ? (
        <ul
          id="language-menu"
          className="animate-fade text-ink shadow-island absolute top-full right-0 mt-2 min-w-48 rounded-sm bg-white py-2"
        >
          {locales.map((code) => (
            <li key={code}>
              <a
                href={hrefs[code]}
                hrefLang={code}
                lang={code}
                onClick={(event) => follow(event, code, hrefs[code])}
                aria-current={code === locale ? "true" : undefined}
                className={cx(
                  "hover:bg-mist flex min-h-11 items-center justify-between gap-4 px-5 text-small transition-colors duration-200",
                  code === locale && "text-cyan-ink font-medium",
                )}
              >
                {names[code]}
                <span className="text-label text-grey uppercase">{code}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function LanguageList({
  locale,
  label,
  names,
}: {
  locale: Locale;
  label: string;
  names: Record<Locale, string>;
}) {
  const hrefs = useLocaleHrefs();
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-2">
        {locales.map((code) => (
          <li key={code}>
            <a
              href={hrefs[code]}
              hrefLang={code}
              lang={code}
              onClick={(event) => follow(event, code, hrefs[code])}
              aria-current={code === locale ? "true" : undefined}
              aria-label={names[code]}
              className={cx(
                "inline-flex min-h-11 min-w-14 items-center justify-center rounded-full border px-4 text-small font-medium uppercase",
                code === locale ? "text-ink border-cyan bg-cyan" : "border-white/40 text-white",
              )}
            >
              {code}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
