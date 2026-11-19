import type { ProductSpecRow } from "@/lib/public/product";

export function SpecList({ rows, className }: { rows: ProductSpecRow[]; className?: string }) {
  if (!rows.length) return null;
  return (
    <dl className={className}>
      {rows.map((row, index) => (
        <div
          key={`${row.label}-${index}`}
          className="flex min-h-20 items-center gap-5 border-b border-line-strong py-4 text-small"
        >
          <dt className="w-2/5 shrink-0 text-muted">{row.label}</dt>
          <dd className="min-w-0 flex-1 text-fg">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
