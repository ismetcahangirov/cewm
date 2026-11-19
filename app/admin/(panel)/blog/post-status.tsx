import { PublishStatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/admin/format";
import { useT } from "@/lib/admin/i18n/use-t";
import type { PostState } from "@/lib/validation/posts";

export function PostStatus({
  state,
  publishedAt,
}: {
  state: PostState;
  publishedAt: string | null;
}) {
  const t = useT();
  if (state !== "scheduled") return <PublishStatusBadge status={state} />;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <Badge variant="chip">{t("Planlaşdırılıb")}</Badge>
      <span className="whitespace-nowrap text-muted-foreground">
        {formatDateTime(publishedAt, t.locale)}
      </span>
    </span>
  );
}
