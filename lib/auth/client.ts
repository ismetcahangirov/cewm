import { createAuthClient } from "better-auth/react";

import type { MessageKey } from "@/lib/admin/i18n";

export const authClient = createAuthClient();

const errorMessages: Record<string, MessageKey> = {
  INVALID_EMAIL_OR_PASSWORD: "E-poçt və ya şifrə yanlışdır.",
  BANNED_USER: "Hesabınız deaktiv edilib.",
  INVALID_TOKEN: "Link etibarsızdır və ya vaxtı keçib. Yeni link istəyin.",
  PASSWORD_TOO_SHORT: "Şifrə çox qısadır.",
  PASSWORD_TOO_LONG: "Şifrə çox uzundur.",
};

export function authErrorMessage(error: { code?: string; status?: number } | null): MessageKey {
  if (!error) return "Xəta baş verdi. Yenidən cəhd edin.";
  if (error.status === 429) return "Çox cəhd edildi. Bir dəqiqə sonra yenidən yoxlayın.";
  return (error.code && errorMessages[error.code]) || "Xəta baş verdi. Yenidən cəhd edin.";
}
