import { cookies } from "next/headers";

import { AdminHeader } from "@/components/admin/admin-header";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireAdminUser } from "@/lib/auth/session";

export const instant = false;

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const [user, cookieStore] = await Promise.all([requireAdminUser(), cookies()]);
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar user={user} />
      <SidebarInset className="min-w-0">
        <AdminHeader />
        <div className="container-page flex-1 py-6 lg:py-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
