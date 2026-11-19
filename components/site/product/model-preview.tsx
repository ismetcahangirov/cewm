"use client";

import { BoxIcon, SpinnerIcon } from "@/components/icons/iconsax";
import Image from "next/image";
import { createElement, useState } from "react";

import { pill } from "@/components/site/pill";
import type { PublicImage } from "@/lib/public/images";
import { blurPlaceholder } from "@/lib/public/blur";

const scriptSrc = "https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js";

let loading: Promise<void> | null = null;

function loadModelViewer(): Promise<void> {
  if (customElements.get("model-viewer")) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.type = "module";
    script.src = scriptSrc;
    script.onload = () => customElements.whenDefined("model-viewer").then(() => resolve());
    script.onerror = () => {
      script.remove();
      loading = null;
      reject(new Error("model-viewer failed to load"));
    };
    document.head.append(script);
  });
  return loading;
}

export function ModelPreview({
  src,
  poster,
  name,
  label,
}: {
  src: string;
  poster: PublicImage | null;
  name: string;
  label: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "ready">("idle");

  const start = () => {
    if (state !== "idle") return;
    setState("loading");
    loadModelViewer().then(
      () => setState("ready"),
      () => setState("idle"),
    );
  };

  return (
    <div className="relative aspect-square overflow-hidden bg-surface">
      {state === "ready" ? (
        createElement("model-viewer", {
          src,
          poster: poster?.src,
          alt: name,
          "camera-controls": "",
          "touch-action": "pan-y",
          "interaction-prompt": "none",
          className: "block size-full",
        })
      ) : (
        <>
          {poster && (
            <Image
              src={poster.src}
              alt={poster.alt}
              fill
              sizes="(min-width: 1024px) 45vw, 100vw"
              {...blurPlaceholder(poster)}
              className="object-contain mix-blend-multiply"
            />
          )}
          <button
            type="button"
            onClick={start}
            aria-busy={state === "loading" || undefined}
            className={pill({ variant: "filled", className: "absolute bottom-5 left-5" })}
          >
            {state === "loading" ? (
              <SpinnerIcon aria-hidden="true" className="size-4 motion-safe:animate-spin" />
            ) : (
              <BoxIcon aria-hidden="true" className="size-4" />
            )}
            {label}
          </button>
        </>
      )}
    </div>
  );
}
