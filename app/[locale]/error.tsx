"use client";

import { button } from "@/components/site/button";
import { useErrorTexts } from "@/components/site/error-texts";

export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  const text = useErrorTexts();
  if (!text) return null;
  return (
    <section aria-labelledby="error-title" className="container-page py-section">
      <div className="gap-x-column grid gap-y-8 lg:grid-cols-12">
        <p className="text-label text-cyan-ink uppercase lg:col-span-3 lg:pt-3">{text.eyebrow}</p>
        <div className="lg:col-span-8">
          <h1 id="error-title" className="text-h1">
            {text.title}
          </h1>
          <p className="text-ink-muted mt-6 text-lead">{text.body}</p>
          <div className="mt-10 flex flex-wrap gap-4">
            <button type="button" onClick={retry} className={button()}>
              {text.retry}
            </button>
            <a href={text.homeHref} className={button({ variant: "outline" })}>
              {text.home}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
