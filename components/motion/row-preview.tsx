"use client";

import { getImageProps } from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { ArrowRightIcon, ExportSquareIcon } from "@/components/icons/iconsax";
import { cx } from "@/lib/cx";
import { reducedMotion, subscribe } from "@/lib/motion/loop";

export type PreviewImage = { src: string; width: number; height: number; alt: string };

export type PreviewRow = {
  id: string;
  href: string;
  title: string;
  tags?: string[];
  image?: PreviewImage | null;
  external?: boolean;
};

const followMs = 80;

function previewProps(image: PreviewImage) {
  return getImageProps({
    src: image.src,
    width: image.width,
    height: image.height,
    alt: "",
    sizes: "320px",
  }).props;
}

export function RowPreview({ rows, label }: { rows: PreviewRow[]; label?: string }) {
  const listRef = useRef<HTMLUListElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [switching, setSwitching] = useState(false);
  const pointer = useRef({ x: 0, y: 0, shownX: 0, shownY: 0, placed: false });
  const hasImages = rows.some((row) => row.image);

  useEffect(() => {
    if (!hasImages || active === null) return;
    const preview = previewRef.current;
    if (!preview) return;
    if (reducedMotion()) {
      const row = listRef.current?.children[active];
      if (!row) return;
      const rect = row.getBoundingClientRect();
      preview.style.transform = `translate3d(${rect.right - preview.offsetWidth - 64}px, ${rect.top + rect.height / 2 - preview.offsetHeight / 2}px, 0) rotate(3deg)`;
      return;
    }
    const state = pointer.current;
    return subscribe((_time, dt) => {
      if (!state.placed) {
        state.shownX = state.x;
        state.shownY = state.y;
        state.placed = true;
      }
      const amount = 1 - Math.exp(-dt / followMs);
      state.shownX += (state.x - state.shownX) * amount;
      state.shownY += (state.y - state.shownY) * amount;
      preview.style.transform = `translate3d(${state.shownX.toFixed(1)}px, ${state.shownY.toFixed(1)}px, 0) rotate(3deg)`;
    });
  }, [active, hasImages]);

  function show(index: number) {
    if (!rows[index]?.image || !matchMedia("(hover: hover)").matches) return;
    setSwitching(active !== null && active !== index);
    setActive(index);
  }

  return (
    <div
      onPointerMove={(event) => {
        const preview = previewRef.current;
        pointer.current.x = event.clientX + 24;
        pointer.current.y = event.clientY - (preview?.offsetHeight ?? 0) / 2;
      }}
      onPointerLeave={() => {
        setActive(null);
        pointer.current.placed = false;
      }}
    >
      <ul ref={listRef} aria-label={label} className="border-t border-line">
        {rows.map((row, index) => (
          <li key={row.id} className="border-b border-line">
            <Link
              href={row.href}
              {...(row.external ? { target: "_blank", rel: "noopener" } : {})}
              onPointerEnter={() => show(index)}
              onFocus={() => setActive(null)}
              className="row-link group/row grid min-h-20 grid-cols-[auto_1fr_auto] items-center gap-x-6 gap-y-2 py-5 md:grid-cols-[3rem_minmax(0,4fr)_minmax(0,6fr)_auto]"
            >
              {row.image ? (
                <span className="row-thumb bg-mist relative size-16 overflow-clip rounded-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    {...previewProps(row.image)}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                  />
                </span>
              ) : (
                <span className="text-label text-grey tabular">
                  {String(index + 1).padStart(2, "0")}
                </span>
              )}
              <span className="row-title text-ink-muted text-h4 transition-colors duration-200 ease-standard">
                {row.title}
              </span>
              {row.tags?.length ? (
                <span className="col-span-full col-start-2 flex flex-wrap gap-2 md:col-span-1 md:col-start-3 md:row-start-1">
                  {row.tags.map((tag) => (
                    <span
                      key={tag}
                      className="row-tag text-ink-muted rounded-full border border-line px-3 py-1 text-small transition-colors duration-200"
                    >
                      {tag}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="hidden md:block" />
              )}
              <span className="row-arrow text-ink col-start-3 row-start-1 transition-transform duration-200 ease-standard md:col-start-4">
                {row.external ? <ExportSquareIcon size={20} /> : <ArrowRightIcon size={20} />}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {hasImages ? (
        <div ref={previewRef} aria-hidden="true" className="row-preview">
          {rows.map((row, index) =>
            row.image ? (
              <span
                key={row.id}
                data-active={active === index ? "" : undefined}
                className={cx("row-preview-image", switching && "is-switching")}
                style={{ "--enter-delay": switching ? "200ms" : "0ms" } as CSSProperties}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img {...previewProps(row.image)} alt="" className="size-full object-cover" />
              </span>
            ) : null,
          )}
        </div>
      ) : null}
    </div>
  );
}
