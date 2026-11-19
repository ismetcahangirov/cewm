export const portraitCrop = { query: "crop=portrait", ratio: 3 / 4 } as const;

export function portraitCropSize(width: number, height: number): { width: number; height: number } {
  if (width / height <= portraitCrop.ratio) return { width, height };
  return { width: Math.round(height * portraitCrop.ratio), height };
}

export function portraitCropSrc(src: string): string {
  return `${src}?${portraitCrop.query}`;
}
