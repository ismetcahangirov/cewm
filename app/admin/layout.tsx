import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { AdminLocaleSync } from "@/components/admin/admin-locale-sync";
import { StoreProvider } from "@/components/providers/store-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getAdminLocale } from "@/lib/admin/i18n/server";

import "../admin.css";

export const metadata: Metadata = {
  title: { default: "CEWM admin", template: "%s | CEWM admin" },
  robots: { index: false, follow: false },
};

async function RequestStore({ children }: { children: ReactNode }) {
  const contentLocale = await getAdminLocale();
  return (
    <StoreProvider preloadedState={{ editor: { contentLocale } }}>
      <AdminLocaleSync />
      {children}
    </StoreProvider>
  );
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="az" data-scroll-behavior="smooth">
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
