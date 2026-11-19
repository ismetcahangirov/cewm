import Image, { getImageProps } from "next/image";
import { preload } from "react-dom";

import { portraitCrop, portraitCropSize, portraitCropSrc } from "@/lib/media-crop";
import type { PublicImage } from "@/lib/public/images";
import { blurPlaceholder } from "@/lib/public/blur";

const phone = "(max-width: 639px)";

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function phoneSizes({ width, height }: PublicImage): string[] {
  const ratio = width / height;
  return [
    `${phone} max(100vw, ${Math.round(560 * ratio)}px, ${round(75 * ratio)}vh)`,
    `${phone} ${round(75 * ratio)}vh`,
  ];
}

export function heroSizes(image: PublicImage): string {
  const ratio = image.width / image.height;
  return [
    ...phoneSizes(image),
    `max(100vw, min(${round(100 * ratio)}vh, ${Math.round(980 * ratio)}px))`,
    "100vw",
  ].join(", ");
}

export function HeroImage({
  image,
  mobileImage,
  priority,
  className,
}: {
  image: PublicImage;
  mobileImage: PublicImage | null;
  priority: boolean;
  className?: string;
}) {
  const shared = {
    alt: image.alt,
    fill: true,
    fetchPriority: priority ? ("high" as const) : ("low" as const),
    draggable: false,
    className,
  };
  const phoneImage =
    mobileImage ??
    (image.width / image.height > portraitCrop.ratio
      ? {
          ...image,
          src: portraitCropSrc(image.src),
          ...portraitCropSize(image.width, image.height),
        }
      : null);
  if (!phoneImage) {
    return (
      <Image
        {...shared}
        alt={image.alt}
        src={image.src}
        priority={priority}
        sizes={heroSizes(image)}
        {...blurPlaceholder(image)}
      />
    );
  }
  const loading = priority ? ("eager" as const) : undefined;
  const { props: desktop } = getImageProps({
    ...shared,
    src: image.src,
    loading,
    sizes: heroSizes(image),
    ...blurPlaceholder(image),
  });
  const { props: mobile } = getImageProps({
    ...shared,
    src: phoneImage.src,
    loading,
    sizes: phoneSizes(phoneImage).join(", "),
  });
  if (priority) {
    preload(mobile.src, {
      as: "image",
      imageSrcSet: mobile.srcSet,
      imageSizes: mobile.sizes,
      media: phone,
      fetchPriority: "high",
    });
    preload(desktop.src, {
      as: "image",
      imageSrcSet: desktop.srcSet,
      imageSizes: desktop.sizes,
      media: "(min-width: 640px)",
      fetchPriority: "high",
    });
  }
  return (
    <picture>
      <source media={phone} srcSet={mobile.srcSet} sizes={mobile.sizes} />
      <img {...desktop} alt={image.alt} />
    </picture>
  );
}
