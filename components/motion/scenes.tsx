import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

export function PanelPush({
  children,
  className,
  labelledBy,
}: {
  children: ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  return (
    <section aria-labelledby={labelledBy} className={cx("panel-push surface-navy", className)}>
      {children}
    </section>
  );
}

export function ClipExpand({
  media,
  children,
  className,
}: {
  media: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div data-clip-expand="" className={cx("bg-navy-deep", className)}>
      <div className="stage">
        <div className="stage-media">{media}</div>
        {children ? <div className="relative h-full">{children}</div> : null}
      </div>
    </div>
  );
}
