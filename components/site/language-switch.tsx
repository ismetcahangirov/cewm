"use client";

import { GlobeIcon } from "@/components/icons/iconsax";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";

import { localePath, locales, type Locale } from "@/lib/i18n/config";
import { cx } from "@/lib/cx";

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

export function LanguageMenu({
  locale,
  label,
  names,
  className,
}: {
  locale: Locale;
  label: string;
  names: Record<Locale, string>;
  className?: string;
}) {
  const hrefs = swapHrefs(usePathname());
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
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
      className={cx("relative", className)}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="language-menu"
        aria-label={`${label}: ${names[locale]}`}
        onClick={(event) => {
          if (event.detail > 0 && open) return;
          setOpen((current) => !current);
        }}
        className="inline-flex size-11 items-center justify-center transition-opacity duration-200 hover:opacity-70"
      >
        <GlobeIcon aria-hidden="true" className="size-5" />
      </button>
      {open && (
        <ul
          id="language-menu"
          className="motion-safe:animate-fade-in absolute top-full right-0 min-w-44 bg-white py-2 text-black shadow-header"
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
                  "flex min-h-11 items-center px-5 text-small transition-opacity duration-200 hover:opacity-70",
                  code === locale && "font-medium",
                )}
              >
                {names[code]}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
