import { randomUUID } from "node:crypto";

import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { GET } from "@/app/media/[...key]/route";
import { deleteMediaObject, presignUpload } from "@/lib/media";
import { portraitCropSize, portraitCropSrc } from "@/lib/media-crop";

const run = randomUUID().slice(0, 8);
const keys = { wide: `tests/${run}/wide.jpg`, tall: `tests/${run}/tall.jpg` };

async function upload(key: string, width: number, height: number): Promise<void> {
  const body = await sharp({
    create: { width, height, channels: 3, background: { r: 120, g: 110, b: 100 } },
  })
    .jpeg()
    .toBuffer();
  const url = await presignUpload(key, "image/jpeg", body.length);
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg", "Content-Length": String(body.length) },
    body: new Uint8Array(body),
  });
  expect(response.status).toBe(200);
}

async function get(key: string, search = ""): Promise<Response> {
  return GET(new Request(`http://localhost/media/${key}${search}`), {
    params: Promise.resolve({ key: key.split("/") }),
  });
}

async function size(response: Response): Promise<{ width?: number; height?: number }> {
  return sharp(Buffer.from(await response.arrayBuffer())).metadata();
}

beforeAll(async () => {
  await upload(keys.wide, 1600, 900);
  await upload(keys.tall, 600, 900);
});

afterAll(async () => {
  await Promise.all(Object.values(keys).map((key) => deleteMediaObject(key)));
});

describe("portrait crop", () => {
  it("keeps the full height and cuts a centred 3:4 slice from wide images", () => {
    expect(portraitCropSize(1600, 900)).toEqual({ width: 675, height: 900 });
    expect(portraitCropSize(600, 900)).toEqual({ width: 600, height: 900 });
    expect(portraitCropSrc("/media/a.jpg")).toBe("/media/a.jpg?crop=portrait");
  });

  it("serves the crop from the media route and the original otherwise", async () => {
    const cropped = await get(keys.wide, "?crop=portrait");
    expect(cropped.status).toBe(200);
    expect(cropped.headers.get("content-type")).toBe("image/jpeg");
    expect(await size(cropped)).toMatchObject({ width: 675, height: 900 });

    expect(await size(await get(keys.wide))).toMatchObject({ width: 1600, height: 900 });
    expect(await size(await get(keys.wide, "?crop=square"))).toMatchObject({ width: 1600 });
    expect(await size(await get(keys.tall, "?crop=portrait"))).toMatchObject({ width: 600 });
  });

  it("answers 404 for a missing object", async () => {
    expect((await get(`tests/${run}/missing.jpg`, "?crop=portrait")).status).toBe(404);
  });
});
