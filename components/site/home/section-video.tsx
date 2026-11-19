"use client";

import { VolumeHighIcon, VolumeSlashIcon } from "@/components/icons/iconsax";
import { useEffect, useRef, useState } from "react";

import type { HomeVideo } from "@/lib/public/home";
import { cx } from "@/lib/cx";

export type SoundLabels = { soundOn: string; soundOff: string };

export function SectionVideo({
  video,
  poster,
  labels,
  className,
}: {
  video: HomeVideo;
  poster: string | null;
  labels: SoundLabels;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [reduced, setReduced] = useState(false);
  const [muted, setMuted] = useState(video.autoplay || !video.sound);
  const playsItself = video.autoplay && !reduced;

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element || !playsItself) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) void element.play().catch(() => undefined);
      else element.pause();
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      element.pause();
    };
  }, [playsItself]);

  function toggleSound() {
    const element = ref.current;
    if (!element) return;
    element.muted = !muted;
    setMuted(!muted);
    if (element.paused) void element.play().catch(() => undefined);
  }

  return (
    <>
      <video
        ref={ref}
        muted={muted}
        loop={video.autoplay}
        playsInline
        preload="metadata"
        poster={poster ?? undefined}
        controls={!playsItself}
        aria-label={video.label ?? undefined}
        aria-hidden={video.label || !playsItself ? undefined : true}
        onVolumeChange={(event) => setMuted(event.currentTarget.muted)}
        className={cx("size-full object-cover", className)}
      >
        <source src={video.src} type={video.type} />
      </video>
      {playsItself && video.sound && (
        <button
          type="button"
          onClick={toggleSound}
          aria-label={muted ? labels.soundOn : labels.soundOff}
          aria-pressed={!muted}
          className="absolute right-4 bottom-4 z-10 inline-flex size-11 items-center justify-center rounded-full bg-black/45 text-white transition-colors duration-300 hover:bg-black/65"
        >
          {muted ? (
            <VolumeSlashIcon aria-hidden="true" className="size-5" />
          ) : (
            <VolumeHighIcon aria-hidden="true" className="size-5" />
          )}
        </button>
      )}
    </>
  );
}
