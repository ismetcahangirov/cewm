import { cx } from "@/lib/cx";
import type { FactBlock } from "@/lib/seo/facts";

export function FactBlockView({
  block,
  className,
  lang,
}: {
  block: FactBlock;
  className?: string;
  lang?: string;
}) {
  const headingId = `${block.id}-heading`;
  return (
    <section
      aria-labelledby={headingId}
      className={cx("gap-x-column grid gap-y-6 lg:grid-cols-12", className)}
    >
      <h2 id={headingId} className="text-safe text-h4 lg:col-span-4">
        {block.heading}
      </h2>
      <div className="lg:col-span-8">
        <p lang={lang} className="text-lead">
          {block.answer}
        </p>
        {block.facts.length ? (
          <dl className="gap-x-column mt-8 grid border-t border-line md:grid-cols-2">
            {block.facts.map((fact) => (
              <div
                key={`${fact.label}-${fact.value}`}
                className={cx(
                  "flex flex-col gap-1 border-b border-line py-3",
                  fact.value.length > 60 && "md:col-span-2",
                )}
              >
                <dt className="text-grey text-small">{fact.label}</dt>
                <dd lang={lang} className="text-safe">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </section>
  );
}
