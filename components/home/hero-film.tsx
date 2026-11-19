import { getImageProps } from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { ArrowRightIcon } from "@/components/icons/iconsax";
import { button, buttonArrow } from "@/components/site/button";
import type { HomeHero } from "@/lib/public/home";

import { HeroFilmPlayer, type HeroChapter } from "./hero-film-player";

const charWidth = 0.56;

function splitHeadline(headline: string): [string, string] {
  const words = headline.split(/\s+/).filter(Boolean);
  if (words.length < 2) return [headline, ""];
  const total = headline.length;
  let best = 1;
  let bestGap = Number.POSITIVE_INFINITY;
  for (let index = 1; index < words.length; index += 1) {
    const gap = Math.abs(words.slice(0, index).join(" ").length - total / 2);
    if (gap < bestGap) {
      bestGap = gap;
      best = index;
    }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

function longestSegment(text: string): number {
  return Math.max(1, ...text.split(/[\s-]+/).map((part) => part.length));
}

function displaySize(text: string, words: number): string {
  const cap = words <= 2 ? "var(--text-display)" : "var(--text-h1)";
  return `min(${cap}, calc(100cqi / ${(longestSegment(text) * charWidth).toFixed(2)}))`;
}

function Poster({ hero }: { hero: HomeHero }) {
  const film = hero.film;
  const poster = film?.poster;
  if (!film || !poster) return null;
  const common = {
    alt: poster.alt || hero.headline,
    sizes: "100vw",
    fetchPriority: "high" as const,
  };
  const {
    props: { srcSet: desktop, ...desktopRest },
  } = getImageProps({ ...common, src: poster.src, width: poster.width, height: poster.height });
  const mobile = film.mobilePoster
    ? getImageProps({
        ...common,
        src: film.mobilePoster.src,
        width: film.mobilePoster.width,
        height: film.mobilePoster.height,
      }).props
    : null;
  const img = mobile ?? { ...desktopRest, srcSet: desktop };
  return (
    <picture>
      {mobile ? <source media="(min-width: 1024px)" srcSet={desktop} sizes="100vw" /> : null}
      <img {...img} alt={img.alt} data-hero-poster="" className="hero-poster" />
    </picture>
  );
}

export function HeroFilm({
  hero,
  staticOnly,
  chapters,
  panel,
}: {
  hero: HomeHero;
  staticOnly: boolean;
  chapters: HeroChapter[];
  panel: ReactNode;
}) {
  const [groupA, groupB] = splitHeadline(hero.headline);
  const wordCount = hero.headline.split(/\s+/).filter(Boolean).length;
  const fontSize = displaySize(hero.headline, wordCount);
  const film = hero.film;

  return (
    <section
      data-hero-film=""
      data-hero-static={staticOnly || !film ? "" : undefined}
      aria-labelledby="hero-title"
      className="hero-film bg-navy-deep text-white"
    >
      <div className="hero-stage">
        <div className="hero-frame">
          <Poster hero={hero} />
          <div data-hero-canvas="" className="hero-canvas" />
          <div aria-hidden="true" className="hero-scrim-top" />
          <div aria-hidden="true" className="hero-scrim-bottom" />
          <div className="hero-copy container-page">
            <h1 id="hero-title" className="hero-title">
              <span data-hero-a="" className="hero-title-a" style={{ fontSize } as CSSProperties}>
                {groupA}
              </span>{" "}
              {groupB ? (
                <span data-hero-b="" className="hero-title-b" style={{ fontSize } as CSSProperties}>
                  {groupB}
                </span>
              ) : null}
            </h1>
            <div data-hero-cta="" className="hero-lead">
              {hero.subline ? <p className="text-lead text-white">{hero.subline}</p> : null}
              {hero.cta ? (
                <Link
                  href={hero.cta.href}
                  className={`${button({ variant: "accent" })} mt-6 self-start`}
                >
                  {hero.cta.label}
                  <ArrowRightIcon size={20} className={buttonArrow} />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
        {chapters.length ? (
          <ol className="hero-chapters container-page">
            {chapters.map((chapter, index) => (
              <li
                key={chapter.key}
                data-chapter=""
                data-from={chapter.from}
                data-to={chapter.to}
                className={chapter.placement === "top" ? "hero-chapter is-top" : "hero-chapter"}
              >
                <p className="text-label text-white uppercase">
                  <span className="tabular">{String(index + 1).padStart(2, "0")}</span>{" "}
                  {chapter.label}
                </p>
                <p className="mt-3 text-h3 text-white">{chapter.text}</p>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
      <div aria-hidden="true" className="hero-spacer" />
      {panel}
      {film && !staticOnly ? (
        <HeroFilmPlayer
          desktop={film.tiers.desktop}
          mobile={film.tiers.mobile}
          wide={film.tiers.wide}
          motion={film.motion}
        />
      ) : null}
    </section>
  );
}
