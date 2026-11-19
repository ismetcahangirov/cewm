import { getImageProps } from "next/image";

import type { PreviewImage } from "./row-preview";

export function previewImage(
  image: { src: string; width: number; height: number } | null | undefined,
): PreviewImage | null {
  if (!image) return null;
  const { src, srcSet, sizes, width, height } = getImageProps({
    src: image.src,
    width: image.width,
    height: image.height,
    alt: "",
    sizes: "640px",
  }).props;
  return {
    src,
    srcSet,
    sizes,
    width: Number(width ?? image.width),
    height: Number(height ?? image.height),
  };
}
