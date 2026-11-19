"use client";

import Image from "next/image";
import { useState } from "react";

import { ExportSquareIcon, PlayIcon } from "@/components/icons/iconsax";

type Poster = { src: string; alt: string } | null;

export type VideoSource =
  | { kind: "file"; src: string; type: string; poster: Poster }
  | { kind: "link"; url: string; poster: Poster };

export function embedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1);
      return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id =
        parsed.searchParams.get("v") ??
        parsed.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/)?.[1];
      return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` : null;
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = parsed.pathname.match(/(\d+)/)?.[1];
      return id ? `https://player.vimeo.com/video/${id}?autoplay=1&dnt=1` : null;
    }
    return null;
  } catch {
    return null;
  }
}

function Facade({ poster, label, onPlay }: { poster: Poster; label: string; onPlay: () => void }) {
  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label={label}
      className="group/play bg-navy-deep relative block aspect-video w-full overflow-clip"
    >
      {poster ? (
        <Image
          src={poster.src}
          alt=""
          fill
          sizes="(min-width: 1024px) 66vw, 100vw"
          className="object-cover opacity-80"
        />
      ) : null}
      <span className="text-ink absolute top-1/2 left-1/2 inline-flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-cyan transition-transform duration-200 ease-standard group-hover/play:scale-110">
        <PlayIcon size={32} />
      </span>
    </button>
  );
}

export function ProductVideo({
  video,
  title,
  playLabel,
  openLabel,
}: {
  video: VideoSource;
  title: string;
  playLabel: string;
  openLabel: string;
}) {
  const [playing, setPlaying] = useState(false);

  if (video.kind === "file") {
    return (
      <video
        controls
        playsInline
        preload="none"
        poster={video.poster?.src}
        aria-label={title}
        className="bg-navy-deep aspect-video w-full"
      >
        <source src={video.src} type={video.type} />
      </video>
    );
  }

  const embed = embedUrl(video.url);
  if (!embed) {
    return (
      <a
        href={video.url}
        target="_blank"
        rel="noopener"
        className="text-cyan-ink hover:text-ink inline-flex min-h-11 items-center gap-2 underline decoration-1 underline-offset-4"
      >
        {openLabel}
        <ExportSquareIcon size={16} />
      </a>
    );
  }
  return playing ? (
    <iframe
      src={embed}
      title={title}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      className="aspect-video w-full border-0"
    />
  ) : (
    <Facade
      poster={video.poster}
      label={`${playLabel}: ${title}`}
      onPlay={() => setPlaying(true)}
    />
  );
}
