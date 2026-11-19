"use client";

import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/admin/i18n/use-t";

const requestStatus = {
  new: { label: "Yeni", variant: "default" },
  "in-progress": { label: "Baxılıb", variant: "chip" },
  done: { label: "Cavablandı", variant: "outline" },
} as const;

const publishStatus = {
  published: { label: "Dərc olunub", variant: "accent" },
  draft: { label: "Qaralama", variant: "outline" },
} as const;

export function RequestStatusBadge({ status }: { status: keyof typeof requestStatus }) {
  const t = useT();
  const { label, variant } = requestStatus[status];
  return <Badge variant={variant}>{t(label)}</Badge>;
}

export function PublishStatusBadge({ status }: { status: keyof typeof publishStatus }) {
  const t = useT();
  const { label, variant } = publishStatus[status];
  return <Badge variant={variant}>{t(label)}</Badge>;
}
