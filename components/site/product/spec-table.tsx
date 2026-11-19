import { cx } from "@/lib/cx";
import type { ProductSpecGroup } from "@/lib/public/product";

const numericValue = /^[\d\s.,:×x+\-–—/±()]+$/;

function isNumeric(value: string): boolean {
  return /\d/.test(value) && numericValue.test(value);
}

export function SpecTable({
  groups,
  caption,
  parameterLabel,
  valueLabel,
}: {
  groups: ProductSpecGroup[];
  caption: string;
  parameterLabel: string;
  valueLabel: string;
}) {
  const rows = groups.reduce((sum, group) => sum + group.rows.length, 0);
  return (
    <table className={cx("spec-table w-full text-small", rows > 8 && "is-long")}>
      <caption className="sr-only">{caption}</caption>
      <colgroup>
        <col className="spec-col-label" />
        <col />
      </colgroup>
      <thead>
        <tr>
          <th scope="col" className="text-label text-grey py-3 pr-4 text-left uppercase">
            {parameterLabel}
          </th>
          <th scope="col" className="text-label text-grey py-3 text-right uppercase">
            {valueLabel}
          </th>
        </tr>
      </thead>
      {groups.map((group, groupIndex) => (
        <tbody key={`${group.heading ?? "group"}-${groupIndex}`}>
          {group.heading ? (
            <tr>
              <th
                scope="colgroup"
                colSpan={2}
                className="text-ink border-b border-line-strong pt-10 pb-3 text-left text-h4"
              >
                {group.heading}
              </th>
            </tr>
          ) : null}
          {group.rows.map((row, index) => (
            <tr key={`${row.label}-${index}`} className="spec-row border-b border-line">
              <th scope="row" className="text-ink-muted font-regular py-3 pr-4 text-left align-top">
                {row.label}
              </th>
              <td
                className={cx(
                  "text-ink py-3 align-top",
                  isNumeric(row.value) ? "tabular text-right" : "text-right",
                )}
              >
                {row.value}
                {row.unit ? <span className="text-grey"> {row.unit}</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      ))}
    </table>
  );
}
