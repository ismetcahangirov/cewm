import { Reveal } from "@/components/motion/text";
import type { RichTextDoc } from "@/lib/content/rich-text";

import { RichText, richTextHeadings } from "./rich-text";

export function ArticleBody({
  doc,
  contentsLabel,
  lang,
}: {
  doc: RichTextDoc;
  contentsLabel: string;
  lang?: string;
}) {
  const headings = richTextHeadings(doc);
  return (
    <div className="gap-x-column grid gap-y-10 lg:grid-cols-12">
      {headings.length >= 3 ? (
        <nav
          aria-labelledby="article-contents"
          className="lg:top-header lg:sticky lg:col-span-3 lg:self-start lg:pt-2"
        >
          <h2 id="article-contents" className="text-label text-grey uppercase">
            {contentsLabel}
          </h2>
          <ol className="mt-4 flex flex-col border-l border-line">
            {headings.map((heading) => (
              <li key={heading.id}>
                <a
                  href={`#${heading.id}`}
                  className="text-ink-muted hover:text-ink hover:border-ink -ml-px flex min-h-11 items-center border-l border-transparent py-1 pl-4 text-small transition-colors duration-200"
                >
                  {heading.text}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      <Reveal className="lg:col-span-7 lg:col-start-5">
        <div lang={lang}>
          <RichText
            doc={doc}
            headingIds
            imageSizes="(min-width: 1024px) 58vw, 100vw"
            className="rich-text-article"
          />
        </div>
      </Reveal>
    </div>
  );
}
