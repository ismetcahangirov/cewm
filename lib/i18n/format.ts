export function fill(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

const sizeFormats = new Map<string, Intl.NumberFormat>();

export function formatFileSize(bytes: number, locale: string): string {
  const megabytes = bytes >= 1024 * 1024;
  const key = `${locale}-${megabytes ? "mb" : "kb"}`;
  let format = sizeFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(locale, {
      maximumFractionDigits: megabytes ? 1 : 0,
      minimumFractionDigits: megabytes ? 1 : 0,
    });
    sizeFormats.set(key, format);
  }
  return megabytes
    ? `${format.format(bytes / (1024 * 1024))} MB`
    : `${format.format(Math.max(1, Math.round(bytes / 1024)))} KB`;
}
