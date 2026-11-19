import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { readMediaObject } from "@/lib/media";

import { ogImageSize } from "./config";
import type { OgCard } from "./og-card";

const colors = { navy: "#001941", cyan: "#00b9ff", mist: "#f3f6fc", white: "#ffffff" } as const;

const fontFiles = [
  { name: "Inter", file: "inter-latin-700.ttf", weight: 700 },
  { name: "InterCyrillic", file: "inter-cyrillic-700.ttf", weight: 700 },
  { name: "Inter", file: "inter-latin-500.ttf", weight: 500 },
  { name: "InterCyrillic", file: "inter-cyrillic-500.ttf", weight: 500 },
] as const;

type Font = { name: string; data: Buffer; weight: 500 | 700; style: "normal" };

let fonts: Promise<Font[]> | undefined;

function loadFonts(): Promise<Font[]> {
  fonts ??= Promise.all(
    fontFiles.map(async ({ name, file, weight }) => ({
      name,
      data: await readFile(join(process.cwd(), "assets", "fonts", "og", file)),
      weight,
      style: "normal" as const,
    })),
  );
  return fonts;
}

const photoBox = { width: 480, height: 630 } as const;

const photoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const photoMaxBytes = 4 * 1024 * 1024;

async function loadPhoto(key: string | null): Promise<string | null> {
  if (!key) return null;
  try {
    const object = await readMediaObject(key, null);
    if (object.status !== "found") return null;
    if (!photoTypes.has(object.type) || (object.length ?? 0) > photoMaxBytes) return null;
    const bytes = Buffer.from(await new Response(object.body).arrayBuffer());
    return `data:${object.type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

export function titleSize(title: string): number {
  if (title.length <= 28) return 76;
  if (title.length <= 48) return 64;
  if (title.length <= 72) return 54;
  return 46;
}

export async function renderOgImage(card: OgCard, host: string): Promise<ImageResponse> {
  const [loaded, photo] = await Promise.all([loadFonts(), loadPhoto(card.imageKey)]);
  const textWidth = photo ? 720 : 1200;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: ogImageSize.width,
        height: ogImageSize.height,
        background: colors.navy,
        fontFamily: "Inter, InterCyrillic",
        color: colors.white,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: textWidth,
          height: ogImageSize.height,
          padding: 64,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 36, fontWeight: 700, letterSpacing: 4 }}>
            CEWM
          </div>
          <div
            style={{
              display: "flex",
              width: 64,
              height: 6,
              marginTop: 14,
              background: colors.cyan,
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {card.eyebrow ? (
            <div style={{ display: "flex", fontSize: 24, fontWeight: 500, color: colors.cyan }}>
              {card.eyebrow}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              marginTop: 18,
              fontSize: titleSize(card.title),
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: -1.5,
            }}
          >
            {card.title}
          </div>
          {card.subtitle ? (
            <div
              style={{
                display: "flex",
                marginTop: 22,
                fontSize: 26,
                fontWeight: 500,
                lineHeight: 1.35,
                color: "rgba(255,255,255,0.78)",
              }}
            >
              {card.subtitle}
            </div>
          ) : null}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 24,
            fontWeight: 500,
            color: "rgba(255,255,255,0.78)",
          }}
        >
          {host}
        </div>
      </div>
      {photo ? (
        <div
          style={{
            display: "flex",
            width: photoBox.width,
            height: photoBox.height,
            background: colors.mist,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            width={photoBox.width}
            height={photoBox.height}
            alt=""
            style={{ objectFit: "contain" }}
          />
        </div>
      ) : null}
    </div>,
    {
      ...ogImageSize,
      fonts: loaded,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      },
    },
  );
}
