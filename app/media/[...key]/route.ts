import sharp from "sharp";

import { readMediaObject } from "@/lib/media";
import { portraitCrop, portraitCropSize } from "@/lib/media-crop";

const cacheControl = "public, max-age=86400, stale-while-revalidate=604800";

const immutableCacheControl = "public, max-age=31536000, immutable";

const immutablePrefixes = ["film/"];

const croppable = new Set(["image/jpeg", "image/png", "image/webp"]);

async function cropToPortrait(body: ReadableStream): Promise<Uint8Array<ArrayBuffer> | null> {
  const source = sharp(Buffer.from(await new Response(body).arrayBuffer())).rotate();
  const metadata = await source.metadata();
  const { width, height } = metadata.autoOrient ?? metadata;
  if (!width || !height) return null;
  const size = portraitCropSize(width, height);
  const cropped = await source
    .extract({ left: Math.floor((width - size.width) / 2), top: 0, ...size })
    .toBuffer();
  return new Uint8Array(cropped);
}

export async function GET(request: Request, { params }: RouteContext<"/media/[...key]">) {
  const { key } = await params;
  if (!key.length || key.some((part) => part === ".." || part === ".")) {
    return new Response(null, { status: 404 });
  }

  const crop = new URL(request.url).search === `?${portraitCrop.query}`;
  const range = request.headers.get("range");
  const object = await readMediaObject(
    key.join("/"),
    crop ? null : request.headers.get("if-none-match"),
    !crop && range && /^bytes=\d*-\d*$/.test(range) ? range : null,
  );
  if (object.status === "missing") return new Response(null, { status: 404 });
  if (object.status === "unsatisfiable") return new Response(null, { status: 416 });

  const immutable = immutablePrefixes.some((prefix) => key.join("/").startsWith(prefix));
  const headers = new Headers({
    "Cache-Control": immutable ? immutableCacheControl : cacheControl,
    "Accept-Ranges": "bytes",
  });
  if (object.etag) headers.set("ETag", object.etag);
  if (object.status === "not-modified") return new Response(null, { status: 304, headers });

  headers.set("Content-Type", object.type);
  headers.set("X-Content-Type-Options", "nosniff");

  if (crop) {
    const cropped = croppable.has(object.type) ? await cropToPortrait(object.body) : null;
    if (!cropped) return new Response(null, { status: 404 });
    headers.delete("ETag");
    headers.delete("Accept-Ranges");
    headers.set("Content-Length", String(cropped.byteLength));
    return new Response(cropped, { status: 200, headers });
  }

  if (object.length !== undefined) headers.set("Content-Length", String(object.length));
  if (object.range) headers.set("Content-Range", object.range);
  return new Response(object.body, { status: object.range ? 206 : 200, headers });
}
