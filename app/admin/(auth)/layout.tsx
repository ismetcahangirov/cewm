import { AdminBrand } from "@/components/admin/brand";

export default function AuthLayout({ children }: LayoutProps<"/admin">) {
  return (
    <main className="flex min-h-svh items-start justify-center bg-surface px-5 py-12 sm:items-center sm:px-7.5">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <AdminBrand />
        </div>
        <div className="border border-border bg-white p-6 sm:p-8">{children}</div>
      </div>
    </main>
  );
}
