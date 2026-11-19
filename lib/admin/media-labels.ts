import type { MessageKey } from "@/lib/admin/i18n";
import type { MessageParams } from "@/lib/admin/i18n/translate";
import { mediaUsageKinds, type MediaUsage, type MediaUsageKind } from "@/lib/validation/media";

type Translate = (key: MessageKey, params?: MessageParams) => string;

const usageLabels: Record<MediaUsageKind, MessageKey> = {
  products: "{count} məhsul",
  categories: "{count} kateqoriya",
  brands: "{count} brend",
  posts: "{count} bloq yazısı",
  pages: "{count} səhifə",
  clients: "{count} müştəri loqosu",
  contacts: "{count} əlaqə şəxsi",
  films: "{count} hero filmi",
  settings: "sayt tənzimləmələri",
  content: "{count} mətn",
};

export function usageParts(usage: MediaUsage, t: Translate): string[] {
  return mediaUsageKinds
    .filter((kind) => usage[kind] > 0)
    .map((kind) => t(usageLabels[kind], { count: usage[kind] }));
}

export function usageSummary(usage: MediaUsage, t: Translate): string {
  const parts = usageParts(usage, t);
  return parts.length ? t("İstifadə: {list}", { list: parts.join(", ") }) : t("İstifadə olunmur");
}
