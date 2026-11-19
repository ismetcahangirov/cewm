import type { FactBlock } from "@/lib/seo/facts";

export function FactBlockView({ block, className }: { block: FactBlock; className?: string }) {
  const headingId = `${block.id}-heading`;
  return (
    <section aria-labelledby={headingId} className={className}>
      <h2 id={headingId} className="text-h4">
        {block.heading}
      </h2>
      <p className="mt-3 max-w-3xl text-lead">{block.answer}</p>
      {block.facts.length ? (
        <dl className="mt-6 grid max-w-3xl gap-x-8 gap-y-2 text-small sm:grid-cols-[minmax(0,14rem)_1fr]">
          {block.facts.map((fact) => (
            <div key={`${fact.label}-${fact.value}`} className="contents">
              <dt className="text-ink-muted">{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}
