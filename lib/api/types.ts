import { translateMessage } from "@/lib/admin/i18n";
import { currentAdminLocale } from "@/lib/admin/i18n/current";

export type ApiError = {
  error: "unauthorized" | "forbidden" | "invalid" | "not-found" | "conflict" | "too-many-requests";
  message: string;
  fields?: Record<string, string>;
};

export type Page<Row> = {
  rows: Row[];
  rowCount: number;
};

export type SortOrder = "asc" | "desc";

export function isApiError(value: unknown): value is { status: number; data: ApiError } {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    typeof value.data === "object" &&
    value.data !== null &&
    "message" in value.data
  );
}

export function apiErrorMessage(
  error: unknown,
  fallback = "Xəta baş verdi. Yenidən cəhd edin.",
): string {
  return translateMessage(currentAdminLocale(), isApiError(error) ? error.data.message : fallback);
}
