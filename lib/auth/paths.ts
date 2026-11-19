export const adminPaths = {
  home: "/admin",
  login: "/admin/login",
  forgotPassword: "/admin/forgot-password",
  resetPassword: "/admin/reset-password",
} as const;

export const publicAdminPaths: readonly string[] = [
  adminPaths.login,
  adminPaths.forgotPassword,
  adminPaths.resetPassword,
];

export function safeAdminRedirect(value: string | null | undefined): string {
  if (!value || !value.startsWith("/admin") || value.startsWith("//")) return adminPaths.home;
  if (publicAdminPaths.some((path) => value === path || value.startsWith(`${path}?`))) {
    return adminPaths.home;
  }
  return value;
}
