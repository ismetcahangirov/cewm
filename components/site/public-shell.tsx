import type { ReactNode } from "react";

import { fontClassName } from "@/app/fonts";
import { MotionRoot } from "@/components/motion/motion-root";
import { localePath, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";

import { ErrorTextsProvider } from "./error-texts";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { VisitBeacon } from "./visit-beacon";

const restoreTopOnReload = `(function(){try{var n=performance.getEntriesByType("navigation")[0];if(n&&n.type==="reload"){history.scrollRestoration="manual";var h=location.hash,go=function(){var t=h&&document.getElementById(decodeURIComponent(h.slice(1)));if(t)t.scrollIntoView();else if(!h)scrollTo(0,0)};go();addEventListener("load",go);var e=["wheel","touchstart","keydown","pointerdown","pagehide"],r=function(){history.scrollRestoration="auto";e.forEach(function(t){removeEventListener(t,r,true)})};e.forEach(function(t){addEventListener(t,r,{capture:true,passive:true})})}}catch(x){}})()`;

export function PublicShell({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: ReactNode;
}) {
  return (
    <html lang={locale} className={fontClassName}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: restoreTopOnReload }} />
        <a
          href="#main"
          className="text-ink sr-only bg-white px-4 py-3 text-small focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-60"
        >
          {dict.common.skipToContent}
        </a>
        <SiteHeader locale={locale} dict={dict} />
        <main id="main" tabIndex={-1} className="site-main overflow-x-clip outline-none">
          <ErrorTextsProvider
            value={{
              eyebrow: dict.error.eyebrow,
              title: dict.error.title,
              body: dict.error.body,
              retry: dict.error.retry,
              home: dict.common.home,
              homeHref: localePath(locale),
            }}
          >
            {children}
          </ErrorTextsProvider>
        </main>
        <SiteFooter locale={locale} dict={dict} />
        <MotionRoot />
        <VisitBeacon />
      </body>
    </html>
  );
}
