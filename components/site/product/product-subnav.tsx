import Link from "next/link";

import { pill } from "@/components/site/pill";

export type SubnavLink = { id: string; label: string };

export function ProductSubnav({
  name,
  label,
  links,
  quote,
}: {
  name: string;
  label: string;
  links: SubnavLink[];
  quote: { href: string; label: string } | null;
}) {
  return (
    <>
      <nav
        aria-label={label}
        className="sticky top-16 z-40 bg-surface xl:top-20 header-hidden:top-0 xl:header-hidden:top-0"
      >
        <div className="container-page flex h-15 items-center gap-8 md:h-21.5">
          <p className="hidden min-w-0 flex-1 truncate text-base text-fg md:block">{name}</p>
          <ul className="-mx-5 no-scrollbar flex min-w-0 flex-1 gap-8 overflow-x-auto px-5 sm:-mx-7.5 sm:px-7.5 md:mx-0 md:flex-none md:px-0">
            {links.map((link) => (
              <li key={link.id} className="shrink-0">
                <a
                  href={`#${link.id}`}
                  className="inline-flex min-h-11 items-center text-meta whitespace-nowrap text-fg transition-colors duration-200 hover:text-black"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          {quote && (
            <div className="hidden shrink-0 md:block">
              <Link href={quote.href} className={pill({ variant: "filled" })}>
                {quote.label}
              </Link>
            </div>
          )}
        </div>
      </nav>
      {quote && (
        <Link
          href={quote.href}
          data-quote-bar=""
          className="fixed right-20 bottom-0 left-0 z-40 flex h-14 items-center justify-center bg-graphite text-small font-medium text-white transition-colors duration-300 hover:bg-sand hover:text-graphite md:hidden"
        >
          {quote.label}
        </Link>
      )}
    </>
  );
}
