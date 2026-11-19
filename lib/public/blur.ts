type Blurrable = { blurDataURL?: string | null };

type ImageDataUrl = `data:image/${string}`;

function isImageDataUrl(value: string): value is ImageDataUrl {
  return value.startsWith("data:image/");
}

export function blurPlaceholder(image: Blurrable): { placeholder: ImageDataUrl | "empty" } {
  const preview = image.blurDataURL;
  return { placeholder: preview && isImageDataUrl(preview) ? preview : "empty" };
}
