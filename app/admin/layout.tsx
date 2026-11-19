import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense, type ReactNode } from "react";

import { fontVariables } from "@/app/fonts";
import { AdminLocaleSync } from "@/components/admin/admin-locale-sync";
import { StoreProvider } from "@/components/providers/store-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { contentLocaleCookie } from "@/lib/store/editor-slice";

import "../globals.css";

export const metadata: Metadata = {
  title: { default: "Mebline admin", template: "%s | Mebline admin" },
  robots: { index: false, follow: false },
};

async function RequestStore({ children }: { children: ReactNode }) {
  const saved = (await cookies()).get(contentLocaleCookie)?.value;
  const contentLocale = isLocale(saved) ? saved : defaultLocale;
  return (
    <StoreProvider preloadedState={{ editor: { contentLocale } }}>
      <AdminLocaleSync />
      {children}
    </StoreProvider>
  );
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="az" className={fontVariables} data-scroll-behavior="smooth">
      <body className="bg-white">
        <TooltipProvider delayDuration={300}>
          <Suspense>
            <RequestStore>{children}</RequestStore>
          </Suspense>
        </TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
